import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const POLICY = Object.freeze({
  version: 'procurement-v1',
  implementation: {
    calculationSha256: createHash('sha256').update(readFileSync(__filename)).digest('hex'),
    registrySha256: createHash('sha256').update(readFileSync(require.resolve('../rules/rules-registry.service'))).digest('hex'),
  },
  safetyMultiplier: 1.1,
  maximumQuantity: 10000,
  decimalPlaces: 2,
  explanation: 'Target stock = demand × 1.10; suggested purchase = max(0, target stock − available stock). Human-reviewed quantities may differ.',
});

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => JSON.stringify(key) + ':' + canonical(item)).join(',') + '}';
  }
  return JSON.stringify(value);
}

export const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export const RULE_HASH = digest(POLICY);
export const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export type InventoryItem = { sku: string; ingredient: string; unit: string; currentStock: number; reorderPoint: number; safetyStock: number };
export type Forecast = { id: string; version: string; storeId: string; targetDate: string; generatedAt: string; synthetic: true; items: { sku: string; demand: number }[]; traffic: { time: string; customers: number }[] };
export type Source = { revision: number; forecast: Forecast; inventory: InventoryItem[] };
export type PlanItem = InventoryItem & { demand: number; targetStock: number; shortage: number; recommendedAmount: number; quantity: number; reason: string };
export type Plan = { id: string; contentHash: string; inputVersion: string; ruleVersion: string; ruleHash: string; synthetic: true; status: 'preview'; createdAt: string; source: Source; policy: typeof POLICY; items: PlanItem[]; rules: unknown[] };
export type Review = { id: string; planId: string; contentHash: string; actorId: string; reviewedAt: string };
export type Receipt = { schema: 'ipdos.simulated-order/v1'; synthetic: true; execution: 'SIMULATED_ONLY_NO_SUPPLIER'; id: string; receiptId: string; confirmedAt: string; confirmedBy: string; plan: Plan; review: Review };

export function syntheticSource(): Source {
  return {
    revision: 1,
    forecast: {
      id: 'SYNTHETIC-SNAPSHOT-001', version: 'synthetic-fixture-v1', storeId: 'SYNTHETIC-STORE-001',
      targetDate: '2026-10-22', generatedAt: '2026-10-21T08:00:00.000Z', synthetic: true,
      items: [{ sku: 'SYN-RICE', demand: 50 }, { sku: 'SYN-CHICKEN', demand: 30 }, { sku: 'SYN-GREENS', demand: 20 }],
      traffic: [{ time: '08:00', customers: 30 }, { time: '12:00', customers: 90 }, { time: '18:00', customers: 70 }],
    },
    inventory: [
      { sku: 'SYN-RICE', ingredient: '合成大米', unit: 'kg', currentStock: 25, reorderPoint: 30, safetyStock: 20 },
      { sku: 'SYN-CHICKEN', ingredient: '合成鸡肉', unit: 'kg', currentStock: 8, reorderPoint: 15, safetyStock: 10 },
      { sku: 'SYN-GREENS', ingredient: '合成蔬菜', unit: 'kg', currentStock: 26, reorderPoint: 10, safetyStock: 8 },
    ],
  };
}

export function inputVersion(source: Source): string {
  return `inventory-v${source.revision}:${digest(source)}`;
}

export function planItems(source: Source): PlanItem[] {
  return source.inventory.map(item => {
    const demand = source.forecast.items.find(row => row.sku === item.sku)!.demand;
    const targetStock = round(demand * POLICY.safetyMultiplier);
    const recommendedAmount = round(Math.max(0, targetStock - item.currentStock));
    return { ...item, demand, targetStock, shortage: round(Math.max(0, demand - item.currentStock)), recommendedAmount,
      quantity: recommendedAmount, reason: `${demand} × ${POLICY.safetyMultiplier} − ${item.currentStock} = ${round(targetStock - item.currentStock)}; 最低取 0（kg）` };
  });
}
