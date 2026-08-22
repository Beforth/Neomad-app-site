/**
 * HRMS Attendance API client.
 * All functions follow the same fetch + Bearer token pattern used across this project.
 * Base URL comes from getBaseUrl() in api.ts (VITE_API_BASE_URL env var).
 */
import { getBaseUrl, notifyIfUnauthorized, normalizeFetchError } from './api';

// ── Types (mirror backend schemas/hrms.py) ────────────────────────────────

export interface AttendanceRecordOut {
  id: number;
  user_id: number;
  staff_name: string | null;
  staff_email: string | null;
  date: string;          // "YYYY-MM-DD"
  check_in: string | null;   // "HH:MM"
  check_out: string | null;  // "HH:MM"
  status: 'present' | 'absent' | 'late' | 'half_day' | 'overtime';
  hours_worked: number;
  overtime: number;
  penalty_amount?: number;
  overtime_amount?: number;
  shift_start: string | null;
  shift_end: string | null;
  punch_in_lat?: number | null;
  punch_in_lng?: number | null;
  distance_from_office: number | null;
  punch_photo: string | null;
  marked_by: number | null;
  marked_by_name: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummaryOut {
  total_staff: number;
  present_today: number;
  absent_today: number;
}

export interface AttendanceMySummaryOut {
  attendance_rate: number;
  hours_worked_month: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_days: number;
  overtime_hours: number;
}

export type AttendanceRequestType = 'regularization' | 'half_day' | 'full_day_change';

export interface AttendanceRequestOut {
  id: number;
  user_id: number;
  employee_username: string | null;
  employee_email: string | null;
  from_date: string;   // "YYYY-MM-DD"
  to_date: string;     // "YYYY-MM-DD"
  days: number;
  request_type: AttendanceRequestType;
  from_time: string | null;   // "HH:MM"
  to_time: string | null;     // "HH:MM"
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  resolved_at: string | null;
  resolved_by: number | null;
  resolved_by_name: string | null;
  notes: string | null;
}

export interface AttendanceRequestCreateBody {
  from_date: string;
  to_date: string;
  reason?: string;
  request_type?: AttendanceRequestType;
  from_time?: string;
  to_time?: string;
}

export interface AttendanceRequestEditBody {
  from_date?: string;
  to_date?: string;
  reason?: string;
  request_type?: AttendanceRequestType;
  from_time?: string | null;
  to_time?: string | null;
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

export interface PunchBody {
  mode: 'in' | 'out';
  staff_id?: number;
  date?: string;             // "YYYY-MM-DD"
  time?: string;             // "HH:MM" — optional override; defaults to server now
  lat?: number;
  lng?: number;
  distance_from_office?: number;
  punch_photo?: string;      // base64 dataURL
}

export interface AttendanceMarkBody {
  check_in?: string | null;
  check_out?: string | null;
  shift_start?: string | null;
  shift_end?: string | null;
  status?: 'present' | 'absent' | 'late' | 'half_day' | 'overtime' | null;
}

export interface AttendanceRecordsParams {
  from_date?: string;   // "YYYY-MM-DD"
  to_date?: string;     // "YYYY-MM-DD"
  status_?: string;
  staff_id?: number;
}

export interface HrmsSettingsUpdateBody {
  office_name?: string;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  late_entry_grace_minutes?: number;
  early_exit_grace_minutes?: number;
  half_day_threshold_hours?: number;
  absent_threshold_hours?: number;
  overtime_calculation?: boolean;
  overtime_shift_type_ids?: number[];
  begin_check_in_before_shift_start?: boolean;
  default_shift_type_id?: number;
}

// ── Helper ────────────────────────────────────────────────────────────────

async function apiError(res: Response): Promise<Error> {
  notifyIfUnauthorized(res, true);
  const body = await res.json().catch(() => ({})) as { detail?: string };
  const msg = typeof body.detail === 'string' ? body.detail : `Request failed: ${res.status}`;
  return new Error(msg);
}

// ── Attendance records ────────────────────────────────────────────────────

/**
 * Admin/manager: list all staff attendance records.
 * Staff: returns only their own (backend enforces this).
 */
export async function getAttendanceRecords(
  token: string,
  params?: AttendanceRecordsParams,
): Promise<AttendanceRecordOut[]> {
  const base = getBaseUrl();
  const qs = new URLSearchParams();
  if (params?.from_date) qs.set('from_date', params.from_date);
  if (params?.to_date) qs.set('to_date', params.to_date);
  if (params?.status_) qs.set('status_', params.status_);
  if (params?.staff_id != null) qs.set('staff_id', String(params.staff_id));
  const url = `${base}/hrms/attendance/records${qs.toString() ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<AttendanceRecordOut[]>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to load attendance records'));
  }
}

/** Current user's own attendance records. */
export async function getMyAttendanceRecords(
  token: string,
  params?: { from_date?: string; to_date?: string },
): Promise<AttendanceRecordOut[]> {
  const base = getBaseUrl();
  const qs = new URLSearchParams();
  if (params?.from_date) qs.set('from_date', params.from_date);
  if (params?.to_date) qs.set('to_date', params.to_date);
  const url = `${base}/hrms/attendance/records/me${qs.toString() ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<AttendanceRecordOut[]>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to load your attendance records'));
  }
}

/** Punch in or out. Returns the updated attendance record. */
export async function punchAttendance(
  token: string,
  body: PunchBody,
): Promise<AttendanceRecordOut> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/hrms/attendance/punch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<AttendanceRecordOut>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Punch failed'));
  }
}

/** Admin/manager creates or corrects a staff attendance record for a specific date. */
export async function markAttendanceRecord(
  token: string,
  staffId: number,
  recordDate: string,
  body: AttendanceMarkBody,
): Promise<AttendanceRecordOut> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/hrms/attendance/records/${staffId}/${recordDate}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<AttendanceRecordOut>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to mark attendance record'));
  }
}

/** Today's headcount summary: total staff, present, absent. */
export async function getAttendanceSummary(token: string): Promise<AttendanceSummaryOut> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/hrms/attendance/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<AttendanceSummaryOut>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to load attendance summary'));
  }
}

/** Personal attendance stats for the current month. */
export async function getMyAttendanceSummary(token: string): Promise<AttendanceMySummaryOut> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/hrms/attendance/my-summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<AttendanceMySummaryOut>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to load your attendance summary'));
  }
}

// ── Attendance requests ───────────────────────────────────────────────────

/** List regularization requests. Admin sees all; staff sees only their own. */
export async function getAttendanceRequests(
  token: string,
  params?: { status_?: string },
): Promise<AttendanceRequestOut[]> {
  const base = getBaseUrl();
  const qs = new URLSearchParams();
  if (params?.status_) qs.set('status_', params.status_);
  const url = `${base}/hrms/attendance/requests${qs.toString() ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<AttendanceRequestOut[]>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to load attendance requests'));
  }
}

/** Staff submits a regularization / half-day / full-day-change request. */
export async function createAttendanceRequest(
  token: string,
  body: AttendanceRequestCreateBody,
): Promise<AttendanceRequestOut> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/hrms/attendance/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<AttendanceRequestOut>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to submit attendance request'));
  }
}

/** Admin/manager edits a user's submitted request. */
export async function editAttendanceRequest(
  token: string,
  requestId: number,
  body: AttendanceRequestEditBody,
): Promise<AttendanceRequestOut> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/hrms/attendance/requests/${requestId}/edit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<AttendanceRequestOut>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to edit attendance request'));
  }
}

/** Admin/manager approves or rejects a regularization request. */
export async function resolveAttendanceRequest(
  token: string,
  requestId: number,
  body: { status: 'approved' | 'rejected'; notes?: string },
): Promise<AttendanceRequestOut> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/hrms/attendance/requests/${requestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<AttendanceRequestOut>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to resolve attendance request'));
  }
}

// ── HRMS Settings ─────────────────────────────────────────────────────────

/** Get HRMS office/attendance settings. */
export async function getHrmsSettings(token: string): Promise<HrmsSettingsOut> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/hrms/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<HrmsSettingsOut>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to load HRMS settings'));
  }
}

/** Admin/manager updates HRMS office/attendance settings. */
export async function updateHrmsSettings(
  token: string,
  body: HrmsSettingsUpdateBody,
): Promise<HrmsSettingsOut> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/hrms/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await apiError(res);
    return res.json() as Promise<HrmsSettingsOut>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e;
    throw new Error(normalizeFetchError(e, 'Failed to update HRMS settings'));
  }
}
