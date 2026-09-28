import { HttpError } from './http-error';

export type QueryParams = Record<string, string | number | boolean | undefined>;

const DEFAULT_BASE_URL = 'http://localhost:8000/api/v1';
const baseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_BASE_URL;

const buildUrl = (path: string, query?: QueryParams): string => {
  const url = new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
};

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
};

const request = async (path: string, options: RequestOptions): Promise<unknown> => {
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method,
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  if (response.status === 204) return undefined;

  const responseBody = await response.json().catch(() => undefined);
  if (!response.ok) throw new HttpError(response.status, responseBody);
  return responseBody;
};

export const httpClient = {
  get: (path: string, options?: { query?: QueryParams; signal?: AbortSignal }): Promise<unknown> =>
    request(path, { method: 'GET', query: options?.query, signal: options?.signal }),

  post: (path: string, body: unknown, options?: { signal?: AbortSignal }): Promise<unknown> =>
    request(path, { method: 'POST', body, signal: options?.signal }),

  put: (path: string, body: unknown, options?: { signal?: AbortSignal }): Promise<unknown> =>
    request(path, { method: 'PUT', body, signal: options?.signal }),

  delete: (path: string, options?: { signal?: AbortSignal }): Promise<unknown> =>
    request(path, { method: 'DELETE', signal: options?.signal }),
};
