import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

/** Matches the main Invoices list page (`Invoices.tsx`) title block (same pattern as `TaskSectionFrame`). */
export const INVOICES_PAGE_TITLE = 'Invoices';
export const INVOICES_PAGE_SUBTITLE = 'Manage and track all delivery invoices';

export function InvoiceSectionFrame({
  context,
  right,
  children,
}: {
  /** Line under the subtitle, e.g. "Invoice detail · INV-001 · Hospital". */
  context?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  const location = useLocation();
  const backPage = new URLSearchParams(location.search).get('page');
  const backTo = backPage && backPage !== '1' ? `/invoices?page=${backPage}` : '/invoices';

  return (
    <div className="space-y-6 w-full">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            to={backTo}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2 -ml-0.5"
          >
            <ChevronLeft size={18} className="shrink-0" aria-hidden />
            Back to all invoices
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{INVOICES_PAGE_TITLE}</h1>
          <p className="text-[13px] text-muted-foreground">{INVOICES_PAGE_SUBTITLE}</p>
          {context != null && context !== '' ? (
            <p className="text-xs font-semibold text-foreground mt-3 max-w-2xl leading-relaxed">{context}</p>
          ) : null}
        </div>
        {right ? <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto shrink-0">{right}</div> : null}
      </header>
      {children}
    </div>
  );
}

/** Same chrome as filter/table panels on the list page. */
export function invoiceInnerCardClassName() {
  return 'bg-card rounded-xl border border-border shadow-sm overflow-hidden';
}
