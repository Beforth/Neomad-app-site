import { getBaseUrl, normalizeFetchError } from './api';

export type ReportParams = Record<string, string | number | undefined | null>;

/** GET /reports/<endpoint>. Admin / manager only on the server. */
export async function fetchReport<T = any>(token: string, endpoint: string, params: ReportParams = {}): Promise<T> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const qs = sp.toString();
  try {
    const res = await fetch(`${getBaseUrl()}/reports/${endpoint}${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) {
      throw new Error(`The server at ${getBaseUrl()} has no reports yet. Restart the backend so it loads the new reports code.`);
    }
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { detail?: string };
      throw new Error(err.detail || `Report failed (${res.status})`);
    }
    return (await res.json()) as T;
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Could not load the report'));
  }
}
