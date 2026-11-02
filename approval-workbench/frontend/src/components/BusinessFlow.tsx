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
      setError(e instanceof Error ? e.message : 'Request failed');
      if (e instanceof BusinessError && ['INVENTORY_CHANGED', 'RULE_CHANGED', 'CONTENT_CHANGED'].includes(e.code)) { setStale(true); setReview(null); }
    } finally { setBusy(false); }
  }
  async function refresh() { const data = await businessApi<Context>('/procurement/context'); setContext(data); return data; }
  useEffect(() => { void act(async () => { await refresh(); }); }, []);
  async function preview(edited = false) {
    await act(async () => {
      if (edited && plan && plan.items.some(item => !/^\d+(\.\d{1,2})?$/.test(quantities[item.sku] ?? ''))) throw new Error('Enter a complete nonnegative purchase quantity with at most two decimal places.');
      const changes = edited && plan ? plan.items.map(item => ({ sku: item.sku, quantity: Number(quantities[item.sku]) })) : undefined;
      const result = await businessApi<Plan>('/procurement/plans', { method: 'POST', body: JSON.stringify({ ...(changes ? { changes } : {}) }) });
      setPlan(result); setReview(null); setReceipt(null); setRequestKey(crypto.randomUUID()); setStale(false); setDirty(false);
      setQuantities(Object.fromEntries(result.items.map(item => [item.sku, String(item.quantity)])));
      await refresh(); setMessage('Replenishment plan generated; no order created. Check the quantities and review the plan.');
    });
  }
  function edit(sku: string, quantity: string) { setQuantities(old => ({ ...old, [sku]: quantity })); setDirty(true); setReview(null); setReceipt(null); setMessage('Quantity changed. Save and review the revised plan before confirming.'); }
  async function acknowledge() {
    if (!plan) return;
    await act(async () => { const result = await businessApi<Review>('/procurement/plans/' + plan.id + '/review', { method: 'POST', body: JSON.stringify({ contentHash: plan.contentHash, acknowledged: true }) }); setReview(result); setMessage('Human review recorded for this content. The next step confirms simulated procurement only.'); });
  }
  async function confirm() {
    if (!plan || !review) return;
    await act(async () => { const result = await businessApi<{ receipt: Receipt; repeated: boolean }>('/orders/confirm', { method: 'POST', headers: { 'Idempotency-Key': requestKey }, body: JSON.stringify({ planId: plan.id, reviewId: review.id, contentHash: plan.contentHash }) }); setReceipt(result.receipt); setMessage(result.repeated ? 'Repeat request returned the original saved receipt; no new order created.' : 'Simulated order and confirmation receipt saved. Nothing was sent to a supplier.'); });
  }
  async function changeInventory() {
    if (!context) return;
    await act(async () => { const result = await businessApi<Context>('/procurement/demo/inventory', { method: 'POST', body: JSON.stringify({ sku: 'SYN-RICE', delta: context.items.find(x => x.sku === 'SYN-RICE')!.currentStock >= 5 ? -5 : 5, expectedRevision: context.source.revision }) }); setContext(result); setMessage('Synthetic inventory changed. The reviewed plan still binds the old revision; the server will check again on confirmation.'); });
  }
  return { context, plan, review, quantities, dirty, stale, receipt, busy, message, error, manager, requestKey, act, refresh, preview, edit, acknowledge, confirm, changeInventory };
}
export function BusinessProvider({ children }: { children: React.ReactNode }) { const value = useBusinessState(); return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>; }
export function FlowNotice() {
  const f = useBusiness();
  return <><div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm mb-4" style={{ color: '#1e3a8a' }} data-testid="synthetic-notice"><strong>Synthetic data · local simulated procurement</strong> This flow uses an isolated backend. No supplier contact or real transaction. Role: {f.manager ? 'Demo manager (can confirm)' : 'Demo viewer (can save; cannot approve)'}</div>
    {f.error && <div role="alert" data-testid="flow-error" className="rounded-lg border border-red-300 bg-red-50 p-4 mb-4 text-red-800">{f.error}</div>}
    {f.message && <div role="status" data-testid="flow-status" style={{ color: '#1e3a8a' }} className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-4">{f.message}</div>}
  </>;
}
function InventoryTable({ items }: { items: Item[] }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm" data-testid="inventory-table"><thead><tr className="border-b text-left"><th className="p-3">Ingredient</th><th>Snapshot demand kg</th><th>Available stock kg</th><th>Demand shortage kg</th><th>Suggested purchase kg</th><th>Status</th></tr></thead><tbody>{items.map(x => <tr key={x.sku} className="border-b"><td className="p-3 font-medium">{x.ingredient}<div className="text-xs text-gray-500">{x.sku}</div></td><td>{x.demand}</td><td>{x.currentStock}</td><td>{x.shortage}</td><td>{x.recommendedAmount}</td><td className={x.shortage > 0 ? 'text-amber-700' : 'text-green-700'}>{x.shortage > 0 ? 'Replenish' : 'Sufficient'}</td></tr>)}</tbody></table></div>;
}
export function BusinessPrediction() {
  const f = useBusiness(); const c = f.context;
  return <div className="space-y-6"><FlowNotice /><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Demand Forecast</h1><p className="text-gray-500 mt-1">Demand snapshot → inventory shortage → human-reviewed replenishment plan</p></div><Button disabled={f.busy} onClick={() => f.act(async () => { await f.refresh(); })}><RefreshCw className="w-4 h-4 mr-2"/>Refresh data</Button></div>
    {c ? <><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Metric label="Snapshot target date" value={c.source.forecast.targetDate}/><Metric label="Ingredients to replenish" value={String(c.items.filter(x => x.shortage > 0).length) + ' / ' + c.items.length}/><Metric label="Current inventory revision" value={'v' + c.source.revision}/></div>
      <Card><CardHeader><CardTitle>Ingredient demand and inventory shortage</CardTitle><p className="text-sm text-gray-500">Synthetic Demo Store · {c.source.forecast.storeId} · Fixed demand snapshot; not a live model forecast</p></CardHeader><CardContent><InventoryTable items={c.items}/><Button className="mt-4" disabled={f.busy} onClick={() => f.preview(false)}>Calculate replenishment plan</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Customer traffic snapshot</CardTitle></CardHeader><CardContent><div style={{ height: 210 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={c.source.forecast.traffic}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis/><Tooltip/><Area dataKey="customers" name="Synthetic customers" stroke="#2563eb" fill="#dbeafe"/></AreaChart></ResponsiveContainer></div></CardContent></Card>
      <ReviewPanel />
    </> : <Card><CardContent className="p-6">{f.busy ? 'Loading isolated data…' : 'No data loaded. Refresh or sign in again; no fabricated success is shown.'}</CardContent></Card>}</div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-5"><div className="text-sm text-gray-500">{label}</div><div className="text-2xl font-semibold mt-2">{value}</div></CardContent></Card>; }
export function BusinessInventory() {
  const f = useBusiness(); return <div className="space-y-6"><FlowNotice/><h1 className="text-2xl font-bold">Inventory</h1>{f.context && <><Card><CardHeader><CardTitle>Synthetic inventory and replenishment basis</CardTitle></CardHeader><CardContent><InventoryTable items={f.context.items}/><p className="text-sm text-gray-500 mt-3">Inventory revision v{f.context.source.revision}; Confirming simulated procurement does not increase stock; receiving is not implemented.</p><div className="flex gap-3 mt-4"><Button disabled={f.busy} onClick={() => f.preview(false)}>Recalculate using current stock</Button><Button variant="outline" disabled={f.busy || !f.manager} onClick={f.changeInventory}>Change synthetic rice stock by 5 kg</Button></div></CardContent></Card><ReviewPanel/></>}</div>;
}
function ReviewPanel() {
  const f = useBusiness(); const p = f.plan;
  if (!p) return null;
  return <Card data-testid="review-panel"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5"/>Replenishment plan · human review</CardTitle><p className="text-sm text-gray-500">A preview is not an order. Save edits and review the revised plan.</p></CardHeader><CardContent>
    <div className="business-review-layout"><div className="business-review-main"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Ingredient</th><th>Plan stock kg</th><th>Suggested kg</th><th>Human purchase kg</th></tr></thead><tbody>{p.items.map(x => <tr key={x.sku} className="border-b"><td className="p-2">{x.ingredient}</td><td>{x.currentStock}</td><td>{x.recommendedAmount}</td><td><input aria-label={x.ingredient + ' purchase quantity'} data-testid={'quantity-' + x.sku} className="w-24 border rounded p-2 my-2" type="number" min="0" max="10000" step="0.01" value={f.quantities[x.sku] ?? ''} disabled={f.busy || !!f.receipt} onChange={e => f.edit(x.sku, e.target.value)}/></td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap gap-3 mt-4"><Button variant="outline" disabled={f.busy || !f.dirty} onClick={() => f.preview(true)}>Save revised plan</Button><Button variant="outline" disabled={f.busy || f.dirty || f.stale || !f.manager || !!f.receipt} onClick={f.acknowledge}>I have reviewed this plan</Button><Button disabled={f.busy || f.dirty || f.stale || !f.review || !f.manager || !!f.receipt} onClick={f.confirm}>Confirm simulated procurement</Button></div>
      <p className="text-sm text-gray-500 mt-3">{f.dirty ? 'Edits are not saved; confirmation is disabled.' : f.stale ? 'The old plan is stale. Recalculate using current stock.' : f.review ? 'Current content reviewed. Confirmation also checks permission, inventory and rule version.' : 'Awaiting human review.'}</p>
      {!f.receipt && <Button className="mt-3" variant="outline" disabled={f.busy || !f.manager} onClick={f.changeInventory}>Change stock during review</Button>}
    </div><aside style={{ color: '#0f172a' }} className="rounded-lg bg-gray-50 p-4 text-sm"><h3 className="font-semibold mb-2">Recommendation basis</h3>{p.items.map(x => <p key={x.sku} className="mb-3">{x.ingredient}: {x.reason}</p>)}<details><summary className="cursor-pointer text-blue-700">Show data and rule binding</summary><dl className="mt-3 space-y-2 break-all"><dt>Snapshot</dt><dd>{p.source.forecast.id} / {p.source.forecast.version}</dd><dt>Generated at</dt><dd>{p.source.forecast.generatedAt}</dd><dt>Inventory revision</dt><dd>v{p.source.revision}</dd><dt>Rule version</dt><dd>{p.ruleVersion}</dd><dt>Rule hash</dt><dd>{p.ruleHash}</dd><dt>Content hash</dt><dd data-testid="plan-hash">{p.contentHash}</dd></dl>{p.rules.map(x => <p className="mt-2" key={x.id}>{x.id}: {x.summary}</p>)}</details></aside></div>
    {f.receipt && <div className="mt-5"><ReceiptView receipt={f.receipt}/><Button variant="outline" className="mt-3" disabled={f.busy} onClick={f.confirm}>Retry the same confirmation</Button></div>}
  </CardContent></Card>;
}
function ReceiptView({ receipt }: { receipt: Receipt }) {
  const f = useBusiness();
  return <div className="rounded-lg border border-green-300 bg-green-50 p-4" style={{ color: '#14532d' }} data-testid="receipt"><h3 className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>Simulated procurement recorded</h3><p className="text-sm mt-2 break-all" data-testid="order-id">{receipt.id}</p><p className="text-sm break-all">Receipt: {receipt.receiptId}</p><p className="text-sm">Confirmed at: {receipt.confirmedAt} · Synthetic inventory v{receipt.plan.source.revision}</p><p className="text-sm mt-2">{receipt.plan.items.map(x => x.ingredient + ' ' + x.quantity + ' kg').join('; ')}</p><p className="text-sm mt-2">No supplier contact, actual purchase or receiving took place.</p><div className="flex gap-3 mt-3"><Button variant="outline" onClick={() => f.act(() => downloadRecord(receipt.id, 'docx'))}><FileDown className="w-4 h-4 mr-2"/>Export saved-record report</Button><Button variant="outline" onClick={() => f.act(() => downloadRecord(receipt.id, 'json'))}>Download receipt JSON</Button></div></div>;
}
export function BusinessOrders() {
  const f = useBusiness(); const [orders, setOrders] = useState<Receipt[]>([]);
  async function load() { const data = await businessApi<{ orders: Receipt[] }>('/orders'); setOrders(data.orders); }
  useEffect(() => { void f.act(load); }, []);
  return <div className="space-y-6"><FlowNotice/><div className="flex justify-between"><h1 className="text-2xl font-bold">Order Records</h1><Button variant="outline" onClick={() => f.act(load)}>Refresh saved records</Button></div><p className="text-sm text-gray-500">Read from local SQLite independently of this page session. Sign in again after a backend restart to retrieve saved orders. Previews and reviews do not appear here.</p>{!orders.length && <Card><CardContent className="p-6">No simulated orders yet.</CardContent></Card>}{orders.map(order => <ReceiptView key={order.id} receipt={order}/>)}</div>;
}
export function UnconnectedPage({ label }: { label: string }) { return <><FlowNotice/><Card><CardHeader><CardTitle>{label}</CardTitle></CardHeader><CardContent><p>Original navigation retained. This module is not connected to the isolated procurement flow; its actions are disabled.</p><p className="text-sm text-gray-500 mt-3">Available here: Demand Forecast, Inventory and Order Records. No fabricated execution success is shown.</p><Button className="mt-4" disabled>Not connected</Button></CardContent></Card></>; }
