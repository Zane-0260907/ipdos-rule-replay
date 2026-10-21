import { RulesRegistryService } from '../rules/rules-registry.service';
import { DEFAULT_FORECAST_RULE_POLICY } from '../rules/rule.types';
import { REPLAY_SCENARIOS } from './replay-fixtures';
import { canonicalJson, digest, ReplayService } from './replay.service';

describe('synthetic rule replay', () => {
  const registry = new RulesRegistryService();
  const service = new ReplayService(registry);

  it.each(REPLAY_SCENARIOS)(
    'satisfies explicit baseline oracle: $id',
    (scenario) => {
      expect(service.run(scenario.id, 'registry-v1').assertion).toEqual({
        expectedRuleIds: [...scenario.expectedRuleIds].sort(),
        missing: [],
        unexpected: [],
        passed: true,
      });
    },
  );

  it('captures the deliberately injected 8→3 point threshold regression', () => {
    const comparison = service.compare(
      'traffic-three',
      'registry-v1',
      'sparse-v2-seeded-regression',
    );
    expect(comparison.delta).toEqual({
      parameterChanges: [
        { parameter: 'minTrafficPoints', baseline: 8, candidate: 3 },
      ],
      added: [],
      removed: ['predictions.traffic.low-resolution'],
      changed: [],
      changedOutcome: true,
    });
    expect(comparison.baseline.assertion.passed).toBe(true);
    expect(comparison.candidate.assertion.passed).toBe(false);
    expect(comparison.candidate.assertion.missing).toEqual([
      'predictions.traffic.low-resolution',
    ]);
  });

  it('isolates the changed scenario and evaluates clear rules as well as hits', () => {
    expect(service.suite().summary).toEqual({
      scenarios: 10,
      baselinePassed: 10,
      candidatePassed: 9,
      changedScenarios: 1,
      ruleEvaluationsPerPolicy: 30,
    });
  });

  it('is byte-identical across clocks, repeated executions and scenario order', () => {
    const before = canonicalJson(service.suite());
    jest.useFakeTimers().setSystemTime(new Date('2040-01-01T00:00:00Z'));
    try {
      [...REPLAY_SCENARIOS]
        .reverse()
        .forEach((entry) =>
          service.run(entry.id, 'sparse-v2-seeded-regression'),
        );
      expect(canonicalJson(service.suite())).toBe(before);
    } finally {
      jest.useRealTimers();
    }
  });

  it('binds content identity to snapshot and full policy, independently of object key order', () => {
    expect(digest({ b: 2, a: 1 })).toBe(digest({ a: 1, b: 2 }));
    const c = service.compare(
      'traffic-three',
      'registry-v1',
      'sparse-v2-seeded-regression',
    );
    expect(c.baseline.snapshotDigest).toBe(c.candidate.snapshotDigest);
    expect(c.baseline.policyDigest).not.toBe(c.candidate.policyDigest);
    expect(c.baseline.contentDigest).not.toBe(c.candidate.contentDigest);
  });

  it('replays a serialized export and rejects altered content', () => {
    const bundle = JSON.parse(
      JSON.stringify(
        service.run('traffic-three', 'sparse-v2-seeded-regression'),
      ),
    ) as ReturnType<ReplayService['run']>;
    expect(service.verifyExport(bundle)).toMatchObject({
      verified: true,
      assertionPassed: false,
    });
    bundle.trace[0].outcome = 'triggered';
    expect(() => service.verifyExport(bundle)).toThrow('Bundle differs');
  });

  it('rejects unknown catalog identifiers and malformed exports', () => {
    expect(() => service.run('unknown', 'registry-v1')).toThrow(
      'Unknown scenario',
    );
    expect(() => service.run('traffic-three', 'unknown')).toThrow(
      'Unknown policy',
    );
    expect(() => service.verifyExport(null)).toThrow('Invalid replay bundle');
  });

  it('re-executes the production registry when verifying an export', () => {
    const bundle = service.run('traffic-three', 'registry-v1');
    const evaluator = jest.spyOn(registry, 'traceTrafficForecast');
    try {
      // A changed evaluator must invalidate an otherwise untouched export.
      evaluator.mockReturnValue([]);
      expect(() => service.verifyExport(bundle)).toThrow('Bundle differs');
      expect(evaluator).toHaveBeenCalledTimes(1);
    } finally {
      evaluator.mockRestore();
    }
  });

  it.each(['clock', 'policy-parameter', 'policy-version', 'hit-detail'])(
    'rejects an altered %s in an exported bundle',
    (field) => {
      const bundle = JSON.parse(
        JSON.stringify(service.run('traffic-three', 'registry-v1')),
      ) as ReturnType<ReplayService['run']>;
      if (field === 'clock')
        bundle.scenario.snapshot.payload.evaluationTime =
          '2040-01-01T00:00:00.000Z';
      if (field === 'policy-parameter')
        bundle.policy.parameters = {
          ...bundle.policy.parameters,
          minTrafficPoints: 3,
        };
      if (field === 'policy-version')
        bundle.policy.id = 'sparse-v2-seeded-regression';
      if (field === 'hit-detail') bundle.trace[0].hit!.severity = 'low';
      expect(() => service.verifyExport(bundle)).toThrow('Bundle differs');
    },
  );

  it('retains the original API defaults when no replay policy is provided', () => {
    const scenario = service.run('traffic-three', 'registry-v1').scenario;
    if (scenario.snapshot.domain !== 'traffic')
      throw new Error('Wrong fixture domain');
    const payload = {
      ...scenario.snapshot.payload,
      evaluationTime: new Date(scenario.snapshot.payload.evaluationTime),
      generatedAt: new Date(scenario.snapshot.payload.generatedAt!),
    };
    expect(registry.evaluateTrafficForecast(payload)).toEqual(
      registry
        .traceTrafficForecast(payload, DEFAULT_FORECAST_RULE_POLICY)
        .flatMap((entry) => (entry.hit ? [entry.hit] : [])),
    );
    expect(Object.isFrozen(REPLAY_SCENARIOS[0].snapshot.payload)).toBe(true);
  });
});
