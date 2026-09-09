/**
 * HRMS Shifts — types, settings, assignments, calendar API client.
 * Backend: /hrms/shifts, /hrms/shifts/assignments, /hrms/settings
 */
import { getBaseUrl, notifyIfUnauthorized, normalizeFetchError } from './api';
import type { ShiftType, ShiftAssignment, ShiftSettings, DailyShiftAllocation } from './api';
import { DEFAULT_SHIFT_SETTINGS, ALL_DAYS } from './api';

export type { ShiftType, ShiftAssignment, ShiftSettings, DailyShiftAllocation };
export { DEFAULT_SHIFT_SETTINGS, ALL_DAYS };

// ── API types ─────────────────────────────────────────────────────────────

export interface ShiftTypeOut {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  color: string | null;
  is_active: boolean;
  late_grace_enabled?: boolean;
  late_grace_minutes?: number;
  late_penalty_amount?: number;
  half_day_after_minutes?: number;
  overtime_enabled?: boolean;
  overtime_after_minutes?: number;
  overtime_rate?: number;
  overtime_rate_per_hour?: number;
  created_at: string;
  updated_at: string;
}

export interface ShiftTypeCreateBody {
  name: string;
  start_time: string;
  end_time: string;
  break_start?: string | null;
  break_end?: string | null;
  color?: string | null;
  is_active?: boolean;
  late_grace_enabled?: boolean;
  late_grace_minutes?: number;
  late_penalty_amount?: number;
  half_day_after_minutes?: number;
  overtime_enabled?: boolean;
  overtime_after_minutes?: number;
  overtime_rate?: number;
  overtime_rate_per_hour?: number;
}

export interface ShiftTypeUpdateBody {
  name?: string;
  start_time?: string;
  end_time?: string;
  break_start?: string | null;
  break_end?: string | null;
  color?: string | null;
  is_active?: boolean;
  late_grace_enabled?: boolean;
  late_grace_minutes?: number;
  late_penalty_amount?: number;
  half_day_after_minutes?: number;
  overtime_enabled?: boolean;
  overtime_after_minutes?: number;
  overtime_rate?: number;
  overtime_rate_per_hour?: number;
}

export interface ShiftAssignmentOut {
  id: number;
  staff_id: number;
  staff_name: string | null;
  shift_type_id: number;
  shift_type_name: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location: string;
  status: string;
  schedule_type: string;
  frequency_weeks: number;
  working_days: string[];
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignmentCreateBody {
  staff_id: number;
  shift_type_id: number;
  location?: string;
  status?: string;
  schedule_type?: string;
  frequency_weeks?: number;
  working_days?: string[];
  effective_from: string;
  effective_to?: string | null;
  is_active?: boolean;
}

export interface ShiftAssignmentUpdateBody {
  staff_id?: number;
  shift_type_id?: number;
  location?: string;
  status?: string;
  schedule_type?: string;
  frequency_weeks?: number;
  working_days?: string[];
  effective_from?: string;
  effective_to?: string | null;
  is_active?: boolean;
}

export interface ShiftConflictOut {
  conflicts: ShiftAssignmentOut[];
  count: number;
}

export interface ShiftAssignmentReplaceBody extends ShiftAssignmentCreateBody {
  cancel_ids: number[];
}

export interface ShiftCalendarDayOut {
  assignment_id: number;
  staff_id: number;
  staff_name: string | null;
  date: string;
  shift_type_id: number;
  shift_type_name: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location: string;
  status: string;
}

export interface HrmsSettingsOut {
  id: number;
  office_name: string;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  late_entry_grace_minutes: number;
  early_exit_grace_minutes: number;
  half_day_threshold_hours: number;
  absent_threshold_hours: number;
  overtime_calculation: boolean;
  overtime_shift_type_ids: number[];
  begin_check_in_before_shift_start: boolean;
  default_shift_type_id: number | null;
}

export interface HrmsSettingsUpdateBody {
  office_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number;
  late_entry_grace_minutes?: number;
  early_exit_grace_minutes?: number;
  half_day_threshold_hours?: number;
  absent_threshold_hours?: number;
  overtime_calculation?: boolean;
  overtime_shift_type_ids?: number[];
  begin_check_in_before_shift_start?: boolean;
  default_shift_type_id?: number | null;
}

// ── Mappers ───────────────────────────────────────────────────────────────

export function toUiShiftType(api: ShiftTypeOut): ShiftType {
  return {
    id: api.id,
    name: api.name,
    start_time: api.start_time,
    end_time: api.end_time,
    break_start: api.break_start || '',
    break_end: api.break_end || '',
    color: api.color || '',
    is_active: api.is_active,
    late_grace_enabled: api.late_grace_enabled ?? true,
    late_grace_minutes: api.late_grace_minutes ?? 15,
    late_penalty_amount: api.late_penalty_amount ?? 100,
    half_day_after_minutes: api.half_day_after_minutes ?? 30,
    overtime_enabled: api.overtime_enabled ?? false,
    overtime_after_minutes: api.overtime_after_minutes ?? 15,
    overtime_rate: api.overtime_rate ?? api.overtime_rate_per_hour ?? 0,
    overtime_rate_per_hour: api.overtime_rate ?? api.overtime_rate_per_hour ?? 0,
  };
}

export function toUiShiftAssignment(api: ShiftAssignmentOut): ShiftAssignment {
  return {
    id: api.id,
    staff_id: api.staff_id,
    staff_name: api.staff_name || '',
    shift_type_id: api.shift_type_id,
    shift_type_name: api.shift_type_name || '',
    start_time: api.start_time || null,
    end_time: api.end_time || null,
    location: api.location,
    status: (api.status as ShiftAssignment['status']) || 'active',
    schedule_type: (api.schedule_type as ShiftAssignment['schedule_type']) || 'fixed',
    frequency_weeks: api.frequency_weeks,
    working_days: api.working_days || [],
    effective_from: api.effective_from,
    effective_to: api.effective_to,
    is_active: api.is_active,
  };
}

export function toUiSettings(api: HrmsSettingsOut): ShiftSettings {
  return {
    lateEntryGraceMinutes: api.late_entry_grace_minutes,
    earlyExitGraceMinutes: api.early_exit_grace_minutes,
    halfDayThresholdHours: api.half_day_threshold_hours,
    absentThresholdHours: api.absent_threshold_hours,
    overtimeCalculation: api.overtime_calculation,
    overtimeShiftTypeIds: api.overtime_shift_type_ids || [],
    beginCheckInBeforeShiftStart: api.begin_check_in_before_shift_start,
    defaultShiftTypeId: api.default_shift_type_id,
  };
}

export function settingsToApi(settings: ShiftSettings): HrmsSettingsUpdateBody {
  return {
    late_entry_grace_minutes: settings.lateEntryGraceMinutes,
    early_exit_grace_minutes: settings.earlyExitGraceMinutes,
    half_day_threshold_hours: settings.halfDayThresholdHours,
    absent_threshold_hours: settings.absentThresholdHours,
    overtime_calculation: settings.overtimeCalculation,
    overtime_shift_type_ids: settings.overtimeShiftTypeIds,
    begin_check_in_before_shift_start: settings.beginCheckInBeforeShiftStart,
    default_shift_type_id: settings.defaultShiftTypeId,
  };
}

/** Calendar day → DailyShiftAllocation shape for existing Assign UI. */
export function calendarDayToAllocation(day: ShiftCalendarDayOut): DailyShiftAllocation {
  return {
    id: day.assignment_id,
    staff_id: day.staff_id,
    staff_name: day.staff_name || '',
    date: day.date,
    shift_type_id: day.shift_type_id,
    shift_type_name: day.shift_type_name || '',
    start_time: day.start_time || null,
    end_time: day.end_time || null,
    check_in: null,
    check_out: null,
    status: 'scheduled',
    late_minutes: 0,
    break_minutes: 0,
  };
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** Working-day keys present in an inclusive date range (local dates). Sunday is always excluded (weekly holiday). */
export function workingDaysInRange(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const set = new Set<string>();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) continue; // Sunday = weekly holiday
    set.add(WEEKDAY_KEYS[d.getDay()]);
  }
  return ALL_DAYS.filter((k) => k !== 'sun' && set.has(k));
}

export function formatShiftTimeRange(
  start?: string | null,
  end?: string | null,
): string {
  if (!start && !end) return '';
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
}

// ── HTTP helpers ──────────────────────────────────────────────────────────

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

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ── Shift types ───────────────────────────────────────────────────────────

export async function listShiftTypes(token: string): Promise<ShiftType[]> {
  try {
    const rows = await authJson<ShiftTypeOut[] | { items: ShiftTypeOut[] }>(token, '/hrms/shifts');
    const list = Array.isArray(rows) ? rows : (rows.items || []);
    return list.map(toUiShiftType);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load shift types'));
  }
}

export async function getShiftType(token: string, id: number): Promise<ShiftType> {
  try {
    const row = await authJson<ShiftTypeOut>(token, `/hrms/shifts/${id}`);
    return toUiShiftType(row);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load shift type'));
  }
}

export async function createShiftType(token: string, body: ShiftTypeCreateBody): Promise<ShiftType> {
  try {
    const row = await authJson<ShiftTypeOut>(token, '/hrms/shifts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return toUiShiftType(row);
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to create shift type'));
  }
}

export async function updateShiftType(
  token: string,
  id: number,
  body: ShiftTypeUpdateBody,
): Promise<ShiftType> {
  try {
    const row = await authJson<ShiftTypeOut>(token, `/hrms/shifts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return toUiShiftType(row);
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to update shift type'));
  }
}

export async function deleteShiftType(token: string, id: number): Promise<void> {
  try {
    await authJson<void>(token, `/hrms/shifts/${id}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to delete shift type'));
  }
}

// ── Assignments ───────────────────────────────────────────────────────────

export async function listShiftAssignments(
  token: string,
  params?: { staff_id?: number },
): Promise<ShiftAssignment[]> {
  try {
    const rows = await authJson<ShiftAssignmentOut[] | { items: ShiftAssignmentOut[] }>(
      token,
      `/hrms/shifts/assignments${qs(params || {})}`,
    );
    const list = Array.isArray(rows) ? rows : (rows.items || []);
    return list.map(toUiShiftAssignment);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load shift assignments'));
  }
}

export async function getShiftAssignment(token: string, id: number): Promise<ShiftAssignment> {
  try {
    const row = await authJson<ShiftAssignmentOut>(token, `/hrms/shifts/assignments/${id}`);
    return toUiShiftAssignment(row);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load shift assignment'));
  }
}

export async function createShiftAssignment(
  token: string,
  body: ShiftAssignmentCreateBody,
): Promise<ShiftAssignment> {
  try {
    const row = await authJson<ShiftAssignmentOut>(token, '/hrms/shifts/assignments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return toUiShiftAssignment(row);
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to create shift assignment'));
  }
}

export async function updateShiftAssignment(
  token: string,
  id: number,
  body: ShiftAssignmentUpdateBody,
): Promise<ShiftAssignment> {
  try {
    const row = await authJson<ShiftAssignmentOut>(token, `/hrms/shifts/assignments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return toUiShiftAssignment(row);
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to update shift assignment'));
  }
}

export async function deleteShiftAssignment(token: string, id: number): Promise<void> {
  try {
    await authJson<void>(token, `/hrms/shifts/assignments/${id}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to delete shift assignment'));
  }
}

export async function checkShiftConflicts(
  token: string,
  params: { staff_id: number; effective_from: string; effective_to?: string; exclude_id?: number },
): Promise<ShiftConflictOut> {
  try {
    return await authJson<ShiftConflictOut>(
      token,
      `/hrms/shifts/assignments/conflicts${qs(params)}`,
    );
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to check shift conflicts'));
  }
}

export async function replaceShiftAssignment(
  token: string,
  body: ShiftAssignmentReplaceBody,
): Promise<{ cancelled: number; created: ShiftAssignment }> {
  try {
    const result = await authJson<{ cancelled: number; created: ShiftAssignmentOut }>(
      token,
      '/hrms/shifts/assignments/replace',
      { method: 'POST', body: JSON.stringify(body) },
    );
    return { cancelled: result.cancelled, created: toUiShiftAssignment(result.created) };
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to replace shift assignment'));
  }
}

export async function listShiftCalendar(
  token: string,
  from_date: string,
  to_date: string,
  staff_id?: number,
): Promise<DailyShiftAllocation[]> {
  try {
    const rows = await authJson<ShiftCalendarDayOut[]>(
      token,
      `/hrms/shifts/assignments/calendar${qs({ from_date, to_date, staff_id })}`,
    );
    return rows.map(calendarDayToAllocation);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load shift calendar'));
  }
}

// ── Settings ──────────────────────────────────────────────────────────────

export async function getHrmsSettings(token: string): Promise<ShiftSettings> {
  try {
    const row = await authJson<HrmsSettingsOut>(token, '/hrms/settings');
    return toUiSettings(row);
  } catch (e) {
    throw new Error(normalizeFetchError(e, 'Failed to load HRMS settings'));
  }
}

export async function updateHrmsSettings(
  token: string,
  body: HrmsSettingsUpdateBody | ShiftSettings,
): Promise<ShiftSettings> {
  const payload =
    'lateEntryGraceMinutes' in body
      ? settingsToApi(body as ShiftSettings)
      : (body as HrmsSettingsUpdateBody);
  try {
    const row = await authJson<HrmsSettingsOut>(token, '/hrms/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return toUiSettings(row);
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.startsWith('Failed to')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to update HRMS settings'));
  }
}

