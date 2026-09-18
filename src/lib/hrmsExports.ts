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
