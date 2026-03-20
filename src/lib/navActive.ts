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
  return pathname === itemPath;
}
