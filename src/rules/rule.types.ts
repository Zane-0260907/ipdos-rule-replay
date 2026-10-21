export type RuleDomain =
  | 'marketing'
  | 'cost'
  | 'inventory'
  | 'decisions'
  | 'predictions';

export type RuleSeverity = 'low' | 'medium' | 'high';

export interface RuleEvaluationContext {
  storeId: string;
  evaluationTime: Date;
  policy?: ForecastRulePolicy;
}

// Baseline values preserve the existing registry behavior. Only replay selects
// alternative immutable profiles; normal API callers continue to use defaults.
export interface ForecastRulePolicy {
  salesMaxAgeHours: number;
  trafficMaxAgeHours: number;
  minTrafficPoints: number;
  shortageRatio: number;
  shortageFloor: number;
}

export const DEFAULT_FORECAST_RULE_POLICY: Readonly<ForecastRulePolicy> =
  Object.freeze({
    salesMaxAgeHours: 24,
    trafficMaxAgeHours: 12,
    minTrafficPoints: 8,
    shortageRatio: 0.15,
    shortageFloor: 10,
  });

export interface RuleTrace {
  ruleId: string;
  outcome: 'triggered' | 'clear';
  hit: RuleHit | null;
}

export interface RuleHit<TDetail = Record<string, unknown>> {
  id: string;
  domain: RuleDomain;
  severity: RuleSeverity;
  summary: string;
  detail: TDetail;
  tags: string[];
  evaluatedAt: string;
  storeId: string;
  recommendations?: string[];
}

export interface RuleDefinition<TPayload, TDetail = Record<string, unknown>> {
  id: string;
  name: string;
  description: string;
  domain: RuleDomain;
  severity: RuleSeverity;
  tags: string[];
  evaluate(
    payload: TPayload,
    context: RuleEvaluationContext,
  ): RuleHit<TDetail> | null;
}
