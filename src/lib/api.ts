/**
 * Backend API client. Base URL from .env: VITE_API_BASE_URL (default http://localhost:8080)
 */

const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (url && String(url).trim()) return String(url).trim().replace(/\/$/, '');
  return 'http://localhost:8080';
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

/** Map frontend role to backend role_code (create user). */
export function mapFrontendRoleToBackend(role: string): 'admin' | 'user' {
  if (role === 'admin') return 'admin';
  return 'user';
}

export interface ApiUser {
  id: number;
  email: string;
  full_name: string | null;
  phone?: string | null;
  is_active: boolean;
  role_codes: string[];
}

export interface ApiRole {
  id: number;
  name: string;
  code: string;
}

function getApiError(err: { detail?: string | { msg?: string }[] }, fallback: string): string {
  if (typeof err.detail === 'string') return err.detail;
  if (Array.isArray(err.detail) && err.detail[0]?.msg) return err.detail[0].msg;
  return fallback;
}

/** Turn browser "Failed to fetch" / network errors into a clearer message. Use in catch blocks. */
export function normalizeFetchError(e: unknown, context: string): string {
  const msg = e instanceof Error ? e.message : '';
  const base = getBaseUrl();
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Load failed')) {
    return `Cannot reach the API at ${base}. Is the backend running? Check VITE_API_BASE_URL in .env (e.g. http://localhost:8080).`;
  }
  return e instanceof Error ? e.message : context;
}

/** List roles. Requires admin token. Use for role dropdown in user management. */
export async function getRoles(token: string): Promise<ApiRole[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to load roles'));
  }
  return res.json();
}

/** List users. Admin: no params. Admin/manager: role_code=delivery for assignable delivery users. */
export async function getUsers(token: string, params?: { role_code?: string }): Promise<ApiUser[]> {
  const base = getBaseUrl();
  const url = params?.role_code ? `${base}/users?role_code=${encodeURIComponent(params.role_code)}` : `${base}/users`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to load users'));
  }
  return res.json();
}

/** Create user. Requires admin token. role_code: any valid role from GET /roles (e.g. admin, staff, manager, delivery, super_admin). */
export async function createUser(
  token: string,
  data: { email: string; password: string; full_name?: string | null; phone?: string | null; role_code: string },
): Promise<ApiUser> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      full_name: data.full_name || undefined,
      phone: data.phone || undefined,
      role_code: data.role_code,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to create user'));
  }
  return res.json();
}

/** Update user. Requires admin token. Only send fields to change. */
export async function updateUser(
  token: string,
  userId: number,
  data: { full_name?: string | null; email?: string; phone?: string | null; role_code?: string },
): Promise<ApiUser> {
  const base = getBaseUrl();
  const body: Record<string, string | null> = {};
  if (data.full_name !== undefined) body.full_name = data.full_name ?? '';
  if (data.email !== undefined) body.email = data.email;
  if (data.phone !== undefined) body.phone = data.phone ?? null;
  if (data.role_code !== undefined) body.role_code = data.role_code;
  const res = await fetch(`${base}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to update user'));
  }
  return res.json();
}

export interface ApiTask {
  id: number;
  task_number: string;
  title: string;
  description?: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
  assigned_to?: number | null;
  assignee_name?: string | null;
}

export interface TaskListParams {
  search?: string;
  status?: string;
  assigned_to?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface TaskListResult {
  items: ApiTask[];
  total: number;
  page: number;
  page_size: number;
}

/** List tasks with pagination. */
export async function getTasks(
  token: string,
  params?: TaskListParams
): Promise<TaskListResult> {
  const base = getBaseUrl();
  const sp = new URLSearchParams();
  if (params?.search) sp.set('search', params.search);
  if (params?.status) sp.set('status', params.status);
  if (params?.assigned_to != null) sp.set('assigned_to', String(params.assigned_to));
  if (params?.sort_by) sp.set('sort_by', params.sort_by);
  if (params?.sort_order) sp.set('sort_order', params.sort_order);
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.page_size != null) sp.set('page_size', String(params.page_size));
  const qs = sp.toString();
  const url = `${base}/tasks${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to load tasks'));
  }
  return res.json();
}

/** Get one task. */
export async function getTask(token: string, taskId: number): Promise<ApiTask> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to load task'));
  }
  return res.json();
}

/** Create task. Admin or manager. */
export async function createTask(
  token: string,
  data: { title: string; description?: string | null; assigned_to?: number | null }
): Promise<ApiTask> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: data.title,
      description: data.description ?? null,
      assigned_to: data.assigned_to ?? null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to create task'));
  }
  return res.json();
}

/** Update task. */
export async function updateTask(
  token: string,
  taskId: number,
  data: { title?: string; description?: string | null; status?: string; assigned_to?: number | null }
): Promise<ApiTask> {
  const base = getBaseUrl();
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.status !== undefined) body.status = data.status;
  if (data.assigned_to !== undefined) body.assigned_to = data.assigned_to;
  const res = await fetch(`${base}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to update task'));
  }
  return res.json();
}

/** Delete task. Admin or manager. */
export async function deleteTask(token: string, taskId: number): Promise<void> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to delete task'));
  }
}

export interface ApiInvoice {
  id: number;
  invoice_number: string;
  hospital_name: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at?: string | null;
  assigned_to?: number | null;
  accepted_at?: string | null;
  delivered_at?: string | null;
  cash_received?: number | null;
  cheque_received?: number | null;
  cheque_number?: string | null;
  bank_name?: string | null;
  cheque_photo_url?: string | null;
  signed_copy_url?: string | null;
  description?: string | null;
  cancel_reason?: string | null;
  delivery_feedback?: string | null;
  feedback_reason?: string | null;
  cash_confirmed?: boolean;
  cheque_confirmed?: boolean;
  assignee_name?: string | null;
}

export interface InvoiceListParams {
  search?: string;
  status?: string;
  assigned_to?: number;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface InvoiceListResult {
  items: ApiInvoice[];
  total: number;
  page: number;
  page_size: number;
}

/** List invoices with pagination. Supports search, filters, sort. */
export async function getInvoices(
  token: string,
  params?: InvoiceListParams
): Promise<InvoiceListResult> {
  const base = getBaseUrl();
  const sp = new URLSearchParams();
  if (params?.search) sp.set('search', params.search);
  if (params?.status) sp.set('status', params.status);
  if (params?.assigned_to != null) sp.set('assigned_to', String(params.assigned_to));
  if (params?.date_from) sp.set('date_from', params.date_from);
  if (params?.date_to) sp.set('date_to', params.date_to);
  if (params?.sort_by) sp.set('sort_by', params.sort_by);
  if (params?.sort_order) sp.set('sort_order', params.sort_order);
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.page_size != null) sp.set('page_size', String(params.page_size));
  const qs = sp.toString();
  const url = `${base}/invoices${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to load invoices'));
  }
  return res.json();
}

/** Get one invoice. */
export async function getInvoice(token: string, invoiceId: number): Promise<ApiInvoice> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/invoices/${invoiceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to load invoice'));
  }
  return res.json();
}

/** Create invoice. Admin or manager. */
export async function createInvoice(
  token: string,
  data: { invoice_number: string; hospital_name: string; amount?: number; description?: string; assigned_to?: number }
): Promise<ApiInvoice> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      invoice_number: data.invoice_number,
      hospital_name: data.hospital_name,
      amount: data.amount ?? 0,
      description: data.description ?? null,
      assigned_to: data.assigned_to ?? null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to create invoice'));
  }
  return res.json();
}

/** Update invoice (assign, cancel, deliver, confirm cash/cheque). */
export async function updateInvoice(
  token: string,
  invoiceId: number,
  data: {
    status?: string;
    assigned_to?: number | null;
    cancel_reason?: string | null;
    signed_copy_url?: string | null;
    cash_received?: number | null;
    cheque_received?: number | null;
    cheque_number?: string | null;
    bank_name?: string | null;
    cheque_photo_url?: string | null;
    delivery_feedback?: string | null;
    feedback_reason?: string | null;
    cash_confirmed?: boolean;
    cheque_confirmed?: boolean;
  }
): Promise<ApiInvoice> {
  const base = getBaseUrl();
  const body: Record<string, unknown> = {};
  if (data.status !== undefined) body.status = data.status;
  if (data.assigned_to !== undefined) body.assigned_to = data.assigned_to;
  if (data.cancel_reason !== undefined) body.cancel_reason = data.cancel_reason;
  if (data.signed_copy_url !== undefined) body.signed_copy_url = data.signed_copy_url;
  if (data.cash_received !== undefined) body.cash_received = data.cash_received;
  if (data.cheque_received !== undefined) body.cheque_received = data.cheque_received;
  if (data.cheque_number !== undefined) body.cheque_number = data.cheque_number;
  if (data.bank_name !== undefined) body.bank_name = data.bank_name;
  if (data.cheque_photo_url !== undefined) body.cheque_photo_url = data.cheque_photo_url;
  if (data.delivery_feedback !== undefined) body.delivery_feedback = data.delivery_feedback;
  if (data.feedback_reason !== undefined) body.feedback_reason = data.feedback_reason;
  if (data.cash_confirmed !== undefined) body.cash_confirmed = data.cash_confirmed;
  if (data.cheque_confirmed !== undefined) body.cheque_confirmed = data.cheque_confirmed;
  const res = await fetch(`${base}/invoices/${invoiceId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to update invoice'));
  }
  return res.json();
}

/** Assign invoice to a user. */
export async function assignInvoice(token: string, invoiceId: number, assignedTo: number): Promise<ApiInvoice> {
  return updateInvoice(token, invoiceId, { assigned_to: assignedTo });
}

/** Cancel invoice. */
export async function cancelInvoice(token: string, invoiceId: number, reason?: string): Promise<ApiInvoice> {
  return updateInvoice(token, invoiceId, { status: 'cancelled', cancel_reason: reason ?? null });
}

/** Delete invoice. Admin or manager. */
export async function deleteInvoice(token: string, invoiceId: number): Promise<void> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/invoices/${invoiceId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to delete invoice'));
  }
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
    throw new Error(getApiError(err, res.statusText || 'Login failed'));
  }
  return res.json();
}

/** Change password for the authenticated user. Requires Bearer token. */
export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Change password failed'));
  }
  return res.json();
}

export { getBaseUrl };
