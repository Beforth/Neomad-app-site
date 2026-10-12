import { cn } from '@/lib/utils';

export interface BarItem {
  label: string;
  value: number;
  /** Shown at the end of the row instead of the plain number. */
  display?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const TONE: Record<NonNullable<BarItem['tone']>, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
};

/** Plain horizontal bars: label, bar, number. Easier to read than a chart for a handful of rows. */
export default function BarList({ title, items, className }: { title?: string; items: BarItem[]; className?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={cn('rounded-xl border bg-card p-4', className)}>
      {title && <h3 className="mb-3 text-sm font-medium">{title}</h3>}
      <ul className="grid gap-2.5">
        {items.map((i) => (
          <li key={i.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-[13px]">
            <span className="truncate text-muted-foreground">{i.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-secondary">
              <span className={cn('block h-full rounded-full', TONE[i.tone ?? 'default'])} style={{ width: `${(i.value / max) * 100}%` }} />
            </span>
            <span className="text-right font-medium tabular-nums">{i.display ?? i.value.toLocaleString('en-IN')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
