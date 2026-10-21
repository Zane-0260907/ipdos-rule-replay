import React, { createContext, useContext, useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, FileDown, Package, RefreshCw, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { businessApi, BusinessError, downloadRecord } from '../utils/business-api';
import '../styles/business.css';

type Item = { sku: string; ingredient: string; unit: string; demand: number; currentStock: number; shortage: number; recommendedAmount: number; quantity: number; reason: string };
type Context = { source: { revision: number; forecast: { id: string; version: string; targetDate: string; generatedAt: string; storeId: string; traffic: { time: string; customers: number }[] } }; items: Item[]; inputVersion: string; ruleVersion: string; ruleHash: string; policy: { explanation: string }; rules: { id: string; summary: string }[] };
type Plan = Context & { id: string; contentHash: string; createdAt: string };
type Review = { id: string; planId: string; reviewedAt: string };
type Receipt = { id: string; receiptId: string; confirmedAt: string; confirmedBy: string; plan: Plan; review: Review };
type Flow = ReturnType<typeof useBusinessState>;
const FlowContext = createContext<Flow | null>(null);
export function useBusiness() { const value = useContext(FlowContext); if (!value) throw new Error('Business provider missing'); return value; }

function useBusinessState() {
  const [context, setContext] = useState<Context | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [stale, setStale] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [requestKey, setRequestKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const manager = sessionStorage.getItem('businessRole') === 'manager';
  async function act(work: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await work(); } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败');
      if (e instanceof BusinessError && ['INVENTORY_CHANGED', 'RULE_CHANGED', 'CONTENT_CHANGED'].includes(e.code)) { setStale(true); setReview(null); }
    } finally { setBusy(false); }
  }
  async function refresh() { const data = await businessApi<Context>('/procurement/context'); setContext(data); return data; }
  useEffect(() => { void act(async () => { await refresh(); }); }, []);
  async function preview(edited = false) {
    await act(async () => {
      if (edited && plan && plan.items.some(item => !/^\d+(\.\d{1,2})?$/.test(quantities[item.sku] ?? ''))) throw new Error('请输入完整的非负采购数量，最多两位小数。');
      const changes = edited && plan ? plan.items.map(item => ({ sku: item.sku, quantity: Number(quantities[item.sku]) })) : undefined;
      const result = await businessApi<Plan>('/procurement/plans', { method: 'POST', body: JSON.stringify({ ...(changes ? { changes } : {}) }) });
      setPlan(result); setReview(null); setReceipt(null); setRequestKey(crypto.randomUUID()); setStale(false); setDirty(false);
      setQuantities(Object.fromEntries(result.items.map(item => [item.sku, String(item.quantity)])));
      await refresh(); setMessage('补货方案已生成，尚未创建订单。请核对数量并完成审阅。');
    });
  }
  function edit(sku: string, quantity: string) { setQuantities(old => ({ ...old, [sku]: quantity })); setDirty(true); setReview(null); setReceipt(null); setMessage('数量已修改，必须保存并重新审阅后才能确认。'); }
  async function acknowledge() {
    if (!plan) return;
    await act(async () => { const result = await businessApi<Review>('/procurement/plans/' + plan.id + '/review', { method: 'POST', body: JSON.stringify({ contentHash: plan.contentHash, acknowledged: true }) }); setReview(result); setMessage('已记录对当前内容的人工审阅；下一步仅确认模拟采购。'); });
  }
  async function confirm() {
    if (!plan || !review) return;
    await act(async () => { const result = await businessApi<{ receipt: Receipt; repeated: boolean }>('/orders/confirm', { method: 'POST', headers: { 'Idempotency-Key': requestKey }, body: JSON.stringify({ planId: plan.id, reviewId: review.id, contentHash: plan.contentHash }) }); setReceipt(result.receipt); setMessage(result.repeated ? '重复请求已返回原有持久回执，没有新增订单。' : '模拟订单与确认回执已持久保存。未向供应商发送。'); });
  }
  async function changeInventory() {
    if (!context) return;
    await act(async () => { const result = await businessApi<Context>('/procurement/demo/inventory', { method: 'POST', body: JSON.stringify({ sku: 'SYN-RICE', delta: context.items.find(x => x.sku === 'SYN-RICE')!.currentStock >= 5 ? -5 : 5, expectedRevision: context.source.revision }) }); setContext(result); setMessage('合成库存已变动。已审阅方案仍绑定旧版本，确认时服务器会重新校验。'); });
  }
  return { context, plan, review, quantities, dirty, stale, receipt, busy, message, error, manager, requestKey, act, refresh, preview, edit, acknowledge, confirm, changeInventory };
}
export function BusinessProvider({ children }: { children: React.ReactNode }) { const value = useBusinessState(); return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>; }
export function FlowNotice() {
  const f = useBusiness();
  return <><div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm mb-4" style={{ color: '#1e3a8a' }} data-testid="synthetic-notice"><strong>合成数据 · 本地模拟采购</strong>　仅本流程已接通隔离后端。不会联系供应商、不会产生真实交易。角色：{f.manager ? '模拟店长（可确认）' : '模拟观察员（只读）'}</div>
    {f.error && <div role="alert" data-testid="flow-error" className="rounded-lg border border-red-300 bg-red-50 p-4 mb-4 text-red-800">{f.error}</div>}
    {f.message && <div role="status" data-testid="flow-status" style={{ color: '#1e3a8a' }} className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-4">{f.message}</div>}
  </>;
}
function InventoryTable({ items }: { items: Item[] }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm" data-testid="inventory-table"><thead><tr className="border-b text-left"><th className="p-3">食材</th><th>快照需求 kg</th><th>可用库存 kg</th><th>需求缺口 kg</th><th>建议补货 kg</th><th>状态</th></tr></thead><tbody>{items.map(x => <tr key={x.sku} className="border-b"><td className="p-3 font-medium">{x.ingredient}<div className="text-xs text-gray-500">{x.sku}</div></td><td>{x.demand}</td><td>{x.currentStock}</td><td>{x.shortage}</td><td>{x.recommendedAmount}</td><td className={x.shortage > 0 ? 'text-amber-700' : 'text-green-700'}>{x.shortage > 0 ? '需补货' : '充足'}</td></tr>)}</tbody></table></div>;
}
export function BusinessPrediction() {
  const f = useBusiness(); const c = f.context;
  return <div className="space-y-6"><FlowNotice /><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">智能预测</h1><p className="text-gray-500 mt-1">已有需求快照 → 库存缺口 → 人工审阅补货方案</p></div><Button disabled={f.busy} onClick={() => f.act(async () => { await f.refresh(); })}><RefreshCw className="w-4 h-4 mr-2"/>刷新数据</Button></div>
    {c ? <><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Metric label="快照目标日期" value={c.source.forecast.targetDate}/><Metric label="需补货食材" value={String(c.items.filter(x => x.shortage > 0).length) + ' / ' + c.items.length}/><Metric label="当前库存版本" value={'v' + c.source.revision}/></div>
      <Card><CardHeader><CardTitle>食材需求与库存缺口</CardTitle><p className="text-sm text-gray-500">合成演示门店 · {c.source.forecast.storeId} · 来自固定需求快照，非模型实时预测</p></CardHeader><CardContent><InventoryTable items={c.items}/><Button className="mt-4" disabled={f.busy} onClick={() => f.preview(false)}>计算补货方案</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>客流快照</CardTitle></CardHeader><CardContent><div style={{ height: 210 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={c.source.forecast.traffic}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis/><Tooltip/><Area dataKey="customers" name="合成客流" stroke="#2563eb" fill="#dbeafe"/></AreaChart></ResponsiveContainer></div></CardContent></Card>
      <ReviewPanel />
    </> : <Card><CardContent className="p-6">{f.busy ? '正在读取隔离数据…' : '未加载到数据。请刷新或重新登录；不会显示伪造的成功结果。'}</CardContent></Card>}</div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-5"><div className="text-sm text-gray-500">{label}</div><div className="text-2xl font-semibold mt-2">{value}</div></CardContent></Card>; }
export function BusinessInventory() {
  const f = useBusiness(); return <div className="space-y-6"><FlowNotice/><h1 className="text-2xl font-bold">库存管理</h1>{f.context && <><Card><CardHeader><CardTitle>合成库存与补货依据</CardTitle></CardHeader><CardContent><InventoryTable items={f.context.items}/><p className="text-sm text-gray-500 mt-3">库存版本 v{f.context.source.revision}；模拟采购确认不会增加现有库存，尚未实现收货。</p><div className="flex gap-3 mt-4"><Button disabled={f.busy} onClick={() => f.preview(false)}>按当前库存重新计算方案</Button><Button variant="outline" disabled={f.busy || !f.manager} onClick={f.changeInventory}>模拟大米库存变动 5 kg</Button></div></CardContent></Card><ReviewPanel/></>}</div>;
}
function ReviewPanel() {
  const f = useBusiness(); const p = f.plan;
  if (!p) return null;
  return <Card data-testid="review-panel"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5"/>补货方案 · 人工审阅</CardTitle><p className="text-sm text-gray-500">预览不是订单。逐项修改后，需保存并再次审阅。</p></CardHeader><CardContent>
    <div className="business-review-layout"><div className="business-review-main"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">食材</th><th>方案库存</th><th>建议 kg</th><th>人工采购 kg</th></tr></thead><tbody>{p.items.map(x => <tr key={x.sku} className="border-b"><td className="p-2">{x.ingredient}</td><td>{x.currentStock}</td><td>{x.recommendedAmount}</td><td><input aria-label={x.ingredient + '采购数量'} data-testid={'quantity-' + x.sku} className="w-24 border rounded p-2 my-2" type="number" min="0" max="10000" step="0.01" value={f.quantities[x.sku] ?? ''} disabled={f.busy || !!f.receipt} onChange={e => f.edit(x.sku, e.target.value)}/></td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap gap-3 mt-4"><Button variant="outline" disabled={f.busy || !f.dirty} onClick={() => f.preview(true)}>保存修改后的方案</Button><Button variant="outline" disabled={f.busy || f.dirty || f.stale || !f.manager || !!f.receipt} onClick={f.acknowledge}>我已核对当前方案</Button><Button disabled={f.busy || f.dirty || f.stale || !f.review || !f.manager || !!f.receipt} onClick={f.confirm}>确认模拟采购</Button></div>
      <p className="text-sm text-gray-500 mt-3">{f.dirty ? '修改尚未保存，确认已停用。' : f.stale ? '旧方案已失效，请按当前库存重新计算。' : f.review ? '当前内容已审阅；确认时服务器还会检查权限、库存和规则版本。' : '等待人工核对。'}</p>
      {!f.receipt && <Button className="mt-3" variant="outline" disabled={f.busy || !f.manager} onClick={f.changeInventory}>模拟审阅期间库存变动</Button>}
    </div><aside style={{ color: '#0f172a' }} className="rounded-lg bg-gray-50 p-4 text-sm"><h3 className="font-semibold mb-2">建议依据</h3>{p.items.map(x => <p key={x.sku} className="mb-3">{x.ingredient}：{x.reason}</p>)}<details><summary className="cursor-pointer text-blue-700">展开数据与规则依据</summary><dl className="mt-3 space-y-2 break-all"><dt>快照</dt><dd>{p.source.forecast.id} / {p.source.forecast.version}</dd><dt>生成时间</dt><dd>{p.source.forecast.generatedAt}</dd><dt>库存版本</dt><dd>v{p.source.revision}</dd><dt>规则版本</dt><dd>{p.ruleVersion}</dd><dt>规则摘要</dt><dd>{p.ruleHash}</dd><dt>内容摘要</dt><dd data-testid="plan-hash">{p.contentHash}</dd></dl>{p.rules.map(x => <p className="mt-2" key={x.id}>{x.id}：{x.summary}</p>)}</details></aside></div>
    {f.receipt && <div className="mt-5"><ReceiptView receipt={f.receipt}/><Button variant="outline" className="mt-3" disabled={f.busy} onClick={f.confirm}>重试同一确认请求</Button></div>}
  </CardContent></Card>;
}
function ReceiptView({ receipt }: { receipt: Receipt }) {
  const f = useBusiness();
  return <div className="rounded-lg border border-green-300 bg-green-50 p-4" style={{ color: '#14532d' }} data-testid="receipt"><h3 className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>模拟采购已记录</h3><p className="text-sm mt-2 break-all" data-testid="order-id">{receipt.id}</p><p className="text-sm break-all">回执：{receipt.receiptId}</p><p className="text-sm">确认时间：{receipt.confirmedAt} · 合成库存 v{receipt.plan.source.revision}</p><p className="text-sm mt-2">{receipt.plan.items.map(x => x.ingredient + ' ' + x.quantity + ' kg').join('；')}</p><p className="text-sm mt-2">未联系供应商，未发生真实采购或收货。</p><div className="flex gap-3 mt-3"><Button variant="outline" onClick={() => f.act(() => downloadRecord(receipt.id, 'docx'))}><FileDown className="w-4 h-4 mr-2"/>导出同记录报告</Button><Button variant="outline" onClick={() => f.act(() => downloadRecord(receipt.id, 'json'))}>下载回执 JSON</Button></div></div>;
}
export function BusinessOrders() {
  const f = useBusiness(); const [orders, setOrders] = useState<Receipt[]>([]);
  async function load() { const data = await businessApi<{ orders: Receipt[] }>('/orders'); setOrders(data.orders); }
  useEffect(() => { void f.act(load); }, []);
  return <div className="space-y-6"><FlowNotice/><div className="flex justify-between"><h1 className="text-2xl font-bold">订单记录</h1><Button variant="outline" onClick={() => f.act(load)}>刷新持久记录</Button></div><p className="text-sm text-gray-500">从本地 SQLite 读取，不依赖当前页面会话；后端重启后重新登录仍可读取。预览和审阅不会出现在此列表。</p>{!orders.length && <Card><CardContent className="p-6">暂无模拟订单。</CardContent></Card>}{orders.map(order => <ReceiptView key={order.id} receipt={order}/>)}</div>;
}
export function UnconnectedPage({ label }: { label: string }) { return <><FlowNotice/><Card><CardHeader><CardTitle>{label}</CardTitle></CardHeader><CardContent><p>原业务导航保留。本模块未接入本次隔离采购流程，操作已停用。</p><p className="text-sm text-gray-500 mt-3">本次可操作范围：智能预测、库存管理、订单记录。不会显示虚构的执行成功。</p><Button className="mt-4" disabled>尚未接通</Button></CardContent></Card></>; }
