import 'reflect-metadata';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { RulesRegistryService } from '../src/rules/rules-registry.service';
import { REPLAY_SCENARIOS } from '../src/replay/replay-fixtures';
import { canonicalJson } from '../src/replay/replay.service';
import { BASE_COMMIT, readBaselineRegistry } from './base-provenance';

// Load the actual unchanged source from the inspected public base commit.
const source = readBaselineRegistry();
const compiled = transpileModule(source, {
  compilerOptions: {
    module: ModuleKind.CommonJS,
    target: ScriptTarget.ES2022,
    experimentalDecorators: true,
  },
}).outputText;
const exported: { RulesRegistryService?: typeof RulesRegistryService } = {};
runInNewContext(compiled, {
  exports: exported,
  require: createRequire(__filename),
  Date,
});
const previous = new exported.RulesRegistryService!();
const current = new RulesRegistryService();
for (const scenario of REPLAY_SCENARIOS) {
  const { snapshot } = scenario;
  const payload = {
    ...snapshot.payload,
    evaluationTime: new Date(snapshot.payload.evaluationTime),
    generatedAt: snapshot.payload.generatedAt
      ? new Date(snapshot.payload.generatedAt)
      : undefined,
  };
  const method =
    snapshot.domain === 'traffic'
      ? 'evaluateTrafficForecast'
      : snapshot.domain === 'sales'
        ? 'evaluateSalesForecast'
        : 'evaluateMenuAdjustments';
  // Each method's payload is selected by the tagged fixture domain above.
  const invoke = (registry: RulesRegistryService) =>
    (registry[method] as (p: unknown) => unknown).call(registry, payload);
  if (canonicalJson(invoke(previous)) !== canonicalJson(invoke(current)))
    throw new Error(`Default behavior changed: ${scenario.id}`);
}
console.log(
  JSON.stringify({
    baseCommit: BASE_COMMIT,
    comparedScenarios: REPLAY_SCENARIOS.length,
    identicalDefaults: true,
  }),
);
