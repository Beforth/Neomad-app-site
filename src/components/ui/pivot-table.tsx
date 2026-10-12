import * as React from 'react';
import { cn } from '@/lib/utils';

type Agg = 'sum' | 'count' | 'avg' | 'min' | 'max';

const reduce = (agg: Agg, nums: number[]) => {
  if (!nums.length) return 0;
  if (agg === 'count') return nums.length;
  if (agg === 'min') return Math.min(...nums);
  if (agg === 'max') return Math.max(...nums);
  const sum = nums.reduce((a, b) => a + b, 0);
  return agg === 'avg' ? sum / nums.length : sum;
};

/** Cross-tab of your rows: one field down the side, another across the top, and a summed (or counted, averaged...) value in each cell. Totals are included. Heat shading is on by default. */
export function PivotTable<T extends Record<string, unknown>>({
  data,
  rows,
  columns,
  value,
  agg = 'sum',
  format = (n) => n.toLocaleString(),
  rowLabel,
  totals = true,
  heat = true,
  className,
}: {
  data: T[];
  /** Field shown down the side. */
  rows: keyof T & string;
  /** Field shown across the top. */
  columns: keyof T & string;
  /** Numeric field to aggregate. Not needed for `count`. */
  value?: keyof T & string;
  agg?: Agg;
  format?: (n: number) => string;
  rowLabel?: string;
  totals?: boolean;
  heat?: boolean;
  className?: string;
}) {
  const { rowKeys, colKeys, cell, rowTotal, colTotal, grand, max } = React.useMemo(() => {
    const rowKeys = [...new Set(data.map((d) => String(d[rows])))];
    const colKeys = [...new Set(data.map((d) => String(d[columns])))];
    const buckets = new Map<string, number[]>();
    const rowB = new Map<string, number[]>();
    const colB = new Map<string, number[]>();
    const all: number[] = [];
    const push = (m: Map<string, number[]>, k: string, n: number) => m.set(k, [...(m.get(k) ?? []), n]);
    for (const d of data) {
      const n = value ? Number(d[value]) || 0 : 1;
      const r = String(d[rows]);
      const c = String(d[columns]);
      push(buckets, `${r}\u0000${c}`, n);
      push(rowB, r, n);
      push(colB, c, n);
      all.push(n);
    }
    const cell = (r: string, c: string) => (buckets.has(`${r}\u0000${c}`) ? reduce(agg, buckets.get(`${r}\u0000${c}`)!) : null);
    const max = Math.max(0, ...rowKeys.flatMap((r) => colKeys.map((c) => cell(r, c) ?? 0)));
    return { rowKeys, colKeys, cell, rowTotal: (r: string) => reduce(agg, rowB.get(r) ?? []), colTotal: (c: string) => reduce(agg, colB.get(c) ?? []), grand: reduce(agg, all), max };
  }, [data, rows, columns, value, agg]);

  const th = 'whitespace-nowrap px-3 py-2 text-end text-xs font-medium text-muted-foreground';
  return (
    <div className={cn('overflow-x-auto rounded-xl border bg-card', className)}>
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className={cn(th, 'text-start')}>{rowLabel ?? `${rows} / ${columns}`}</th>
            {colKeys.map((c) => <th key={c} scope="col" className={th}>{c}</th>)}
            {totals && <th scope="col" className={cn(th, 'border-s text-foreground')}>Total</th>}
          </tr>
        </thead>
        <tbody>
          {rowKeys.map((r) => (
            <tr key={r} className="border-b last:border-0">
              <th scope="row" className="whitespace-nowrap px-3 py-2 text-start font-medium">{r}</th>
              {colKeys.map((c) => {
                const v = cell(r, c);
                return (
                  <td key={c} className="px-3 py-2 text-end" style={heat && v ? { background: `color-mix(in oklab, var(--primary) ${Math.round((v / (max || 1)) * 28)}%, transparent)` } : undefined}>
                    {v == null ? <span className="text-muted-foreground/40">–</span> : format(v)}
                  </td>
                );
              })}
              {totals && <td className="border-s px-3 py-2 text-end font-semibold">{format(rowTotal(r))}</td>}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr className="border-t bg-muted/40 font-semibold">
              <th scope="row" className="px-3 py-2 text-start">Total</th>
              {colKeys.map((c) => <td key={c} className="px-3 py-2 text-end">{format(colTotal(c))}</td>)}
              <td className="border-s px-3 py-2 text-end">{format(grand)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
