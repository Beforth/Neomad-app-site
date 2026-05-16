/**
 * Backend API client. Base URL from .env: VITE_API_BASE_URL
 */

const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (url && String(url).trim()) return String(url).trim().replace(/\/$/, '');
  return 'https://api-neomed.encryptedbar.com';
};

/** WebSocket origin (ws/wss) matching the REST API base. */
export const getWsBaseUrl = (): string => {
  const base = getBaseUrl();
  if (base.startsWith('https://')) return `wss://${base.slice(8)}`;
  if (base.startsWith('http://')) return `ws://${base.slice(7)}`;
  return base;
};

/** HTTP fallback when `/ws/delivery` is down (same contract as WS `location_update`). */
export async function patchDeliveryLocationHttp(
  token: string,
  body: {
    lat: number;
    lng: number;
    speed_mps?: number | null;
    heading?: number | null;
    battery_percent?: number | null;
  },
): Promise<void> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/users/me/delivery-location`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      lat: body.lat,
      lng: body.lng,
      speed_mps: body.speed_mps ?? null,
      heading: body.heading ?? null,
      battery_percent: body.battery_percent ?? null,
    }),
  });
  if (res.ok || res.status === 409) return;
  notifyIfUnauthorized(res, true);
  const err = (await res.json().catch(() => ({}))) as { detail?: string };
  throw new Error(getApiError(err, res.statusText || 'Location update failed'));
}

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

/**
 * Dispatched when a Bearer-authenticated request returns 401 (invalid/expired JWT).
 * Login failures also use 401 but do not send Authorization — use `sentAuthorization: false` there.
 */
export const API_UNAUTHORIZED_EVENT = 'neomed-api-401';

function notifyIfUnauthorized(res: Response, sentAuthorization: boolean): void {
  if (typeof window === 'undefined') return;
  if (res.status === 401 && sentAuthorization) {
    window.dispatchEvent(new CustomEvent(API_UNAUTHORIZED_EVENT));
  }
}

/** Turn browser "Failed to fetch" / network errors into a clearer message. Use in catch blocks. */
export function normalizeFetchError(e: unknown, context: string): string {
  const msg = e instanceof Error ? e.message : '';
  const base = getBaseUrl();
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Load failed')) {
    return `Cannot reach the API at ${base}. Is the backend running? Check VITE_API_BASE_URL in .env (e.g. https://api-neomed.encryptedbar.com).`;
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
    notifyIfUnauthorized(res, true);
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
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to load users'));
  }
  return res.json();
}

export interface SuspectedPowerOffRow {
  server_logged_at: string;
  last_device_ping_at: string;
  battery_percent_at_last_ping: number;
}

export interface OnDutyDeliveryRow {
  user_id: number;
  full_name: string | null;
  email: string;
  lat: number | null;
  lng: number | null;
  status: string;
  speed_mps: number | null;
  last_location_at: string | null;
  battery_percent: number | null;
  suspected_power_off: SuspectedPowerOffRow | null;
}

export interface DeliveryPathPoint {
  lat: number;
  lng: number;
  at: string;
  speed_mps: number | null;
  battery_percent: number | null;
}

export interface DeliveryDayPathResponse {
  user_id: number;
  date: string;
  source: string;
  points: DeliveryPathPoint[];
}

/** On-duty delivery users with last known GPS (admin or manager). */
export async function getOnDutyDeliveries(token: string): Promise<OnDutyDeliveryRow[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/tracking/on-duty-deliveries`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to load tracking'));
  }
  return res.json();
}

/** Delivery user's recorded day path (from Redis hot buffer or DB archive). */
export async function getDeliveryDayPath(
  token: string,
  userId: number,
  date?: string
): Promise<DeliveryDayPathResponse> {
  const base = getBaseUrl();
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await fetch(`${base}/tracking/delivery-path/${userId}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to load travel path'));
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
    notifyIfUnauthorized(res, true);
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
    notifyIfUnauthorized(res, true);
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
    notifyIfUnauthorized(res, true);
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
    notifyIfUnauthorized(res, true);
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
    notifyIfUnauthorized(res, true);
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
    notifyIfUnauthorized(res, true);
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
    notifyIfUnauthorized(res, true);
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
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
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
    notifyIfUnauthorized(res, true);
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
    notifyIfUnauthorized(res, true);
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
    notifyIfUnauthorized(res, true);
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
    delivery_latitude?: number | null;
    delivery_longitude?: number | null;
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
  if (data.delivery_latitude !== undefined) body.delivery_latitude = data.delivery_latitude;
  if (data.delivery_longitude !== undefined) body.delivery_longitude = data.delivery_longitude;
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
    notifyIfUnauthorized(res, true);
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
    notifyIfUnauthorized(res, true);
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
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Change password failed'));
  }
  return res.json();
}

/** Register or clear browser FCM token (admin/manager web push). */
export async function updateWebPushToken(token: string, fcmToken: string | null): Promise<void> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/users/me/web-push`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fcm_token: fcmToken }),
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to update web push token'));
  }
}

export interface GmailAccountStatus {
  id: number;
  email: string;
  is_active: boolean;
  connected_at: string;
  last_sync_at: string | null;
}

export interface GmailStatusResponse {
  connected: boolean;
  account: GmailAccountStatus | null;
}

export interface GmailAuthUrlResponse {
  authorization_url: string;
  state: string;
  redirect_uri: string;
  code_verifier?: string | null;
}

export interface GmailEmail {
  id: number;
  gmail_message_id: string;
  thread_id: string | null;
  subject: string;
  sender: string;
  recipient: string;
  sent_at: string;
  snippet: string;
  body: string;
  labels: string[];
  is_read: boolean;
  is_starred: boolean;
}

export interface GmailEmailListResponse {
  items: GmailEmail[];
  total: number;
  page: number;
  page_size: number;
}

export async function getGmailAuthUrl(token: string): Promise<GmailAuthUrlResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/gmail/auth-url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to get Gmail auth URL'));
  }
  return res.json();
}

export async function completeGmailOAuth(
  token: string,
  code: string,
  state?: string,
  codeVerifier?: string
): Promise<GmailStatusResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/gmail/oauth2callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code, state: state || null, code_verifier: codeVerifier || null }),
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to complete Gmail OAuth'));
  }
  return res.json();
}

export async function getGmailStatus(token: string): Promise<GmailStatusResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/gmail/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to load Gmail status'));
  }
  return res.json();
}

export async function disconnectGmail(token: string): Promise<void> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/gmail/disconnect`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to disconnect Gmail'));
  }
}

export async function listGmailEmails(
  token: string,
  params?: { q?: string; unread_only?: boolean; starred_only?: boolean; page?: number; page_size?: number }
): Promise<GmailEmailListResponse> {
  const base = getBaseUrl();
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.unread_only) sp.set('unread_only', 'true');
  if (params?.starred_only) sp.set('starred_only', 'true');
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.page_size != null) sp.set('page_size', String(params.page_size));
  const qs = sp.toString();
  const res = await fetch(`${base}/gmail/emails${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to load Gmail emails'));
  }
  return res.json();
}

export async function syncRecentGmailEmails(token: string, limit = 20): Promise<{ success: boolean; synced: number; message: string }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/gmail/emails/sync-recent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ limit }),
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to sync recent Gmail emails'));
  }
  return res.json();
}

export async function markGmailEmailRead(token: string, emailId: number, isRead: boolean): Promise<GmailEmail> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/gmail/emails/${emailId}/mark-read`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ is_read: isRead }),
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to update email read state'));
  }
  return res.json();
}

export async function toggleGmailEmailStar(token: string, emailId: number): Promise<GmailEmail> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/gmail/emails/${emailId}/toggle-star`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(getApiError(err as { detail?: string }, res.statusText || 'Failed to toggle email star'));
  }
  return res.json();
}

export { getBaseUrl };
