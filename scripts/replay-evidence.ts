import 'reflect-metadata';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BASE_COMMIT } from './base-provenance';
import { RulesRegistryService } from '../src/rules/rules-registry.service';
import {
  canonicalJson,
  digest,
  ReplayService,
} from '../src/replay/replay.service';

const service = new ReplayService(new RulesRegistryService());
const suite = service.suite();
const repeats = 100;
const reference = canonicalJson(suite);
for (let index = 0; index < repeats; index++) {
  if (canonicalJson(service.suite()) !== reference)
    throw new Error(`Replay mismatch on repeat ${index + 1}`);
}
const sourceFiles = [
  'src/rules/rule.types.ts',
  'src/rules/rules-registry.service.ts',
  'src/replay/replay-fixtures.ts',
  'src/replay/replay.service.ts',
];
const sourceDigests = Object.fromEntries(
  sourceFiles.map((file) => [
    file,
    createHash('sha256').update(readFileSync(file)).digest('hex'),
  ]),
);
mkdirSync('artifacts', { recursive: true });
writeFileSync(
  'artifacts/replay-suite.json',
  JSON.stringify(suite, null, 2) + '\n',
);
writeFileSync(
  'artifacts/seeded-regression.json',
  JSON.stringify(
    service.run('traffic-three', 'sparse-v2-seeded-regression'),
    null,
    2,
  ) + '\n',
);
const evidence = {
  dataOrigin: 'synthetic',
  baseCommit: BASE_COMMIT,
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  command: 'npm run replay:evidence',
  summary: suite.summary,
  deterministicRepeats: repeats,
  suiteDigest: digest(suite),
  sourceDigests,
  limitation:
    'Hand-authored synthetic contract checks and one deliberately injected policy regression. Not field evidence or predictive accuracy.',
};
writeFileSync(
  'artifacts/replay-evidence.json',
  JSON.stringify(evidence, null, 2) + '\n',
);
console.log(JSON.stringify(evidence, null, 2));
