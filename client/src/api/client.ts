import { API_ROUTES } from '@vdura/shared';
import type {
  Volume, Pool, Host, Alert, PerformanceSummary,
  SystemInfo, CreateVolumeRequest, ApiResponse,
} from '@vdura/shared';

async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const json: ApiResponse<T> = await res.json();
  return json.data;
}

export const api = {
  volumes: {
    list: () => fetchApi<Volume[]>(API_ROUTES.VOLUMES),
    get: (id: string) => fetchApi<Volume>(`${API_ROUTES.VOLUMES}/${id}`),
    create: (data: CreateVolumeRequest) =>
      fetchApi<Volume>(API_ROUTES.VOLUMES, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi<void>(`${API_ROUTES.VOLUMES}/${id}`, { method: 'DELETE' }),
  },
  pools: {
    list: () => fetchApi<Pool[]>(API_ROUTES.POOLS),
    get: (id: string) => fetchApi<Pool>(`${API_ROUTES.POOLS}/${id}`),
  },
  hosts: {
    list: () => fetchApi<Host[]>(API_ROUTES.HOSTS),
    get: (id: string) => fetchApi<Host>(`${API_ROUTES.HOSTS}/${id}`),
  },
  alerts: {
    list: (filters?: { severity?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (filters?.severity) params.set('severity', filters.severity);
      if (filters?.status) params.set('status', filters.status);
      const qs = params.toString();
      return fetchApi<Alert[]>(`${API_ROUTES.ALERTS}${qs ? `?${qs}` : ''}`);
    },
    acknowledge: (id: string) =>
      fetchApi<Alert>(`${API_ROUTES.ALERTS}/${id}/acknowledge`, { method: 'POST' }),
  },
  performance: {
    summary: (intervalMs?: number) => {
      const qs = intervalMs ? `?interval=${intervalMs}` : '';
      return fetchApi<PerformanceSummary>(`${API_ROUTES.PERFORMANCE}${qs}`);
    },
  },
  system: {
    info: () => fetchApi<SystemInfo>(API_ROUTES.SYSTEM),
  },
};
