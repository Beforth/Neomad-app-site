import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Matches the main Tasks list page title block (same pattern as `InvoiceSectionFrame`). */
export const TASKS_PAGE_TITLE = 'Tasks';
export const TASKS_PAGE_SUBTITLE = 'Create and manage generic tasks';

export function TaskSectionFrame({
  context,
  right,
  children,
}: {
  context?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6 w-full">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            to="/tasks"
            className="inline-flex items-center gap-0.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors mb-2 -ml-0.5"
          >
            <ChevronLeft size={18} className="shrink-0" aria-hidden />
            Back to all tasks
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{TASKS_PAGE_TITLE}</h1>
          <p className="text-xs text-zinc-500 font-medium">{TASKS_PAGE_SUBTITLE}</p>
          {context != null && context !== '' ? (
            <p className="text-xs font-semibold text-zinc-800 mt-3 max-w-2xl leading-relaxed">{context}</p>
          ) : null}
        </div>
        {right ? <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto shrink-0">{right}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function taskInnerCardClassName() {
  return 'bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden';
}
