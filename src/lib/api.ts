/**
 * Backend API client. Base URL from .env: VITE_API_BASE_URL (default http://localhost:8000)
 */

const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (url) return url.replace(/\/$/, '');
  return 'http://localhost:8000';
};

export interface LoginResponseUser {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  role_codes: string[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: LoginResponseUser;
}

/** Map backend role_codes to frontend role (single). */
export function mapBackendRoleToFrontend(roleCodes: string[]): 'admin' | 'manager' | 'delivery_boy' | 'staff' {
  const code = roleCodes?.[0];
  if (code === 'delivery') return 'delivery_boy';
  if (code === 'super_admin' || code === 'admin') return 'admin';
  if (code === 'manager') return 'manager';
  if (code === 'staff') return 'staff';
  return 'staff';
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string | { msg?: string }[] };
    const msg = typeof err.detail === 'string'
      ? err.detail
      : Array.isArray(err.detail) && err.detail[0]?.msg
        ? err.detail[0].msg
        : res.statusText || 'Login failed';
    throw new Error(msg);
  }
  return res.json();
}

export { getBaseUrl };
