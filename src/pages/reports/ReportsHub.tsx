import { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '@/components/ui/app-shell';
import SearchableSelect from '../../components/SearchableSelect';
import { cn } from '@/lib/utils';
import type { ReportDef } from './definitions';
import ReportView from './ReportView';

interface ReportsHubProps {
  reports: ReportDef[];
  groups: string[];
  description: string;
  /** Maps an old ?tab= value to a report id. */
  legacy?: Record<string, string>;
}

/**
 * Reports hub: a list of reports on the left, the chosen report on the right.
 * Used by the delivery Reports page and the HRMS Reports page.
 * Keyboard: ↑ ↓ (or j k) in the list picks a report; Tab goes into the report.
 */
export default function ReportsHub({ reports: REPORTS, groups: REPORT_GROUPS, description, legacy: legacyMap = {} }: ReportsHubProps) {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const navRef = useRef<HTMLElement>(null);

  // Old links used ?tab=availability|travel for the rider charts.
  const legacy = params.get('tab');
  const requested = params.get('report') ?? (legacy ? legacyMap[legacy] : undefined) ?? REPORTS[0].id;
  const def = useMemo(() => REPORTS.find((r) => r.id === requested) ?? REPORTS[0], [requested]);

  const select = (id: string) => setParams({ report: id }, { replace: true });

  const onNavKey = (e: React.KeyboardEvent) => {
    const keys = ['ArrowDown', 'ArrowUp', 'j', 'k'];
    if (!keys.includes(e.key)) return;
    const items = Array.from(navRef.current?.querySelectorAll<HTMLButtonElement>('button[data-report]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    const next = items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' || e.key === 'j' ? 1 : -1)))];
    next?.focus();
    next?.click();
  };

  return (
    <div className="grid gap-4">
      <PageHeader title="Reports" description={description} className="mb-1" />
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="lg:hidden">
          <SearchableSelect
            value={def.id}
            onChange={select}
            options={REPORTS.map((r) => ({ value: r.id, label: `${r.group} · ${r.title}` }))}
          />
        </div>
        <nav ref={navRef} aria-label="Reports" onKeyDown={onNavKey} className="hidden content-start gap-5 lg:grid">
          {REPORT_GROUPS.map((g) => (
            <div key={g} className="grid gap-0.5">
              <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">{g}</p>
              {REPORTS.filter((r) => r.group === g).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  data-report={r.id}
                  aria-current={r.id === def.id ? 'page' : undefined}
                  onClick={() => select(r.id)}
                  className={cn(
                    'flex h-8 items-center rounded-md px-2.5 text-left text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40',
                    r.id === def.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {r.title}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="min-w-0">{token && <ReportView key={def.id} def={def} token={token} />}</div>
      </div>
    </div>
  );
}
