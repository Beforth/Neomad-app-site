/**
 * Whether a nav item for `itemPath` should appear active for the current URL.
 * Sections with detail sub-routes match prefix (e.g. any `/invoices/*`).
 */
export function isNavItemActive(itemPath: string, pathname: string): boolean {
  if (itemPath === '/invoices') {
    return pathname === '/invoices' || pathname.startsWith('/invoices/');
  }
  if (itemPath === '/tasks') {
    return pathname === '/tasks' || pathname.startsWith('/tasks/');
  }
  if (itemPath === '/hrms/leave') {
    return pathname === '/hrms/leave' || pathname.startsWith('/hrms/leave/');
  }
  if (itemPath === '/hrms/expenses') {
    return pathname === '/hrms/expenses' || pathname.startsWith('/hrms/expenses/');
  }
  if (itemPath === '/hrms/payroll') {
    return pathname === '/hrms/payroll' || pathname.startsWith('/hrms/payroll/');
  }
  return pathname === itemPath;
}
