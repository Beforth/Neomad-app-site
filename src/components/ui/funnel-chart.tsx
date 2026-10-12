import * as React from 'react';
import { cn } from '@/lib/utils';

/** Conversion funnel: one centered bar per stage, narrowing as values drop, with the share of the first stage and the step-to-step rate. */
export function FunnelChart({ stages, format = (n) => n.toLocaleString('en-IN'), className }: { stages: { label: string; value: number }[]; format?: (n: number) => string; className?: string }) {
  const top = stages[0]?.value || 1;
  return (
    <ol className={cn('grid w-full gap-1.5', className)}>
      {stages.map((s, i) => {
        const w = Math.max(8, (s.value / top) * 100);
        const step = i ? Math.round((s.value / (stages[i - 1].value || 1)) * 100) : null;
        return (
          <li key={s.label} className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-3 text-[13px]">
            <span className="truncate text-muted-foreground">{s.label}</span>
            <div className="flex justify-center">
              <div style={{ width: `${w}%`, opacity: 1 - i * (0.55 / Math.max(1, stages.length - 1)) }} className="flex h-9 items-center justify-center rounded-md bg-primary text-xs font-semibold tabular-nums text-primary-foreground transition-[width] duration-500">{format(s.value)}</div>
            </div>
            <span className="text-right text-xs tabular-nums text-muted-foreground">{step === null ? '100%' : <><span className={cn('font-medium', step < 50 ? 'text-destructive' : 'text-foreground')}>{step}%</span></>}</span>
          </li>
        );
      })}
    </ol>
  );
}
