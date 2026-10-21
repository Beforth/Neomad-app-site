/**
 * HRMS export downloads: attendance and employee workbooks, expense claim PDF.
 *
 * These endpoints need an Authorization header, so a plain `<a href>` cannot be
 * used — the file is fetched as a blob and handed to a temporary link instead.
 * The upside over the old browser-side CSV builders is that the server exports
 * the whole filtered set rather than only the rows the page happens to hold.
 */
import { getBaseUrl, notifyIfUnauthorized } from './api';

export interface AttendanceExportParams {
  from_date?: string;
  to_date?: string;
  /** present | absent | late | half_day | overtime */
  status?: string;
  staff_id?: number;
  search?: string;
  /** Resolve punch coordinates into area names. Off makes the export instant. */
  include_area?: boolean;
}

export interface EmployeeExportParams {
  search?: string;
  role_code?: string;
  is_active?: boolean;
  department_id?: number;
}

export interface DownloadResult {
  filename: string;
  /** Areas that hit the lookup time budget and printed coordinates instead. */
  geocodePending: number;
}

function filenameFrom(header: string | null, fallback: string): string {
  if (!header) return fallback;
  // Prefer RFC 5987 filename*=UTF-8''… so non-ASCII names survive.
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      /* fall through to the plain filename */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : fallback;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in Safari; one tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function download(
  token: string,
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  fallbackName: string,
): Promise<DownloadResult> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const query = qs.toString();

  let res: Response;
  try {
    res = await fetch(`${getBaseUrl()}${path}${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    // The error body is JSON even though the success body is a file.
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || `Export failed (${res.status})`);
  }

  const filename = filenameFrom(res.headers.get('Content-Disposition'), fallbackName);
  saveBlob(await res.blob(), filename);
  return {
    filename,
    geocodePending: Number(res.headers.get('X-Geocode-Pending') || 0),
  };
}

/** Attendance workbook for the whole filtered range. */
export function exportAttendanceXlsx(
  token: string,
  params: AttendanceExportParams = {},
): Promise<DownloadResult> {
  const { status, ...rest } = params;
  return download(
    token,
    '/hrms/exports/attendance.xlsx',
    // The backend reads the status filter as `status_`; "all" means no filter.
    { ...rest, status_: status && status !== 'all' ? status : undefined },
    'attendance.xlsx',
  );
}

/** Full employee master as a workbook. Admin and manager only. */
export function exportEmployeesXlsx(
  token: string,
  params: EmployeeExportParams = {},
): Promise<DownloadResult> {
  return download(token, '/hrms/exports/employees.xlsx', { ...params }, 'employees.xlsx');
}

/** One expense claim: summary page, then one page per attachment. */
export function exportExpensePdf(token: string, expenseId: number): Promise<DownloadResult> {
  return download(token, `/hrms/exports/expenses/${expenseId}.pdf`, {}, `expense-${expenseId}.pdf`);
}

export type PayrollReport = 'muster-roll' | 'payment-sheet' | 'statutory' | 'department-cost' | 'designation-cost';

/** Payroll registers for one month (YYYY-MM). Needs a payroll run for that month. */
export function exportPayrollReportXlsx(
  token: string,
  month: string,
  report: PayrollReport,
): Promise<DownloadResult> {
  return download(token, `/hrms/exports/payroll/${month}/${report}.xlsx`, {}, `${report}-${month}.xlsx`);
}

/** Per-employee present / late / half-day / overtime / absent counts for a month. */
export function exportAttendanceSummaryXlsx(
  token: string,
  month: string,
  departmentId?: number,
): Promise<DownloadResult> {
  return download(
    token,
    `/hrms/exports/attendance-summary/${month}.xlsx`,
    { department_id: departmentId },
    `attendance-summary-${month}.xlsx`,
  );
}

/** Salary advances register. */
export function exportAdvancesXlsx(token: string, status?: string): Promise<DownloadResult> {
  return download(token, '/hrms/exports/advances.xlsx', { status_: status }, 'advances.xlsx');
}

/** Late arrivals, early departures and overtime against each day's shift. */
export function exportLateEarlyXlsx(
  token: string,
  fromDate: string,
  toDate: string,
  departmentId?: number,
): Promise<DownloadResult> {
  return download(
    token,
    '/hrms/exports/late-early.xlsx',
    { from_date: fromDate, to_date: toDate, department_id: departmentId },
    'late-early.xlsx',
  );
}

/** Leave allocated, taken, pending and remaining per employee and leave type (current leave period). */
export function exportLeaveBalanceXlsx(
  token: string,
  asOf?: string,
  departmentId?: number,
): Promise<DownloadResult> {
  return download(
    token,
    '/hrms/exports/leave-balance.xlsx',
    { as_of: asOf, department_id: departmentId },
    'leave-balance.xlsx',
  );
}

/** Everyone's status for one day, with a head-count summary. */
export function exportDailyAttendanceXlsx(
  token: string,
  day: string,
  departmentId?: number,
): Promise<DownloadResult> {
  return download(
    token,
    '/hrms/exports/daily-attendance.xlsx',
    { day, department_id: departmentId },
    `daily-attendance-${day}.xlsx`,
  );
}

/** Employee x day roster of assigned shifts (up to 62 days). */
export function exportShiftRosterXlsx(
  token: string,
  fromDate: string,
  toDate: string,
  departmentId?: number,
): Promise<DownloadResult> {
  return download(
    token,
    '/hrms/exports/shift-roster.xlsx',
    { from_date: fromDate, to_date: toDate, department_id: departmentId },
    'shift-roster.xlsx',
  );
}

export interface ReportTable {
  sheet: string;
  columns: string[];
  rows: (string | number | null)[][];
}

/**
 * The same report as the Excel download, as tables for the Reports screen.
 * `path` is the .xlsx endpoint; the server switches to JSON for format=json.
 */
export async function fetchReportTables(
  token: string,
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<{ tables: ReportTable[] }> {
  const qs = new URLSearchParams({ format: 'json' });
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  let res: Response;
  try {
    res = await fetch(`${getBaseUrl()}${path}?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || `Report failed (${res.status})`);
  }
  return res.json();
}
