/**
 * HRMS Expenses + Advances — UI types, helpers, and API client.
 * Backend: /hrms/expenses (snake_case). UI uses camelCase via toUiExpense / toUiAdvance.
 */
import { getBaseUrl, notifyIfUnauthorized, normalizeFetchError } from './api';

export type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type Category =
  | 'travel' | 'food' | 'office' | 'other'
  | 'accommodation' | 'utilities' | 'software' | 'subscriptions'
  | 'supplies' | 'maintenance' | 'training' | 'communication';

export type PaymentMethod = 'cash' | 'upi' | 'net_banking' | 'cheque' | 'card';

export interface Payment {
  id: number;
  category: Category | '';
  title: string;
  amount: number;
  taxAmount: number;
  paymentMethod: PaymentMethod | '';
  time: string;
  receipt: string;
}

export interface Expense {
  id: number;
  userId?: number;
  employeeName: string;
  employeeEmail?: string;
  category: Category;
  date: string;
  description: string;
  status: ExpenseStatus;
  payments: Payment[];
  approvalNotes: string;
  createdAt: string;
  approvedAmount?: number;
  amount?: number;
  total?: number;
}

export interface AdvanceExpense {
  id: number;
  userId?: number;
  employeeName: string;
  category?: Category | '';
  title: string;
  amount: number;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAmount?: number;
  approvalNotes: string;
  submittedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ── API (snake_case) types ────────────────────────────────────────────────

export interface ExpensePaymentOut {
  id: number;
  category: string;
  title: string;
  amount: number;
  tax_amount: number;
  payment_method: string;
  time: string | null;
  receipt: string | null;
}

export interface ExpenseOut {
  id: number;
  user_id: number;
  employee_name: string | null;
  employee_email: string | null;
  category: string;
  date: string;
  description: string;
  status: ExpenseStatus;
  payments: ExpensePaymentOut[];
  approval_notes: string | null;
  approved_amount: number | null;
  resolved_by: number | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  amount: number;
  tax_amount: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSummaryOut {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  draft: number;
  total_amount: number;
}

export interface AdvanceOut {
  id: number;
  user_id: number;
  employee_name: string | null;
  employee_email: string | null;
  category: string | null;
  title: string;
  amount: number;
  date: string;
  time: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_amount: number | null;
  approval_notes: string | null;
  resolved_by: number | null;
  resolved_by_name: string | null;
  submitted_at: string;
  resolved_at: string | null;
  updated_at: string;
}

export interface ExpensePaymentIn {
  category: Category;
  title: string;
  amount: number;
  tax_amount?: number;
  payment_method: PaymentMethod;
  time?: string | null;
  receipt?: string | null;
}

export interface ExpenseCreateBody {
  user_id?: number;
  date: string;
  description?: string;
  status?: 'draft' | 'pending';
  payments: ExpensePaymentIn[];
}

export interface ExpenseUpdateBody {
  date?: string;
  description?: string;
  status?: 'draft' | 'pending';
  payments?: ExpensePaymentIn[];
}

export interface ExpenseResolveBody {
  status: 'approved' | 'rejected';
  approval_notes?: string;
  approved_amount?: number;
}

export interface AdvanceCreateBody {
  user_id?: number;
  category?: Category | null;
  title: string;
  amount: number;
  date: string;
  time?: string | null;
  reason?: string | null;
}

export interface AdvanceResolveBody {
  status: 'approved' | 'rejected';
  approval_notes?: string;
  approved_amount?: number;
}

export interface ListExpensesParams {
  search?: string;
  status?: ExpenseStatus;
  category?: Category;
  payment_method?: PaymentMethod;
  user_id?: number;
}

// ── Labels / options (unchanged UI helpers) ───────────────────────────────

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'office', label: 'Office' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'software', label: 'Software' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'supplies', label: 'Supplies / Stationery' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'training', label: 'Training' },
  { value: 'communication', label: 'Communication' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
];

export const CATEGORY_LABELS: Record<Category, string> = CATEGORY_OPTIONS.reduce(
  (acc, c) => { acc[c.value] = c.label; return acc; },
  {} as Record<Category, string>
);

export const PAYMENT_METHOD_LABELS: Record<string, string> = PAYMENT_METHOD_OPTIONS.reduce(
  (acc, m) => { acc[m.value] = m.label; return acc; },
  {} as Record<string, string>
);

export const STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function padZ(n: number) { return String(n).padStart(2, '0'); }

export function timeNowStr() {
  const d = new Date();
  return `${padZ(d.getHours())}:${padZ(d.getMinutes())}`;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${padZ(d.getMonth() + 1)}-${padZ(d.getDate())}`;
}

export function newPayment(): Payment {
  return {
    id: Date.now(),
    category: '',
    title: '',
    amount: 0,
    taxAmount: 0,
    paymentMethod: '',
    time: timeNowStr(),
    receipt: '',
  };
}

export function expenseAmount(e: Expense): number {
  return (e.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

export function expenseTotal(e: Expense): number {
  return (e.payments || []).reduce((s, p) => s + (Number(p.amount) || 0) + (Number(p.taxAmount) || 0), 0);
}

export function expenseTax(e: Expense): number {
  return (e.payments || []).reduce((s, p) => s + (Number(p.taxAmount) || 0), 0);
}

export function primaryPayment(e: Expense): Payment | undefined {
  return (e.payments || [])[0];
}

export function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

/** Map UI payments → API create/update body payments. */
export function paymentsToApi(payments: Payment[]): ExpensePaymentIn[] {
  return payments.map((p) => ({
    category: (p.category || 'other') as Category,
    title: p.title.trim(),
    amount: Math.max(0, Number(p.amount) || 0),
    tax_amount: Math.max(0, Number(p.taxAmount) || 0),
    payment_method: (p.paymentMethod || 'cash') as PaymentMethod,
    time: p.time || null,
    receipt: p.receipt || null,
  }));
}

// ── Mappers ───────────────────────────────────────────────────────────────

export function toUiExpense(api: ExpenseOut): Expense {
  return {
    id: api.id,
    userId: api.user_id,
    employeeName: api.employee_name || api.employee_email?.split('@')[0] || '',
    employeeEmail: api.employee_email || undefined,
    category: (api.category as Category) || 'other',
    date: api.date,
    description: api.description || '',
    status: api.status,
    payments: (api.payments || []).map((p) => ({
      id: p.id,
      category: (p.category as Category) || 'other',
      title: p.title || '',
      amount: Number(p.amount) || 0,
      taxAmount: Number(p.tax_amount) || 0,
      paymentMethod: (p.payment_method as PaymentMethod) || 'cash',
      time: p.time || '',
      receipt: p.receipt || '',
    })),
    approvalNotes: api.approval_notes || '',
    createdAt: api.created_at,
    approvedAmount: api.approved_amount ?? undefined,
    amount: api.amount,
    total: api.total,
  };
}

export function toUiAdvance(api: AdvanceOut): AdvanceExpense {
  return {
    id: api.id,
    userId: api.user_id,
    employeeName: api.employee_name || api.employee_email?.split('@')[0] || '',
    category: (api.category as Category) || '',
    title: api.title,
    amount: Number(api.amount) || 0,
    date: api.date,
    time: api.time || '',
    reason: api.reason || '',
    status: api.status,
    approvedAmount: api.approved_amount ?? undefined,
    approvalNotes: api.approval_notes || '',
    submittedAt: api.submitted_at,
    resolvedAt: api.resolved_at || undefined,
    resolvedBy: api.resolved_by_name || undefined,
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────

async function apiError(res: Response): Promise<Error> {
  notifyIfUnauthorized(res, true);
  const body = await res.json().catch(() => ({})) as { detail?: string | unknown };
  const detail = body.detail;
  const msg = typeof detail === 'string'
    ? detail
    : Array.isArray(detail)
      ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ') || `Request failed: ${res.status}`
      : `Request failed: ${res.status}`;
  return new Error(msg);
}

async function authJson<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw await apiError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Expenses API ──────────────────────────────────────────────────────────

export async function listExpenses(
  token: string,
  params?: ListExpensesParams,
): Promise<Expense[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  if (params?.category) qs.set('category', params.category);
  if (params?.payment_method) qs.set('payment_method', params.payment_method);
  if (params?.user_id != null) qs.set('user_id', String(params.user_id));
  const q = qs.toString() ? `?${qs}` : '';
  try {
    const data = await authJson<ExpenseOut[]>(token, `/hrms/expenses${q}`);
    return data.map(toUiExpense);
  } catch (e) {
    if (e instanceof Error && (e.message.startsWith('Request failed') || e.message.length > 0)) {
      if (e.message.startsWith('Request failed') || !String(e.message).includes('Failed to')) throw e;
    }
    throw new Error(normalizeFetchError(e, 'Failed to load expenses'));
  }
}

export async function getMyExpenses(
  token: string,
  params?: { status?: ExpenseStatus },
): Promise<Expense[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  const q = qs.toString() ? `?${qs}` : '';
  try {
    const data = await authJson<ExpenseOut[]>(token, `/hrms/expenses/me${q}`);
    return data.map(toUiExpense);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load your expenses'));
  }
}

export async function getExpenseSummary(token: string): Promise<ExpenseSummaryOut> {
  try {
    return await authJson<ExpenseSummaryOut>(token, '/hrms/expenses/summary');
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load expense summary'));
  }
}

export async function getExpense(token: string, id: number): Promise<Expense> {
  try {
    const data = await authJson<ExpenseOut>(token, `/hrms/expenses/${id}`);
    return toUiExpense(data);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load expense'));
  }
}

export async function createExpense(token: string, body: ExpenseCreateBody): Promise<Expense> {
  try {
    const data = await authJson<ExpenseOut>(token, '/hrms/expenses', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return toUiExpense(data);
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to create expense'));
  }
}

export async function updateExpense(
  token: string,
  id: number,
  body: ExpenseUpdateBody,
): Promise<Expense> {
  try {
    const data = await authJson<ExpenseOut>(token, `/hrms/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return toUiExpense(data);
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to update expense'));
  }
}

export async function resolveExpense(
  token: string,
  id: number,
  body: ExpenseResolveBody,
): Promise<Expense> {
  try {
    const data = await authJson<ExpenseOut>(token, `/hrms/expenses/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return toUiExpense(data);
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to resolve expense'));
  }
}

export async function resubmitExpense(token: string, id: number): Promise<Expense> {
  try {
    const data = await authJson<ExpenseOut>(token, `/hrms/expenses/${id}/resubmit`, {
      method: 'POST',
    });
    return toUiExpense(data);
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to resubmit expense'));
  }
}

export async function deleteExpense(token: string, id: number): Promise<void> {
  try {
    await authJson<void>(token, `/hrms/expenses/${id}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to delete expense'));
  }
}

// ── Advances API ──────────────────────────────────────────────────────────

export async function listAdvances(
  token: string,
  params?: { status?: 'pending' | 'approved' | 'rejected'; user_id?: number },
): Promise<AdvanceExpense[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.user_id != null) qs.set('user_id', String(params.user_id));
  const q = qs.toString() ? `?${qs}` : '';
  try {
    const data = await authJson<AdvanceOut[]>(token, `/hrms/expenses/advances${q}`);
    return data.map(toUiAdvance);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load advances'));
  }
}

export async function getMyAdvances(token: string): Promise<AdvanceExpense[]> {
  try {
    const data = await authJson<AdvanceOut[]>(token, '/hrms/expenses/advances/me');
    return data.map(toUiAdvance);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load your advances'));
  }
}

export async function createAdvance(token: string, body: AdvanceCreateBody): Promise<AdvanceExpense> {
  try {
    const data = await authJson<AdvanceOut>(token, '/hrms/expenses/advances', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return toUiAdvance(data);
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to create advance'));
  }
}

export async function resolveAdvance(
  token: string,
  id: number,
  body: AdvanceResolveBody,
): Promise<AdvanceExpense> {
  try {
    const data = await authJson<AdvanceOut>(token, `/hrms/expenses/advances/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return toUiAdvance(data);
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to resolve advance'));
  }
}

export async function deleteAdvance(token: string, id: number): Promise<void> {
  try {
    await authJson<void>(token, `/hrms/expenses/advances/${id}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to withdraw advance'));
  }
}
