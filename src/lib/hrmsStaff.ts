/**
 * HRMS staff (employee master) and department API client.
 *
 * Talks to `/hrms/staff` and `/hrms/departments`, which carry the full employee
 * record. The older `/users` endpoints in `api.ts` only cover login-level fields.
 */
import { getBaseUrl, notifyIfUnauthorized, normalizeFetchError } from './api';
import type { Paged } from '../hooks/useListControls';

export type Gender = 'male' | 'female' | 'other';

export interface StaffReference {
  id?: number;
  name: string;
  contact_number?: string | null;
  country_code?: string | null;
}

/** Employee-master fields shared by create, update and read. */
export interface StaffProfile {
  display_name?: string | null;
  country_code?: string | null;
  gender?: Gender | null;
  employee_type?: string | null;
  designation?: string | null;
  department_id?: number | null;
  master_branch_id?: number | null;
  punch_branch_ids?: number[] | null;
  door_lock_permission?: boolean | null;
  date_of_joining?: string | null;
  date_of_birth?: string | null;
  address?: string | null;

  pf_number?: string | null;
  uan_number?: string | null;
  esic_number?: string | null;
  aadhaar_number?: string | null;

  salary_type?: string | null;
  monthly_salary?: number | null;
  payroll_group?: string | null;

  bank_name?: string | null;
  bank_branch_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;

  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_country_code?: string | null;
  emergency_contact_relation?: string | null;
  emergency_contact_address?: string | null;
}

export interface StaffOut extends StaffProfile {
  id: number;
  email: string;
  employee_code?: string | null;
  full_name?: string | null;
  phone?: string | null;
  department_name?: string | null;
  master_branch_name?: string | null;
  is_active: boolean;
  role_codes: string[];
  references: StaffReference[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface StaffCreateBody extends StaffProfile {
  email: string;
  password: string;
  employee_code?: string | null;
  full_name?: string | null;
  phone?: string | null;
  references?: StaffReference[];
  role_code: string;
}

export type StaffUpdateBody = Partial<Omit<StaffCreateBody, 'password' | 'role_code'>> & {
  role_code?: string;
  is_active?: boolean;
};

export interface DepartmentOut {
  id: number;
  name: string;
  is_active: boolean;
  employee_count: number;
  created_at?: string | null;
}

async function apiError(res: Response): Promise<Error> {
  notifyIfUnauthorized(res, true);
  let detail = res.statusText || 'Request failed';
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') detail = body.detail;
    else if (Array.isArray(body?.detail) && body.detail[0]?.msg) detail = body.detail[0].msg;
  } catch {
    /* non-JSON error body */
  }
  return new Error(detail);
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

// ── Staff ─────────────────────────────────────────────────────────────────

export async function listStaff(
  token: string,
  params?: { search?: string; role_code?: string; is_active?: boolean },
): Promise<StaffOut[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.role_code) qs.set('role_code', params.role_code);
  if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active));
  const q = qs.toString() ? `?${qs}` : '';
  try {
    const data = await authJson<StaffOut[] | { items: StaffOut[] }>(token, `/hrms/staff${q}`);
    return Array.isArray(data) ? data : data.items ?? [];
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to load staff'));
  }
}

export async function getStaff(token: string, staffId: number): Promise<StaffOut> {
  try {
    return await authJson<StaffOut>(token, `/hrms/staff/${staffId}`);
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to load staff member'));
  }
}

export async function createStaff(token: string, body: StaffCreateBody): Promise<StaffOut> {
  try {
    return await authJson<StaffOut>(token, '/hrms/staff', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to create staff'));
  }
}

export async function updateStaff(
  token: string,
  staffId: number,
  body: StaffUpdateBody,
): Promise<StaffOut> {
  try {
    return await authJson<StaffOut>(token, `/hrms/staff/${staffId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to update staff'));
  }
}

// ── Departments ───────────────────────────────────────────────────────────

export interface DepartmentListParams {
  search?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

/** Returns the paginated envelope when `page` is given, otherwise a plain list. */
export async function listDepartments(
  token: string,
  params?: DepartmentListParams,
): Promise<DepartmentOut[] | Paged<DepartmentOut>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active));
  if (params?.sort_by) qs.set('sort_by', params.sort_by);
  if (params?.sort_order) qs.set('sort_order', params.sort_order);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.page_size != null) qs.set('page_size', String(params.page_size));
  const q = qs.toString() ? `?${qs}` : '';
  try {
    return await authJson<DepartmentOut[] | Paged<DepartmentOut>>(token, `/hrms/departments${q}`);
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to load departments'));
  }
}

export async function createDepartment(token: string, name: string): Promise<DepartmentOut> {
  try {
    return await authJson<DepartmentOut>(token, '/hrms/departments', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to create department'));
  }
}

export async function updateDepartment(
  token: string,
  departmentId: number,
  body: { name?: string; is_active?: boolean },
): Promise<DepartmentOut> {
  try {
    return await authJson<DepartmentOut>(token, `/hrms/departments/${departmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to update department'));
  }
}

export async function deleteDepartment(token: string, departmentId: number): Promise<void> {
  try {
    await authJson<void>(token, `/hrms/departments/${departmentId}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to delete department'));
  }
}

export const DOC_TYPES = [
  { value: 'aadhaar_front', label: 'Aadhaar Card', side: 'Front Side' },
  { value: 'aadhaar_back', label: 'Aadhaar Card', side: 'Back Side' },
  { value: 'driving_licence_front', label: 'Driving Licence', side: 'Front Side' },
  { value: 'driving_licence_back', label: 'Driving Licence', side: 'Back Side' },
  { value: 'pan_card', label: 'PAN Card', side: null },
  { value: 'passport_photo', label: 'Passport Size Photo', side: null },
] as const;

export type DocType = (typeof DOC_TYPES)[number]['value'];

export interface StaffDocument {
  id: number;
  doc_type: DocType;
  original_name: string | null;
  content_type: string;
  size_bytes: number;
  url: string;
  uploaded_at?: string | null;
}

export async function listStaffDocuments(token: string, staffId: number): Promise<StaffDocument[]> {
  try {
    return await authJson<StaffDocument[]>(token, `/hrms/staff/${staffId}/documents`);
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to load documents'));
  }
}

/** Upload or replace one document slot. Images max 10 MB, PDFs max 1 MB. */
export async function uploadStaffDocument(
  token: string, staffId: number, docType: DocType, file: File,
): Promise<StaffDocument> {
  const base = getBaseUrl();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${base}/hrms/staff/${staffId}/documents?doc_type=${docType}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw await apiError(res);
  return res.json() as Promise<StaffDocument>;
}

export async function deleteStaffDocument(
  token: string, staffId: number, documentId: number,
): Promise<void> {
  try {
    await authJson<void>(token, `/hrms/staff/${staffId}/documents/${documentId}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to delete document'));
  }
}

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const EMPLOYEE_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

/** Country dial codes offered on phone fields. */
export const COUNTRY_CODES = ['+91', '+1', '+44', '+61', '+971', '+65'];

export const SALARY_TYPE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'compliance', label: 'Compliance' },
];

export const PAYROLL_GROUP_OPTIONS = [
  'Monthly Payroll (No Compliance)',
  'Monthly Payroll (With Compliance)',
  'Hourly Payroll',
];
