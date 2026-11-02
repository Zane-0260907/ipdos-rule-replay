const envBase = 'http://127.0.0.1:3037';
export const API_BASE = envBase && envBase.trim().length > 0 ? envBase : 'http://localhost:3002';

const tokenKey = 'authToken';
const storage = typeof window !== 'undefined' ? window.localStorage : undefined;

function readToken(): string {
  if (!storage) {
    return '';
  }
  try {
    return storage.getItem(tokenKey) ?? '';
  } catch (error) {
    console.warn('Failed to read auth token:', error);
    return '';
  }
}

function ensureHeaders(headers?: HeadersInit): Headers {
  return new Headers(headers ?? {});
}

function shouldSetJsonHeader(body: BodyInit | null | undefined): boolean {
  if (!body) {
    return false;
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return false;
  }
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    return false;
  }
  return true;
}

function attachAuth(headers: Headers): void {
  const token = readToken();
  if (!token) {
    return;
  }
  if (!headers.has('Authorization')) {
    headers.set('Authorization', 'Bearer ' + token);
  }
  if (!headers.has('x-demo-auth')) {
    headers.set('x-demo-auth', token);
  }
}

export interface ApiRequestOptions extends RequestInit {
  useAuth?: boolean;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.startsWith('/') ? endpoint : '/' + endpoint;
}

function buildInit(options: ApiRequestOptions, useAuth: boolean): RequestInit {
  const headers = ensureHeaders(options.headers);
  if (useAuth) {
    attachAuth(headers);
  }
  if (!headers.has('Content-Type') && shouldSetJsonHeader(options.body)) {
    headers.set('Content-Type', 'application/json');
  }
  return { ...options, headers } as RequestInit;
}

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function raiseForStatus(response: Response): Promise<never> {
  let message = 'Request failed (' + response.status + ')';
  let payload: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      payload = await response.json();
      if (payload && typeof payload === 'object' && 'message' in payload) {
        const candidate = (payload as Record<string, unknown>).message;
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
          message = candidate;
        }
      }
    } else {
      const text = await response.text();
      payload = text;
      if (typeof text === 'string' && text.trim().length > 0) {
        message = text;
      }
    }
  } catch (error) {
    console.warn('Unable to parse error payload:', error);
  }
  throw new ApiError(response.status, message, payload);
}

export const apiFetchJson = async <T>(
  endpoint: string,
  init: ApiRequestOptions = {},
): Promise<T> => {
  const { useAuth = true, ...rest } = init;
  const response = await fetch(
    API_BASE + normalizeEndpoint(endpoint),
    buildInit(rest, useAuth),
  );
  if (!response.ok) {
    await raiseForStatus(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const payload = await response.json();
  if (payload?.error) throw new ApiError(response.status, payload.error.message || '请求失败', payload.error);
  return (payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload) as T;
};

export const apiFetchBlob = async (
  endpoint: string,
  init: ApiRequestOptions = {},
): Promise<Blob> => {
  const { useAuth = true, ...rest } = init;
  const response = await fetch(
    API_BASE + normalizeEndpoint(endpoint),
    buildInit(rest, useAuth),
  );
  if (!response.ok) {
    await raiseForStatus(response);
  }
  return await response.blob();
};

export const apiClient = {
  json: apiFetchJson,
  blob: apiFetchBlob,
};

export const isUnauthorizedError = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.status === 401;
