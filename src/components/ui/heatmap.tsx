import * as React from 'react';
import { cn } from '@/lib/utils';

const LEVELS = ['bg-secondary', 'bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary'];

/** Contribution-style grid. `values` is one number per day, oldest first, ending on `endDate`. Cells pop in column by column. */
export function Heatmap({
  values,
  endDate = new Date(),
  unit = 'contributions',
  className,
}: {
  values: number[];
  endDate?: Date;
  unit?: string;
  className?: string;
}) {
  const max = Math.max(1, ...values);
  const level = (v: number) => (v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
  const weeks = Math.ceil(values.length / 7);
  const day0 = new Date(endDate);
  day0.setDate(day0.getDate() - values.length + 1);
  const date = (i: number) => new Date(day0.getTime() + i * 864e5);
  // pad the first column so each row is the same weekday
  const pad = day0.getDay();
  const cells: (number | null)[] = [...Array(pad).fill(null), ...values.map((_, i) => i)];
  return (
    <div className={cn('inline-grid gap-2', className)}>
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label={`${values.reduce((a, b) => a + b, 0)} ${unit} in the last ${values.length} days`}>
        {cells.map((i, k) =>
          i === null ? <span key={`p${k}`} className="size-3" /> : (
            <span
              key={i}
              title={`${values[i]} ${unit}, ${date(i).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
              className={cn('size-3 animate-pop rounded-[3px] transition-transform duration-150 hover:scale-150', LEVELS[level(values[i])])}
              style={{ animationDelay: `${Math.floor(k / 7) * 18}ms`, animationFillMode: 'backwards' }}
            />
          ),
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{weeks} weeks</span>
        <span className="flex items-center gap-1">Less {LEVELS.map((c) => <span key={c} className={cn('size-2.5 rounded-[2px]', c)} />)} More</span>
      </div>
    </div>
  );
}
