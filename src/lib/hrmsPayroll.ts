/**
 * HRMS Payroll — UI types, display helpers, and API client.
 * Backend: /hrms/payroll (snake_case). UI uses camelCase via mappers.
 */
import { getBaseUrl, notifyIfUnauthorized, normalizeFetchError } from './api';

export type PayModel = 'monthly' | 'shift';
export type RunStatus = 'draft' | 'calculated' | 'approved' | 'paid';
export type EntryStatus = 'draft' | 'calculated' | 'approved' | 'paid';
export type PaymentMode = 'bank_transfer' | 'upi' | 'cash' | 'cheque';

export interface EarningsConfig {
  basic: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
}

export interface DeductionsConfig {
  pfEnabled: boolean;
  pfPercent: number;
  esicEnabled: boolean;
  esicPercent: number;
  esicCap: number;
  ptEnabled: boolean;
  pt: number;
  tdsEnabled: boolean;
  tds: number;
}

export interface SalaryStructure {
  id: number;
  userId: number;
  employeeName: string;
  employeeEmail?: string;
  role: string;
  payModel: PayModel;
  monthly: EarningsConfig;
  ctc: number;
  shiftRate: number;
  overtimeRate: number;
  deductions: DeductionsConfig;
  active: boolean;
  effectiveFrom: string;
  updatedAt: string;
}

export interface PayLineItem {
  label: string;
  amount: number;
}

export interface PayInputs {
  presentDays: number;
  halfDays: number;
  overtimeHours: number;
  lopDays: number;
  bonus: number;
  latePenalty: number;
  overtimeAmount: number;
  advanceDeduction?: number;
  mediclaimDeduction?: number;
}

export interface PayEntry extends PayInputs {
  id: number;
  runId?: number;
  userId?: number;
  structureId?: number | null;
  employeeName: string;
  employeeEmail?: string;
  role: string;
  payModel: PayModel;
  status: EntryStatus;
  earnings: PayLineItem[];
  gross: number;
  deductions: PayLineItem[];
  totalDeductions: number;
  netPay: number;
  employerPf?: number;
  employerEsic?: number;
  employerTotalCost?: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  paymentRef: string;
  note: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface PayrollRun {
  id: number;
  month: string;
  status: RunStatus;
  entries: PayEntry[];
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  totalGross?: number;
  totalNet?: number;
  entryCount?: number;
}

export interface PayrollSettings {
  id?: number;
  companyName: string;
  companyAddress: string;
  pfNumber: string;
  esicNumber: string;
  panNumber: string;
  defaultPfPercent: number;
  defaultEsicPercent: number;
  defaultEsicCap: number;
  defaultPt: number;
  defaultTds: number;
}

export interface PayrollSummary {
  runs: number;
  draft: number;
  calculated: number;
  approved: number;
  paid: number;
  structures: number;
  activeStructures: number;
  totalNetPaid: number;
}

// ── Labels / options ──────────────────────────────────────────────────────

export const PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
];

export const PAYMENT_MODE_LABELS: Record<string, string> = PAYMENT_MODE_OPTIONS.reduce(
  (acc, m) => { acc[m.value] = m.label; return acc; },
  {} as Record<string, string>
);

export const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'delivery_boy', label: 'Delivery Boy' },
];

export const ROLE_LABELS: Record<string, string> = ROLE_OPTIONS.reduce(
  (acc, r) => { acc[r.value] = r.label; return acc; },
  {} as Record<string, string>
);

export function padZ(n: number) { return String(n).padStart(2, '0'); }

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${padZ(d.getMonth() + 1)}-${padZ(d.getDate())}`;
}

export function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${padZ(d.getMonth() + 1)}`;
}

export function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export function monthDays(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function workingDaysInMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  let count = 0;
  const total = new Date(y, m, 0).getDate();
  for (let d = 1; d <= total; d++) {
    if (new Date(y, m - 1, d).getDay() !== 0) count++;
  }
  return count;
}

export function defaultDeductions(): DeductionsConfig {
  return {
    pfEnabled: true,
    pfPercent: 12,
    esicEnabled: true,
    esicPercent: 0.75,
    esicCap: 21000,
    ptEnabled: true,
    pt: 200,
    tdsEnabled: false,
    tds: 0,
  };
}

export function emptyEarnings(): EarningsConfig {
  return { basic: 0, hra: 0, conveyance: 0, specialAllowance: 0 };
}

export function grossMonthly(s: SalaryStructure): number {
  return Math.round(
    (Number(s.monthly.basic) || 0) +
    (Number(s.monthly.hra) || 0) +
    (Number(s.monthly.conveyance) || 0) +
    (Number(s.monthly.specialAllowance) || 0)
  );
}

export function payModelLabel(m: PayModel) {
  return m === 'monthly' ? 'Monthly' : 'Shift';
}

export function defaultSettings(): PayrollSettings {
  return {
    companyName: 'Neomed Logistics',
    companyAddress: 'Surat, Gujarat, India',
    pfNumber: 'GJ/SRT/12345',
    esicNumber: '24000000000',
    panNumber: 'AAAAA0000A',
    defaultPfPercent: 12,
    defaultEsicPercent: 0.75,
    defaultEsicCap: 21000,
    defaultPt: 200,
    defaultTds: 0,
  };
}

// ── Amount in words ───────────────────────────────────────────────────────

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return (TENS[t] + (o ? ' ' + ONES[o] : '')).trim();
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const part = rest > 0 ? twoDigits(rest) : '';
  return h > 0 ? `Hundred ${part}`.replace(/\s+/g, ' ').trim() : part;
}

export function inWords(num: number): string {
  const n = Math.round(Math.abs(num));
  if (n === 0) return 'Zero Rupees Only';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;
  const parts: string[] = [];
  if (crore > 0) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred > 0) parts.push(threeDigits(hundred));
  return parts.join(' ') + ' Rupees Only';
}

// ── API types ─────────────────────────────────────────────────────────────

interface EarningsApi {
  basic?: number;
  hra?: number;
  conveyance?: number;
  special_allowance?: number;
}

interface DeductionsApi {
  pf_enabled?: boolean;
  pf_percent?: number;
  esic_enabled?: boolean;
  esic_percent?: number;
  esic_cap?: number;
  pt_enabled?: boolean;
  pt?: number;
  tds_enabled?: boolean;
  tds?: number;
}

interface StructureOut {
  id: number;
  user_id: number;
  employee_name: string | null;
  employee_email: string | null;
  role: string;
  pay_model: string;
  monthly_earnings: EarningsApi;
  ctc?: number;
  shift_rate: number;
  overtime_rate: number;
  deductions: DeductionsApi;
  is_active: boolean;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

interface EntryOut {
  id: number;
  run_id: number;
  user_id: number;
  employee_name: string | null;
  employee_email: string | null;
  structure_id: number | null;
  role: string;
  pay_model: string;
  status: string;
  present_days: number;
  half_days: number;
  overtime_hours: number;
  lop_days: number;
  bonus: number;
  late_penalty?: number;
  overtime_amount?: number;
  advance_deduction?: number;
  mediclaim_deduction?: number;
  earnings: PayLineItem[];
  deductions: PayLineItem[];
  gross: number;
  total_deductions: number;
  net_pay: number;
  employer_pf?: number;
  employer_esic?: number;
  employer_total_cost?: number;
  payment_mode: string;
  payment_date: string | null;
  payment_ref: string;
  note: string;
  approved_at: string | null;
  paid_at: string | null;
}

interface RunOut {
  id: number;
  month: string;
  status: string;
  entries: EntryOut[];
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  paid_at: string | null;
  total_gross: number;
  total_net: number;
  entry_count: number;
}

interface SettingsOut {
  id: number;
  company_name: string;
  company_address: string;
  pf_number: string;
  esic_number: string;
  pan_number: string;
  default_pf_percent: number;
  default_esic_percent: number;
  default_esic_cap: number;
  default_pt: number;
  default_tds: number;
}

interface SummaryOut {
  runs: number;
  draft: number;
  calculated: number;
  approved: number;
  paid: number;
  structures: number;
  active_structures: number;
  total_net_paid: number;
}

// ── Mappers ───────────────────────────────────────────────────────────────

function toEarnings(m: EarningsApi | null | undefined): EarningsConfig {
  return {
    basic: Number(m?.basic) || 0,
    hra: Number(m?.hra) || 0,
    conveyance: Number(m?.conveyance) || 0,
    specialAllowance: Number(m?.special_allowance) || 0,
  };
}

function toDeductions(d: DeductionsApi | null | undefined): DeductionsConfig {
  const base = defaultDeductions();
  if (!d) return base;
  return {
    pfEnabled: d.pf_enabled ?? base.pfEnabled,
    pfPercent: Number(d.pf_percent) || 0,
    esicEnabled: d.esic_enabled ?? base.esicEnabled,
    esicPercent: Number(d.esic_percent) || 0,
    esicCap: Number(d.esic_cap) || 0,
    ptEnabled: d.pt_enabled ?? base.ptEnabled,
    pt: Number(d.pt) || 0,
    tdsEnabled: d.tds_enabled ?? base.tdsEnabled,
    tds: Number(d.tds) || 0,
  };
}

export function toUiStructure(api: StructureOut): SalaryStructure {
  return {
    id: api.id,
    userId: api.user_id,
    employeeName: api.employee_name || api.employee_email?.split('@')[0] || '',
    employeeEmail: api.employee_email || undefined,
    role: api.role,
    payModel: (api.pay_model as PayModel) || 'monthly',
    monthly: toEarnings(api.monthly_earnings),
    ctc: Number(api.ctc) || 0,
    shiftRate: Number(api.shift_rate) || 0,
    overtimeRate: Number(api.overtime_rate) || 0,
    deductions: toDeductions(api.deductions),
    active: !!api.is_active,
    effectiveFrom: api.effective_from,
    updatedAt: api.updated_at,
  };
}

export function toUiEntry(api: EntryOut): PayEntry {
  return {
    id: api.id,
    runId: api.run_id,
    userId: api.user_id,
    structureId: api.structure_id,
    employeeName: api.employee_name || api.employee_email?.split('@')[0] || '',
    employeeEmail: api.employee_email || undefined,
    role: api.role,
    payModel: (api.pay_model as PayModel) || 'monthly',
    status: (api.status as EntryStatus) || 'draft',
    presentDays: Number(api.present_days) || 0,
    halfDays: Number(api.half_days) || 0,
    overtimeHours: Number(api.overtime_hours) || 0,
    lopDays: Number(api.lop_days) || 0,
    bonus: Number(api.bonus) || 0,
    latePenalty: Number(api.late_penalty) || 0,
    overtimeAmount: Number(api.overtime_amount) || 0,
    advanceDeduction: Number(api.advance_deduction) || 0,
    mediclaimDeduction: Number(api.mediclaim_deduction) || 0,
    earnings: api.earnings || [],
    deductions: api.deductions || [],
    gross: Number(api.gross) || 0,
    totalDeductions: Number(api.total_deductions) || 0,
    netPay: Number(api.net_pay) || 0,
    employerPf: Number(api.employer_pf) || 0,
    employerEsic: Number(api.employer_esic) || 0,
    employerTotalCost: Number(api.employer_total_cost) || 0,
    paymentMode: (api.payment_mode as PaymentMode) || 'bank_transfer',
    paymentDate: api.payment_date || '',
    paymentRef: api.payment_ref || '',
    note: api.note || '',
    approvedAt: api.approved_at || undefined,
    paidAt: api.paid_at || undefined,
  };
}

export function toUiRun(api: RunOut): PayrollRun {
  return {
    id: api.id,
    month: api.month,
    status: (api.status as RunStatus) || 'draft',
    entries: (api.entries || []).map(toUiEntry),
    createdAt: api.created_at,
    approvedAt: api.approved_at || undefined,
    paidAt: api.paid_at || undefined,
    totalGross: api.total_gross,
    totalNet: api.total_net,
    entryCount: api.entry_count,
  };
}

export function toUiSettings(api: SettingsOut): PayrollSettings {
  return {
    id: api.id,
    companyName: api.company_name,
    companyAddress: api.company_address,
    pfNumber: api.pf_number,
    esicNumber: api.esic_number,
    panNumber: api.pan_number,
    defaultPfPercent: api.default_pf_percent,
    defaultEsicPercent: api.default_esic_percent,
    defaultEsicCap: api.default_esic_cap,
    defaultPt: api.default_pt,
    defaultTds: api.default_tds,
  };
}

export function structureToApiBody(s: {
  userId: number;
  role: string;
  payModel: PayModel;
  monthly: EarningsConfig;
  ctc?: number;
  shiftRate: number;
  overtimeRate: number;
  deductions: DeductionsConfig;
  active: boolean;
  effectiveFrom: string;
}) {
  return {
    user_id: s.userId,
    role: s.role,
    pay_model: s.payModel,
    monthly_earnings: {
      basic: s.monthly.basic,
      hra: s.monthly.hra,
      conveyance: s.monthly.conveyance,
      special_allowance: s.monthly.specialAllowance,
    },
    ctc: s.ctc || 0,
    shift_rate: s.shiftRate,
    overtime_rate: s.overtimeRate,
    deductions: {
      pf_enabled: s.deductions.pfEnabled,
      pf_percent: s.deductions.pfPercent,
      esic_enabled: s.deductions.esicEnabled,
      esic_percent: s.deductions.esicPercent,
      esic_cap: s.deductions.esicCap,
      pt_enabled: s.deductions.ptEnabled,
      pt: s.deductions.pt,
      tds_enabled: s.deductions.tdsEnabled,
      tds: s.deductions.tds,
    },
    is_active: s.active,
    effective_from: s.effectiveFrom,
  };
}

export function settingsToApi(s: PayrollSettings) {
  return {
    company_name: s.companyName,
    company_address: s.companyAddress,
    pf_number: s.pfNumber,
    esic_number: s.esicNumber,
    pan_number: s.panNumber,
    default_pf_percent: s.defaultPfPercent,
    default_esic_percent: s.defaultEsicPercent,
    default_esic_cap: s.defaultEsicCap,
    default_pt: s.defaultPt,
    default_tds: s.defaultTds,
  };
}

// ── HTTP ──────────────────────────────────────────────────────────────────

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
  const res = await fetch(`${getBaseUrl()}${path}`, {
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

function rethrow(e: unknown, fallback: string): never {
  if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
  throw new Error(normalizeFetchError(e, fallback));
}

// ── Settings API ──────────────────────────────────────────────────────────

export async function getPayrollSettings(token: string): Promise<PayrollSettings> {
  try {
    const data = await authJson<SettingsOut>(token, '/hrms/payroll/settings');
    return toUiSettings(data);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load payroll settings'));
  }
}

export async function updatePayrollSettings(token: string, settings: PayrollSettings): Promise<PayrollSettings> {
  try {
    const data = await authJson<SettingsOut>(token, '/hrms/payroll/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsToApi(settings)),
    });
    return toUiSettings(data);
  } catch (e) {
    rethrow(e, 'Failed to save payroll settings');
  }
}

// ── Structures API ────────────────────────────────────────────────────────

export async function listSalaryStructures(token: string, active?: boolean): Promise<SalaryStructure[]> {
  const q = active === undefined ? '' : `?active=${active}`;
  try {
    const data = await authJson<StructureOut[]>(token, `/hrms/payroll/structures${q}`);
    return data.map(toUiStructure);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load salary structures'));
  }
}

export async function getSalaryStructureHistory(token: string, userId: number): Promise<SalaryStructure[]> {
  try {
    const data = await authJson<StructureOut[]>(token, `/hrms/payroll/structures/user/${userId}/history`);
    return data.map(toUiStructure);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load salary structure history'));
  }
}

export async function createSalaryStructure(
  token: string,
  body: Parameters<typeof structureToApiBody>[0],
): Promise<SalaryStructure> {
  try {
    const data = await authJson<StructureOut>(token, '/hrms/payroll/structures', {
      method: 'POST',
      body: JSON.stringify(structureToApiBody(body)),
    });
    return toUiStructure(data);
  } catch (e) {
    rethrow(e, 'Failed to create salary structure');
  }
}

export async function updateSalaryStructure(
  token: string,
  id: number,
  body: Partial<Parameters<typeof structureToApiBody>[0]>,
): Promise<SalaryStructure> {
  const payload: Record<string, unknown> = {};
  if (body.role != null) payload.role = body.role;
  if (body.payModel != null) payload.pay_model = body.payModel;
  if (body.monthly != null) {
    payload.monthly_earnings = {
      basic: body.monthly.basic,
      hra: body.monthly.hra,
      conveyance: body.monthly.conveyance,
      special_allowance: body.monthly.specialAllowance,
    };
  }
  if (body.ctc != null) payload.ctc = body.ctc;
  if (body.shiftRate != null) payload.shift_rate = body.shiftRate;
  if (body.overtimeRate != null) payload.overtime_rate = body.overtimeRate;
  if (body.deductions != null) {
    payload.deductions = {
      pf_enabled: body.deductions.pfEnabled,
      pf_percent: body.deductions.pfPercent,
      esic_enabled: body.deductions.esicEnabled,
      esic_percent: body.deductions.esicPercent,
      esic_cap: body.deductions.esicCap,
      pt_enabled: body.deductions.ptEnabled,
      pt: body.deductions.pt,
      tds_enabled: body.deductions.tdsEnabled,
      tds: body.deductions.tds,
    };
  }
  if (body.active != null) payload.is_active = body.active;
  if (body.effectiveFrom != null) payload.effective_from = body.effectiveFrom;
  try {
    const data = await authJson<StructureOut>(token, `/hrms/payroll/structures/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return toUiStructure(data);
  } catch (e) {
    rethrow(e, 'Failed to update salary structure');
  }
}

export async function deleteSalaryStructure(token: string, id: number): Promise<void> {
  try {
    await authJson<void>(token, `/hrms/payroll/structures/${id}`, { method: 'DELETE' });
  } catch (e) {
    rethrow(e, 'Failed to delete salary structure');
  }
}

// ── Runs API ──────────────────────────────────────────────────────────────

export async function listPayrollRuns(token: string, status?: RunStatus): Promise<PayrollRun[]> {
  const q = status ? `?status=${status}` : '';
  try {
    const data = await authJson<RunOut[]>(token, `/hrms/payroll/runs${q}`);
    return data.map(toUiRun);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load payroll runs'));
  }
}

export async function getPayrollRun(token: string, id: number): Promise<PayrollRun> {
  try {
    const data = await authJson<RunOut>(token, `/hrms/payroll/runs/${id}`);
    return toUiRun(data);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load payroll run'));
  }
}

export async function createPayrollRun(token: string, month: string): Promise<PayrollRun> {
  try {
    const data = await authJson<RunOut>(token, '/hrms/payroll/runs', {
      method: 'POST',
      body: JSON.stringify({ month }),
    });
    return toUiRun(data);
  } catch (e) {
    rethrow(e, 'Failed to create payroll run');
  }
}

export async function deletePayrollRun(token: string, id: number): Promise<void> {
  try {
    await authJson<void>(token, `/hrms/payroll/runs/${id}`, { method: 'DELETE' });
  } catch (e) {
    rethrow(e, 'Failed to delete payroll run');
  }
}

export async function syncPayrollRun(token: string, id: number): Promise<PayrollRun> {
  try {
    const data = await authJson<RunOut>(token, `/hrms/payroll/runs/${id}/sync`, { method: 'POST' });
    return toUiRun(data);
  } catch (e) {
    rethrow(e, 'Failed to sync payroll run');
  }
}

export async function regeneratePayrollRun(token: string, id: number): Promise<PayrollRun> {
  try {
    const data = await authJson<RunOut>(token, `/hrms/payroll/runs/${id}/regenerate`, { method: 'POST' });
    return toUiRun(data);
  } catch (e) {
    rethrow(e, 'Failed to regenerate payroll run');
  }
}

export async function calculatePayrollRun(token: string, id: number): Promise<PayrollRun> {
  try {
    const data = await authJson<RunOut>(token, `/hrms/payroll/runs/${id}/calculate`, { method: 'POST' });
    return toUiRun(data);
  } catch (e) {
    rethrow(e, 'Failed to calculate payroll run');
  }
}

export async function approvePayrollRun(token: string, id: number): Promise<PayrollRun> {
  try {
    const data = await authJson<RunOut>(token, `/hrms/payroll/runs/${id}/approve`, { method: 'POST' });
    return toUiRun(data);
  } catch (e) {
    rethrow(e, 'Failed to approve payroll run');
  }
}

export async function payPayrollRun(token: string, id: number): Promise<PayrollRun> {
  try {
    const data = await authJson<RunOut>(token, `/hrms/payroll/runs/${id}/pay`, { method: 'POST' });
    return toUiRun(data);
  } catch (e) {
    rethrow(e, 'Failed to mark payroll run paid');
  }
}

export async function updatePayrollEntry(
  token: string,
  runId: number,
  entryId: number,
  body: Partial<{
    presentDays: number;
    halfDays: number;
    overtimeHours: number;
    lopDays: number;
    bonus: number;
    latePenalty: number;
    overtimeAmount: number;
    advanceDeduction: number;
    mediclaimDeduction: number;
    paymentMode: PaymentMode;
    paymentRef: string;
    note: string;
  }>,
): Promise<PayEntry> {
  const payload: Record<string, unknown> = {};
  if (body.presentDays != null) payload.present_days = body.presentDays;
  if (body.halfDays != null) payload.half_days = body.halfDays;
  if (body.overtimeHours != null) payload.overtime_hours = body.overtimeHours;
  if (body.lopDays != null) payload.lop_days = body.lopDays;
  if (body.bonus != null) payload.bonus = body.bonus;
  if (body.latePenalty != null) payload.late_penalty = body.latePenalty;
  if (body.overtimeAmount != null) payload.overtime_amount = body.overtimeAmount;
  if (body.advanceDeduction != null) payload.advance_deduction = body.advanceDeduction;
  if (body.mediclaimDeduction != null) payload.mediclaim_deduction = body.mediclaimDeduction;
  if (body.paymentMode != null) payload.payment_mode = body.paymentMode;
  if (body.paymentRef != null) payload.payment_ref = body.paymentRef;
  if (body.note != null) payload.note = body.note;
  try {
    const data = await authJson<EntryOut>(token, `/hrms/payroll/runs/${runId}/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return toUiEntry(data);
  } catch (e) {
    rethrow(e, 'Failed to update payroll entry');
  }
}

export async function payPayrollEntry(
  token: string,
  runId: number,
  entryId: number,
  body?: { paymentMode?: PaymentMode; paymentDate?: string; paymentRef?: string },
): Promise<PayEntry> {
  const payload: Record<string, unknown> = {};
  if (body?.paymentMode) payload.payment_mode = body.paymentMode;
  if (body?.paymentDate) payload.payment_date = body.paymentDate;
  if (body?.paymentRef != null) payload.payment_ref = body.paymentRef;
  try {
    const data = await authJson<EntryOut>(token, `/hrms/payroll/runs/${runId}/entries/${entryId}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return toUiEntry(data);
  } catch (e) {
    rethrow(e, 'Failed to pay payroll entry');
  }
}

export async function getPayrollEntry(token: string, runId: number, entryId: number): Promise<PayEntry> {
  try {
    const data = await authJson<EntryOut>(token, `/hrms/payroll/runs/${runId}/entries/${entryId}`);
    return toUiEntry(data);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load payslip'));
  }
}

export async function getMyPayslips(token: string): Promise<PayEntry[]> {
  try {
    const data = await authJson<EntryOut[]>(token, '/hrms/payroll/me');
    return data.map(toUiEntry);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load your payslips'));
  }
}

export async function getPayrollSummary(token: string): Promise<PayrollSummary> {
  try {
    const data = await authJson<SummaryOut>(token, '/hrms/payroll/summary');
    return {
      runs: data.runs,
      draft: data.draft,
      calculated: data.calculated,
      approved: data.approved,
      paid: data.paid,
      structures: data.structures,
      activeStructures: data.active_structures,
      totalNetPaid: data.total_net_paid,
    };
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load payroll summary'));
  }
}
