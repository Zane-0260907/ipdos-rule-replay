import {
  MenuAdjustmentRulePayload,
  SalesForecastRulePayload,
  TrafficForecastRulePayload,
} from '../rules/rules-registry.service';
import {
  DEFAULT_FORECAST_RULE_POLICY,
  ForecastRulePolicy,
} from '../rules/rule.types';

type Serialized<T> = Omit<T, 'evaluationTime' | 'generatedAt'> & {
  evaluationTime: string;
  generatedAt?: string;
};

export type ReplaySnapshot =
  | { domain: 'sales'; payload: Serialized<SalesForecastRulePayload> }
  | { domain: 'traffic'; payload: Serialized<TrafficForecastRulePayload> }
  | { domain: 'menu'; payload: Serialized<MenuAdjustmentRulePayload> };

export interface ReplayScenario {
  id: string;
  title: string;
  rationale: string;
  dataOrigin: 'synthetic';
  snapshot: ReplaySnapshot;
  expectedRuleIds: string[];
}

export interface ReplayPolicy {
  id: string;
  description: string;
  parameters: Readonly<ForecastRulePolicy>;
}

// Frozen timestamps: neither fixture construction nor evaluation reads the clock.
const context = {
  storeId: 'SYNTHETIC-001',
  evaluationTime: '2026-10-21T12:00:00.000Z',
};
const forecast = { ...context, targetDate: '2026-10-22', horizon: 'NEXT_DAY' };
const traffic = (
  count: number,
  generatedAt = '2026-10-21T08:00:00.000Z',
): ReplaySnapshot => ({
  domain: 'traffic',
  payload: {
    ...forecast,
    generatedAt,
    points: Array.from({ length: count }, (_, index) => ({
      time: `${String(9 + index).padStart(2, '0')}:00`,
      customers: 100,
    })),
  },
});
const sales = (
  shortage: number,
  generatedAt = '2026-10-21T08:00:00.000Z',
): ReplaySnapshot => ({
  domain: 'sales',
  payload: {
    ...forecast,
    generatedAt,
    summary: {
      totalDemand: 100,
      expectedShortage: shortage,
      criticalCount: shortage > 0 ? 1 : 0,
      itemCount: 5,
    },
    items: Array.from({ length: 5 }, (_, index) => ({
      sku: `SYNTH-${index}`,
      status: index === 0 && shortage > 0 ? 'critical' : 'healthy',
      restockRecommendation: index === 0 ? shortage : 0,
    })),
  },
});
const menu = (conflict: boolean): ReplaySnapshot => ({
  domain: 'menu',
  payload: {
    ...context,
    promote: [{ ingredient: 'synthetic-tofu', restock: conflict ? 5 : 0 }],
    review: [],
    suppress: conflict ? [{ ingredient: 'synthetic-tofu' }] : [],
    scoredItems: Array.from({ length: 5 }, (_, index) => ({
      ingredient: `synthetic-item-${index}`,
      demand: 20,
      stock: 40,
      score: 0.5,
    })),
  },
});
const scenario = (
  id: string,
  title: string,
  rationale: string,
  snapshot: ReplaySnapshot,
  expectedRuleIds: string[],
): ReplayScenario => ({
  id,
  title,
  rationale,
  dataOrigin: 'synthetic',
  snapshot,
  expectedRuleIds,
});

// These explicit oracles are authored from the rule contracts, not computed
// from actual outputs. The suite is a small demonstrator, not a field dataset.
export const REPLAY_SCENARIOS: readonly ReplayScenario[] = deepFreeze([
  scenario(
    'traffic-eight',
    'Eight traffic points',
    'Exactly eight points satisfy the existing minimum.',
    traffic(8),
    [],
  ),
  scenario(
    'traffic-three',
    'Three-point warning regression',
    'Three points must retain the low-resolution warning. Candidate v2 deliberately weakens this guard.',
    traffic(3),
    ['predictions.traffic.low-resolution'],
  ),
  scenario(
    'traffic-age-12',
    'Traffic age boundary: 12 h',
    'The existing stale rule uses >12 hours, so equality is clear.',
    traffic(8, '2026-10-21T00:00:00.000Z'),
    [],
  ),
  scenario(
    'traffic-age-13',
    'Traffic stale: 13 h',
    'One hour beyond the accepted freshness window triggers a warning.',
    traffic(8, '2026-10-20T23:00:00.000Z'),
    ['predictions.traffic.snapshot-staleness'],
  ),
  scenario(
    'sales-clean',
    'Sales with no shortage',
    'Fresh synthetic snapshot, no critical SKUs, no expected gap.',
    sales(0),
    [],
  ),
  scenario(
    'sales-gap-15',
    'Shortage boundary: 15 units',
    'Gap equals max(10,100*0.15); only critical density (1/5) triggers.',
    sales(15),
    ['predictions.sales.critical-density'],
  ),
  scenario(
    'sales-gap-16',
    'Shortage above threshold',
    'Sixteen units exceed the fifteen-unit threshold; density also triggers.',
    sales(16),
    [
      'predictions.sales.shortage-escalation',
      'predictions.sales.critical-density',
    ],
  ),
  scenario(
    'sales-age-25',
    'Sales stale: 25 h',
    'Freshness exceeds 24 hours, independently of shortage.',
    sales(0, '2026-10-20T11:00:00.000Z'),
    ['predictions.sales.snapshot-staleness'],
  ),
  scenario(
    'menu-clean',
    'Consistent menu guidance',
    'Five scored items; no restock or contradictory recommendation.',
    menu(false),
    [],
  ),
  scenario(
    'menu-conflict',
    'Conflicting menu guidance',
    'The same synthetic ingredient is promoted and suppressed, with positive restock.',
    menu(true),
    ['predictions.menu.restock-alert', 'predictions.menu.conflicting-signals'],
  ),
]);

export const REPLAY_POLICIES: readonly ReplayPolicy[] = deepFreeze([
  {
    id: 'registry-v1',
    description: 'Existing registry defaults; reference policy.',
    parameters: { ...DEFAULT_FORECAST_RULE_POLICY },
  },
  {
    id: 'sparse-v2-seeded-regression',
    description:
      'Deliberately injected regression: minimum traffic points 8 → 3. Not a historical incident.',
    parameters: { ...DEFAULT_FORECAST_RULE_POLICY, minTrafficPoints: 3 },
  },
]);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry: unknown) => deepFreeze(entry));
    Object.freeze(value);
  }
  return value;
}
