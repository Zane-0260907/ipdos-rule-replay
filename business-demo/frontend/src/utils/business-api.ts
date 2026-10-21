export const BUSINESS_API = 'http://127.0.0.1:3037';
export class BusinessError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) { super(message); }
}
export async function businessApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('businessToken');
  const response = await fetch(BUSINESS_API + path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers } });
  const body = await response.json();
  if (!response.ok || body.error) {
    const failure = body.error && typeof body.error === 'object' ? body.error : body;
    throw new BusinessError(failure.code || 'REQUEST_FAILED', Array.isArray(failure.message) ? failure.message.join('; ') : failure.message || '请求失败', response.status);
  }
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}
export async function downloadRecord(id: string, format: 'docx' | 'json') {
  const response = await fetch(BUSINESS_API + '/orders/' + encodeURIComponent(id) + (format === 'docx' ? '/report' : ''), { headers: { Authorization: 'Bearer ' + sessionStorage.getItem('businessToken') } });
  if (!response.ok) throw new Error('报告下载失败，请重新登录或检查订单。');
  const bytes = format === 'docx' ? await response.blob() : new Blob([JSON.stringify((await response.json()).data, null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(bytes); anchor.download = id + '.' + format; anchor.click(); setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}
