import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RulesRegistryService } from '../rules/rules-registry.service';
import { RuleTrace } from '../rules/rule.types';
import {
  REPLAY_POLICIES,
  REPLAY_SCENARIOS,
  ReplayPolicy,
  ReplayScenario,
} from './replay-fixtures';

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function digest(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

@Injectable()
export class ReplayService {
  constructor(private readonly registry: RulesRegistryService) {}

  catalog() {
    return {
      dataOrigin: 'synthetic',
      scenarios: REPLAY_SCENARIOS,
      policies: REPLAY_POLICIES,
    };
  }

  run(scenarioId: string, policyId: string) {
    const scenario = REPLAY_SCENARIOS.find((entry) => entry.id === scenarioId);
    const policy = REPLAY_POLICIES.find((entry) => entry.id === policyId);
    if (!scenario)
      throw new NotFoundException(`Unknown scenario: ${scenarioId}`);
    if (!policy) throw new NotFoundException(`Unknown policy: ${policyId}`);
    return this.evaluate(scenario, policy);
  }

  private evaluate(scenario: ReplayScenario, policy: ReplayPolicy) {
    const { snapshot } = scenario;
    const evaluationTime = new Date(snapshot.payload.evaluationTime);
    let trace: RuleTrace[];
    switch (snapshot.domain) {
      case 'sales':
        trace = this.registry.traceSalesForecast(
          {
            ...snapshot.payload,
            evaluationTime,
            generatedAt: new Date(snapshot.payload.generatedAt!),
          },
          policy.parameters,
        );
        break;
      case 'traffic':
        trace = this.registry.traceTrafficForecast(
          {
            ...snapshot.payload,
            evaluationTime,
            generatedAt: new Date(snapshot.payload.generatedAt!),
          },
          policy.parameters,
        );
        break;
      case 'menu':
        trace = this.registry.traceMenuAdjustments(
          { ...snapshot.payload, evaluationTime },
          policy.parameters,
        );
        break;
    }
    const actualRuleIds = trace
      .filter((entry) => entry.outcome === 'triggered')
      .map((entry) => entry.ruleId)
      .sort();
    const expectedRuleIds = [...scenario.expectedRuleIds].sort();
    const missing = expectedRuleIds.filter((id) => !actualRuleIds.includes(id));
    const unexpected = actualRuleIds.filter(
      (id) => !expectedRuleIds.includes(id),
    );
    const result = {
      schemaVersion: 'ipdos-rule-replay/v1',
      engineVersion: 'registry-replay/1',
      dataOrigin: 'synthetic',
      scenario,
      policy,
      snapshotDigest: digest(snapshot),
      policyDigest: digest(policy),
      trace,
      actualRuleIds,
      assertion: {
        expectedRuleIds,
        missing,
        unexpected,
        passed: missing.length === 0 && unexpected.length === 0,
      },
    };
    return { ...result, contentDigest: digest(result) };
  }

  compare(scenarioId: string, baselineId: string, candidateId: string) {
    const baseline = this.run(scenarioId, baselineId);
    const candidate = this.run(scenarioId, candidateId);
    const added = candidate.actualRuleIds.filter(
      (id) => !baseline.actualRuleIds.includes(id),
    );
    const removed = baseline.actualRuleIds.filter(
      (id) => !candidate.actualRuleIds.includes(id),
    );
    const changed = candidate.trace
      .filter((entry) => {
        const prior = baseline.trace.find(
          (item) => item.ruleId === entry.ruleId,
        );
        return (
          entry.hit && prior?.hit && digest(entry.hit) !== digest(prior.hit)
        );
      })
      .map((entry) => entry.ruleId);
    const keys = Object.keys(baseline.policy.parameters) as Array<
      keyof ReplayPolicy['parameters']
    >;
    const parameterChanges = keys
      .filter(
        (key) =>
          baseline.policy.parameters[key] !== candidate.policy.parameters[key],
      )
      .map((key) => ({
        parameter: key,
        baseline: baseline.policy.parameters[key],
        candidate: candidate.policy.parameters[key],
      }));
    return {
      baseline,
      candidate,
      delta: {
        parameterChanges,
        added,
        removed,
        changed,
        changedOutcome: added.length + removed.length + changed.length > 0,
      },
    };
  }

  suite(
    baselineId = 'registry-v1',
    candidateId = 'sparse-v2-seeded-regression',
  ) {
    const comparisons = REPLAY_SCENARIOS.map((entry) =>
      this.compare(entry.id, baselineId, candidateId),
    );
    return {
      schemaVersion: 'ipdos-rule-suite/v1',
      dataOrigin: 'synthetic',
      summary: {
        scenarios: comparisons.length,
        baselinePassed: comparisons.filter(
          (entry) => entry.baseline.assertion.passed,
        ).length,
        candidatePassed: comparisons.filter(
          (entry) => entry.candidate.assertion.passed,
        ).length,
        changedScenarios: comparisons.filter(
          (entry) => entry.delta.changedOutcome,
        ).length,
        ruleEvaluationsPerPolicy: comparisons.reduce(
          (sum, entry) => sum + entry.baseline.trace.length,
          0,
        ),
      },
      comparisons,
    };
  }

  // Portable export verification is deliberately limited to this version's
  // checked-in synthetic catalog; arbitrary business-data imports are not supported.
  verifyExport(bundle: unknown) {
    const candidate = bundle as {
      scenario?: { id?: string };
      policy?: { id?: string };
    } | null;
    if (!candidate?.scenario?.id || !candidate.policy?.id)
      throw new Error('Invalid replay bundle');
    const replayed = this.run(candidate.scenario.id, candidate.policy.id);
    if (canonicalJson(bundle) !== canonicalJson(replayed))
      throw new Error(
        'Bundle differs from deterministic replay (tampering or version mismatch)',
      );
    return {
      verified: true,
      contentDigest: replayed.contentDigest,
      assertionPassed: replayed.assertion.passed,
    };
  }
}
