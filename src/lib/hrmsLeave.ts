/**
 * HRMS Leave — types, policies, periods, holidays, assignments, allocations, requests API client.
 * Backend endpoints under /hrms/leave
 */
import { getApiError, getBaseUrl, notifyIfUnauthorized, normalizeFetchError } from './api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LeaveTypeOut {
  id: number;
  name: string;
  leave_code: string | null;
  days_per_year: number;
  carry_forward: boolean;
  max_carry_forward_leaves: number;
  carry_forward_expiry_days: number;
  allow_leave_after_days: number;
  max_consecutive_leaves: number;
  is_leave_without_pay: boolean;
  is_partially_paid_leave: boolean;
  is_optional_leave: boolean;
  allow_negative_balance: boolean;
  allow_over_allocating: boolean;
  include_holidays_as_leaves: boolean;
  is_compensatory: boolean;
  enable_earned_leave: boolean;
  earned_leave_frequency: string | null;
  allocate_on_date: string | null;
  allocate_on_custom_date: string | null;
  allow_encashment: boolean;
  max_encashable_days: number;
  encashment_rate_percent: number;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface LeaveEntitlementOut {
  id: number;
  leave_type_id: number;
  leave_type_name: string | null;
  leave_code: string | null;
  days: number;
  carry_forward: boolean;
  max_continuous: number;
  description: string;
}

export interface LeavePolicyOut {
  id: number;
  name: string;
  description: string;
  effective_date: string;
  max_paid_leaves?: number;
  max_unpaid_leaves?: number;
  status: 'active' | 'inactive';
  entitlements: LeaveEntitlementOut[];
  created_at: string;
  updated_at: string;
}

export interface MyPolicyOut {
  has_policy: boolean;
  policy_id?: number;
  policy_name?: string;
  description?: string;
  max_paid_leaves?: number;
  max_unpaid_leaves?: number;
  effective_date?: string;
  period_label?: string;
  entitlements: LeaveEntitlementOut[];
}

export interface HolidayOut {
  id: number;
  name: string;
  date: string;
}

export interface HolidayListOut {
  id: number;
  name: string;
  from_date: string;
  to_date: string;
  holidays: HolidayOut[];
  created_at: string;
  updated_at: string;
}

export interface LeavePeriodOut {
  id: number;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  holiday_list_id: number | null;
  holiday_list_name: string | null;
  holidays: HolidayOut[];
  created_at: string;
  updated_at: string;
}

export interface LeavePolicyAssignmentOut {
  id: number;
  policy_id: number;
  policy_name: string | null;
  user_id: number;
  employee_name: string | null;
  employee_email: string | null;
  assign_basis: string;
  period_id: number | null;
  period_label: string | null;
  start_date: string;
  end_date: string;
  carry_over_unused: boolean;
  status?: 'active' | 'inactive' | 'discontinued';
  entitlements?: LeaveEntitlementOut[];
  created_at: string;
  updated_at: string;
}

export interface LeaveAllocationOut {
  id: number;
  user_id: number;
  employee_name: string | null;
  employee_email: string | null;
  leave_type_id: number;
  leave_type_name: string | null;
  policy_id: number | null;
  policy_name: string | null;
  total_days: number;
  carry_forward_days: number;
  effective_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestOut {
  id: number;
  user_id: number;
  employee_name: string | null;
  employee_email: string | null;
  leave_type_id: number;
  leave_type_name: string | null;
  leave_code: string | null;
  start_date: string;
  end_date: string;
  days: number;
  is_informed?: boolean;
  is_emergency?: boolean;
  paid_days?: number;
  lwp_days?: number;
  planned_days?: number;
  unplanned_days?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approval_notes: string | null;
  resolved_by: number | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  applied_on: string;
  created_at: string;
  updated_at: string;
}

export interface LeavePreviewOut {
  total_days: number;
  paid_days: number;
  lwp_days: number;
  planned_days: number;
  unplanned_days: number;
  leave_type_name: string;
  breakdown_message: string;
}

export interface LeaveBalanceOut {
  leave_type_id: number;
  leave_type_name: string;
  leave_code: string;
  total: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface LeaveSummaryOut {
  pending: number;
  approved: number;
  rejected: number;
  types: number;
  policies: number;
  periods: number;
}

// ── API Functions ─────────────────────────────────────────────────────────

async function leaveFetch<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${getBaseUrl()}${path}`, { ...options, headers });
    notifyIfUnauthorized(res, Boolean(token));
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(getApiError(errData, `Request failed with status ${res.status}`));
    }
    if (res.status === 204) return {} as T;
    return await res.json();
  } catch (err) {
    throw new Error(normalizeFetchError(err, 'Failed to perform leave operation'));
  }
}

// ── Leave Types API ───────────────────────────────────────────────────────

export async function listLeaveTypes(token: string, status?: string, q?: string): Promise<LeaveTypeOut[]> {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (q) params.append('q', q);
  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await leaveFetch<LeaveTypeOut[] | { items: LeaveTypeOut[] }>(token, `/hrms/leave/types${query}`);
  return Array.isArray(data) ? data : data.items || [];
}

export async function getLeaveType(token: string, typeId: number): Promise<LeaveTypeOut> {
  return leaveFetch<LeaveTypeOut>(token, `/hrms/leave/types/${typeId}`);
}

export async function createLeaveType(token: string, body: Partial<LeaveTypeOut>): Promise<LeaveTypeOut> {
  return leaveFetch<LeaveTypeOut>(token, '/hrms/leave/types', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateLeaveType(token: string, typeId: number, body: Partial<LeaveTypeOut>): Promise<LeaveTypeOut> {
  return leaveFetch<LeaveTypeOut>(token, `/hrms/leave/types/${typeId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteLeaveType(token: string, typeId: number): Promise<void> {
  await leaveFetch<void>(token, `/hrms/leave/types/${typeId}`, { method: 'DELETE' });
}

// ── Leave Policies API ────────────────────────────────────────────────────

export async function getMyPolicy(token: string): Promise<MyPolicyOut> {
  return leaveFetch<MyPolicyOut>(token, '/hrms/leave/my-policy');
}

export async function listLeavePolicies(token: string, status?: string): Promise<LeavePolicyOut[]> {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const data = await leaveFetch<LeavePolicyOut[] | { items: LeavePolicyOut[] }>(token, `/hrms/leave/policies${query}`);
  return Array.isArray(data) ? data : data.items || [];
}

export async function getLeavePolicy(token: string, policyId: number): Promise<LeavePolicyOut> {
  return leaveFetch<LeavePolicyOut>(token, `/hrms/leave/policies/${policyId}`);
}

export async function createLeavePolicy(token: string, body: {
  name: string;
  description?: string;
  effective_date: string;
  max_paid_leaves?: number;
  max_unpaid_leaves?: number;
  status?: string;
  entitlements?: { leave_type_id: number; days: number; carry_forward?: boolean; max_continuous?: number; description?: string }[];
}): Promise<LeavePolicyOut> {
  return leaveFetch<LeavePolicyOut>(token, '/hrms/leave/policies', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateLeavePolicy(token: string, policyId: number, body: Partial<{
  name: string;
  description: string;
  effective_date: string;
  max_paid_leaves: number;
  max_unpaid_leaves: number;
  status: string;
  entitlements: { leave_type_id: number; days: number; carry_forward?: boolean; max_continuous?: number; description?: string }[];
}>): Promise<LeavePolicyOut> {
  return leaveFetch<LeavePolicyOut>(token, `/hrms/leave/policies/${policyId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteLeavePolicy(token: string, policyId: number): Promise<void> {
  await leaveFetch<void>(token, `/hrms/leave/policies/${policyId}`, { method: 'DELETE' });
}

// ── Leave Periods API ─────────────────────────────────────────────────────

export async function listLeavePeriods(token: string): Promise<LeavePeriodOut[]> {
  const data = await leaveFetch<LeavePeriodOut[] | { items: LeavePeriodOut[] }>(token, '/hrms/leave/periods');
  return Array.isArray(data) ? data : data.items || [];
}

export async function getLeavePeriod(token: string, periodId: number): Promise<LeavePeriodOut> {
  return leaveFetch<LeavePeriodOut>(token, `/hrms/leave/periods/${periodId}`);
}

export async function createLeavePeriod(token: string, body: {
  label: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  holiday_list_id?: number | null;
}): Promise<LeavePeriodOut> {
  return leaveFetch<LeavePeriodOut>(token, '/hrms/leave/periods', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateLeavePeriod(token: string, periodId: number, body: Partial<{
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  holiday_list_id: number | null;
}>): Promise<LeavePeriodOut> {
  return leaveFetch<LeavePeriodOut>(token, `/hrms/leave/periods/${periodId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteLeavePeriod(token: string, periodId: number): Promise<void> {
  await leaveFetch<void>(token, `/hrms/leave/periods/${periodId}`, { method: 'DELETE' });
}

// ── Holiday Lists API ─────────────────────────────────────────────────────

export async function listHolidayLists(token: string): Promise<HolidayListOut[]> {
  const data = await leaveFetch<HolidayListOut[] | { items: HolidayListOut[] }>(token, '/hrms/leave/holiday-lists');
  return Array.isArray(data) ? data : data.items || [];
}

export async function getHolidayList(token: string, listId: number): Promise<HolidayListOut> {
  return leaveFetch<HolidayListOut>(token, `/hrms/leave/holiday-lists/${listId}`);
}

export async function createHolidayList(token: string, body: {
  name: string;
  from_date?: string;
  to_date?: string;
  holidays?: { name: string; date: string }[];
}): Promise<HolidayListOut> {
  return leaveFetch<HolidayListOut>(token, '/hrms/leave/holiday-lists', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateHolidayList(token: string, holidayListId: number, body: {
  name?: string;
  from_date?: string;
  to_date?: string;
  holidays?: { name: string; date: string }[];
}): Promise<HolidayListOut> {
  return leaveFetch<HolidayListOut>(token, `/hrms/leave/holiday-lists/${holidayListId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteHolidayList(token: string, holidayListId: number): Promise<void> {
  await leaveFetch<void>(token, `/hrms/leave/holiday-lists/${holidayListId}`, { method: 'DELETE' });
}

// ── Policy Assignments API ────────────────────────────────────────────────

export async function listLeavePolicyAssignments(token: string, userId?: number): Promise<LeavePolicyAssignmentOut[]> {
  const query = userId ? `?user_id=${userId}` : '';
  const data = await leaveFetch<LeavePolicyAssignmentOut[] | { items: LeavePolicyAssignmentOut[] }>(token, `/hrms/leave/policy-assignments${query}`);
  return Array.isArray(data) ? data : data.items || [];
}

export async function createLeavePolicyAssignment(token: string, body: {
  policy_id: number;
  user_id: number;
  assign_basis?: string;
  period_id?: number | null;
  start_date: string;
  end_date: string;
  carry_over_unused?: boolean;
}): Promise<LeavePolicyAssignmentOut> {
  return leaveFetch<LeavePolicyAssignmentOut>(token, '/hrms/leave/policy-assignments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getLeavePolicyAssignment(token: string, assignmentId: number): Promise<LeavePolicyAssignmentOut> {
  return leaveFetch<LeavePolicyAssignmentOut>(token, `/hrms/leave/policy-assignments/${assignmentId}`);
}

export async function updateLeavePolicyAssignment(
  token: string,
  assignmentId: number,
  body: Partial<{ user_id: number; policy_id: number; period_id: number; start_date: string; end_date: string; status: string }>
): Promise<LeavePolicyAssignmentOut> {
  return leaveFetch<LeavePolicyAssignmentOut>(token, `/hrms/leave/policy-assignments/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteLeavePolicyAssignment(token: string, assignmentId: number): Promise<void> {
  await leaveFetch<void>(token, `/hrms/leave/policy-assignments/${assignmentId}`, { method: 'DELETE' });
}

// ── Leave Allocations API ─────────────────────────────────────────────────

export async function listLeaveAllocations(token: string, userId?: number): Promise<LeaveAllocationOut[]> {
  const query = userId ? `?user_id=${userId}` : '';
  const data = await leaveFetch<LeaveAllocationOut[] | { items: LeaveAllocationOut[] }>(token, `/hrms/leave/allocations${query}`);
  return Array.isArray(data) ? data : data.items || [];
}

export async function createLeaveAllocation(token: string, body: {
  user_id: number;
  leave_type_id: number;
  policy_id?: number | null;
  total_days: number;
  carry_forward_days?: number;
  effective_date: string;
  notes?: string;
}): Promise<LeaveAllocationOut> {
  return leaveFetch<LeaveAllocationOut>(token, '/hrms/leave/allocations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteLeaveAllocation(token: string, allocationId: number): Promise<void> {
  await leaveFetch<void>(token, `/hrms/leave/allocations/${allocationId}`, { method: 'DELETE' });
}

// ── Leave Requests API ────────────────────────────────────────────────────

export async function listLeaveRequests(token: string, status?: string): Promise<LeaveRequestOut[]> {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const data = await leaveFetch<LeaveRequestOut[] | { items: LeaveRequestOut[] }>(token, `/hrms/leave/requests${query}`);
  return Array.isArray(data) ? data : data.items || [];
}

export async function previewLeaveRequest(token: string, body: {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  is_informed?: boolean;
  is_emergency?: boolean;
}): Promise<LeavePreviewOut> {
  return leaveFetch<LeavePreviewOut>(token, '/hrms/leave/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createLeaveRequest(token: string, body: {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
  is_informed?: boolean;
  is_emergency?: boolean;
}): Promise<LeaveRequestOut> {
  return leaveFetch<LeaveRequestOut>(token, '/hrms/leave/requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function approveLeaveRequest(token: string, requestId: number, comment?: string, is_emergency?: boolean): Promise<LeaveRequestOut> {
  return leaveFetch<LeaveRequestOut>(token, `/hrms/leave/requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comment, is_emergency }),
  });
}

export async function rejectLeaveRequest(token: string, requestId: number, comment?: string): Promise<LeaveRequestOut> {
  return leaveFetch<LeaveRequestOut>(token, `/hrms/leave/requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify(comment ? { comment } : {}),
  });
}

// ── Leave Balances & Summary API ──────────────────────────────────────────

export async function getLeaveBalances(token: string, userId?: number): Promise<LeaveBalanceOut[]> {
  const query = userId ? `?user_id=${userId}` : '';
  return leaveFetch<LeaveBalanceOut[]>(token, `/hrms/leave/balances${query}`);
}

export async function getMyLeaveBalances(token: string): Promise<LeaveBalanceOut[]> {
  return leaveFetch<LeaveBalanceOut[]>(token, '/hrms/leave/balances/me');
}

export async function listMyLeaveRequests(token: string, status?: string): Promise<LeaveRequestOut[]> {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const data = await leaveFetch<LeaveRequestOut[] | { items: LeaveRequestOut[] }>(token, `/hrms/leave/requests/me${query}`);
  return Array.isArray(data) ? data : data.items || [];
}

export async function withdrawLeaveRequest(token: string, requestId: number): Promise<void> {
  await leaveFetch<void>(token, `/hrms/leave/requests/${requestId}`, { method: 'DELETE' });
}

export async function getLeaveSummary(token: string): Promise<LeaveSummaryOut> {
  return leaveFetch<LeaveSummaryOut>(token, '/hrms/leave/summary');
}
