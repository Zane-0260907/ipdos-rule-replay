import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from 'docx';
import { type InventoryOverviewRulePayload, RulesRegistryService } from '../rules/rules-registry.service';
import { BusinessStore } from './store';
import { ConfirmDto, InventoryChangeDto, PreviewDto } from './dto';
import { digest, inputVersion, Plan, planItems, POLICY, Receipt, Review, round, RULE_HASH, Source } from './domain';

type Actor = { id: string; role: 'manager' | 'viewer' };
function issue(code: string, message: string) { return { code, message }; }

@Injectable()
export class BusinessService {
  private readonly sessions = new Map<string, Actor>();
  constructor(readonly store: BusinessStore, private readonly registry: RulesRegistryService) {}

  login(role: Actor['role']) {
    const token = randomUUID();
    const actor = { id: `synthetic-${role}-01`, role };
    this.sessions.set(token, actor);
    return { success: true, token, actor, synthetic: true, notice: 'Local synthetic role selection; not production authentication.' };
  }
  actor(authorization?: string, write = false): Actor {
    const actor = this.sessions.get(authorization?.replace(/^Bearer /, '') ?? '');
    if (!actor) throw new UnauthorizedException(issue('LOGIN_REQUIRED', '演示会话已失效，请重新选择演示角色。'));
    if (write && actor.role !== 'manager') throw new ForbiddenException(issue('PERMISSION_DENIED', '当前演示角色只能查看，不能确认或修改模拟库存。'));
    return actor;
  }
  source(): Source { return JSON.parse((this.store.db.prepare('SELECT body FROM source WHERE id=1').get() as { body: string }).body); }
  context() {
    const source = this.source();
    return { synthetic: true, source, inputVersion: inputVersion(source), ruleVersion: POLICY.version, ruleHash: RULE_HASH, policy: POLICY, items: planItems(source), rules: this.inventoryRules(source) };
  }
  private inventoryRules(source: Source) {
    const items: InventoryOverviewRulePayload['items'] = planItems(source).map((item) => ({ id: item.sku, sku: item.sku, currentStock: item.currentStock, reorderPoint: item.reorderPoint, safetyStock: item.safetyStock,
      status: item.currentStock <= Math.min(item.reorderPoint * .6, item.safetyStock * .8) ? 'critical' : item.currentStock <= Math.max(item.reorderPoint, item.safetyStock) ? 'low' : 'normal',
      restockAmount: item.shortage, daysCover: item.demand ? item.currentStock / item.demand : null }));
    return this.registry.evaluateInventoryOverview({ storeId: source.forecast.storeId, evaluationTime: new Date(source.forecast.generatedAt), items,
      summary: { totalSkus: items.length, criticalSkus: items.filter(x => x.status === 'critical').length, lowStockSkus: items.filter(x => x.status === 'low').length, healthySkus: items.filter(x => x.status === 'normal').length, recommendedRestockUnits: items.reduce((sum, x) => sum + (x.restockAmount ?? 0), 0) },
      forecastReference: { targetDate: source.forecast.targetDate, modelVersion: source.forecast.version } });
  }
  preview(request: PreviewDto): Plan {
    const source = this.source();
    const items = planItems(source);
    const seen = new Set<string>();
    for (const change of request.changes ?? []) {
      const item = items.find(x => x.sku === change.sku);
      if (!item || seen.has(change.sku)) throw new BadRequestException(issue('INVALID_ITEM', '未知或重复食材。'));
      seen.add(change.sku); item.quantity = change.quantity;
    }
    const binding = { source, policy: POLICY, items, rules: this.inventoryRules(source) };
    const contentHash = digest(binding);
    const plan: Plan = { id: `PLAN-${contentHash.slice(0, 24)}`, contentHash, inputVersion: inputVersion(source), ruleVersion: POLICY.version, ruleHash: RULE_HASH,
      synthetic: true, status: 'preview', createdAt: new Date().toISOString(), ...binding };
    this.store.db.prepare('INSERT OR IGNORE INTO plans(id,hash,body) VALUES(?,?,?)').run(plan.id, contentHash, JSON.stringify(plan));
    return this.plan(plan.id);
  }
  private plan(id: string): Plan {
    const row = this.store.db.prepare('SELECT body FROM plans WHERE id=?').get(id) as { body: string } | undefined;
    if (!row) throw new NotFoundException(issue('PLAN_NOT_FOUND', '补货方案不存在。'));
    return JSON.parse(row.body);
  }
  private validateCurrent(plan: Plan) {
    if (plan.ruleVersion !== POLICY.version || plan.ruleHash !== RULE_HASH) throw new ConflictException(issue('RULE_CHANGED', '采购规则已变化，请重新计算并审阅。'));
    if (plan.inputVersion !== inputVersion(this.source())) throw new ConflictException(issue('INVENTORY_CHANGED', '库存已在审阅期间变化。旧方案未生成订单；请重新计算并再次审阅。'));
    if (plan.contentHash !== digest({ source: plan.source, policy: plan.policy, items: plan.items, rules: plan.rules })) throw new ConflictException(issue('CONTENT_CHANGED', '方案内容校验失败，请重新计算。'));
  }
  review(planId: string, contentHash: string, acknowledged: boolean, actor: Actor): Review {
    if (!acknowledged) throw new BadRequestException(issue('REVIEW_REQUIRED', '请先核对并确认方案内容。'));
    const plan = this.plan(planId); this.validateCurrent(plan);
    if (plan.contentHash !== contentHash) throw new ConflictException(issue('CONTENT_CHANGED', '审阅内容与方案不一致。'));
    const review: Review = { id: `REVIEW-${randomUUID()}`, planId, contentHash, actorId: actor.id, reviewedAt: new Date().toISOString() };
    this.store.db.prepare('INSERT OR IGNORE INTO reviews(id,plan_id,actor,body) VALUES(?,?,?,?)').run(review.id, planId, actor.id, JSON.stringify(review));
    return JSON.parse((this.store.db.prepare('SELECT body FROM reviews WHERE plan_id=? AND actor=?').get(planId, actor.id) as { body: string }).body);
  }
  confirm(request: ConfirmDto, key: string | undefined, actor: Actor) {
    if (actor.role !== 'manager') throw new ForbiddenException(issue('PERMISSION_DENIED', '当前角色不能确认采购。'));
    if (!key || !/^[A-Za-z0-9_-]{8,100}$/.test(key)) throw new BadRequestException(issue('REQUEST_KEY_REQUIRED', '确认需要 8–100 位请求标识。'));
    try {
      return this.store.transaction(() => {
        const requestHash = digest(request);
        const previous = this.store.db.prepare('SELECT request_hash,order_id FROM confirmations WHERE actor=? AND request_key=?').get(actor.id, key) as { request_hash: string; order_id: string } | undefined;
        if (previous) {
          if (previous.request_hash !== requestHash) throw new ConflictException(issue('IDEMPOTENCY_CONFLICT', '相同请求标识已用于不同内容，未创建新订单。'));
          return { receipt: this.order(previous.order_id), repeated: true };
        }
        const plan = this.plan(request.planId);
        this.validateCurrent(plan);
        if (plan.contentHash !== request.contentHash) throw new ConflictException(issue('CONTENT_CHANGED', '确认内容与审阅方案不一致。'));
        const reviewRow = this.store.db.prepare('SELECT body FROM reviews WHERE id=? AND plan_id=? AND actor=?').get(request.reviewId, plan.id, actor.id) as { body: string } | undefined;
        if (!reviewRow) throw new ConflictException(issue('REVIEW_REQUIRED', '修改后或其他方案必须重新审阅。'));
        const review: Review = JSON.parse(reviewRow.body);
        if (review.contentHash !== plan.contentHash) throw new ConflictException(issue('CONTENT_CHANGED', '审阅与确认内容不一致。'));
        if (!plan.items.some(x => x.quantity > 0)) throw new BadRequestException(issue('EMPTY_ORDER', '采购数量全部为零，未生成订单。'));
        const existing = this.store.db.prepare('SELECT id FROM orders WHERE plan_id=?').get(plan.id) as { id: string } | undefined;
        if (existing) throw new ConflictException(issue('PLAN_ALREADY_CONFIRMED', `该方案已生成模拟订单 ${existing.id}，请查看已有回执。`));
        const receipt: Receipt = { schema: 'ipdos.simulated-order/v1', synthetic: true, execution: 'SIMULATED_ONLY_NO_SUPPLIER', id: `SIM-${randomUUID()}`, receiptId: `RECEIPT-${randomUUID()}`,
          confirmedAt: new Date().toISOString(), confirmedBy: actor.id, plan, review };
        this.store.db.prepare('INSERT INTO orders(id,plan_id,body) VALUES(?,?,?)').run(receipt.id, plan.id, JSON.stringify(receipt));
        this.store.db.prepare('INSERT INTO confirmations(actor,request_key,request_hash,order_id) VALUES(?,?,?,?)').run(actor.id, key, requestHash, receipt.id);
        return { receipt, repeated: false };
      });
    } catch (error) {
      if (error instanceof Error && 'getStatus' in error) throw error;
      throw new ServiceUnavailableException(issue('WRITE_FAILED', '模拟订单写入失败；未报告成功。请保留请求标识重试或检查已有订单。'));
    }
  }
  orders(): Receipt[] { return (this.store.db.prepare('SELECT body FROM orders ORDER BY rowid DESC').all() as { body: string }[]).map(row => JSON.parse(row.body)); }
  order(id: string): Receipt {
    const row = this.store.db.prepare('SELECT body FROM orders WHERE id=?').get(id) as { body: string } | undefined;
    if (!row) throw new NotFoundException(issue('ORDER_NOT_FOUND', '模拟订单不存在。'));
    return JSON.parse(row.body);
  }
  changeInventory(change: InventoryChangeDto) {
    return this.store.transaction(() => {
      const source = this.source();
      if (source.revision !== change.expectedRevision) throw new ConflictException(issue('INVENTORY_CHANGED', '库存版本已改变，请刷新后再模拟。'));
      const item = source.inventory.find(x => x.sku === change.sku);
      if (!item || item.currentStock + change.delta < 0 || change.delta === 0) throw new BadRequestException(issue('INVALID_STOCK', '库存变动无效。'));
      item.currentStock = round(item.currentStock + change.delta); source.revision++;
      this.store.db.prepare('UPDATE source SET body=? WHERE id=1').run(JSON.stringify(source));
      return this.context();
    });
  }
  async report(id: string): Promise<Buffer> {
    const order = this.order(id);
    const p = order.plan;
    const paragraphs = [new Paragraph({ text: 'IPDOS 合成模拟采购回执', heading: 'Heading1' }),
      ...['仅为合成数据与本地模拟采购；未向供应商发送、未发生实际交易。', `Order: ${order.id}`, `Receipt: ${order.receiptId}`, `Confirmed: ${order.confirmedAt}`, `Actor: ${order.confirmedBy}`,
        `Plan: ${p.id}`, `Content SHA-256: ${p.contentHash}`, `Input version: ${p.inputVersion}`, `Rule: ${p.ruleVersion}`, `Rule SHA-256: ${p.ruleHash}`,
        `Review: ${order.review.id}`, `Reviewed: ${order.review.reviewedAt}`, `Store: ${p.source.forecast.storeId}`, `Snapshot: ${p.source.forecast.id} / ${p.source.forecast.version}`,
        `Target date: ${p.source.forecast.targetDate}`, `Inventory revision: ${p.source.revision}`, p.policy.explanation].map(text => new Paragraph(text))];
    const row = (cells: string[]) => new TableRow({ children: cells.map(text => new TableCell({ children: [new Paragraph(text)] })) });
    const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [row(['食材 / SKU', '需求 kg', '确认时库存 kg', '建议采购 kg', '人工确认 kg']),
      ...p.items.map(item => row([`${item.ingredient} / ${item.sku}`, String(item.demand), String(item.currentStock), String(item.recommendedAmount), String(item.quantity)]))] });
    return Packer.toBuffer(new Document({ sections: [{ children: [...paragraphs, table] }] }));
  }
}
