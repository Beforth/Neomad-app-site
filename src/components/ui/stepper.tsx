import * as React from 'react';
import { CheckIcon } from './icons';
import { cn } from '@/lib/utils';

/** Horizontal progress steps. `current` is the zero-based active step. */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: { title: string; description?: string }[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn('flex w-full items-start', className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.title} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'grid size-7 place-items-center rounded-full border text-xs font-semibold transition-colors',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary bg-accent text-accent-foreground ring-4 ring-primary/10',
                  !done && !active && 'bg-background text-muted-foreground',
                )}
              >
                {done ? <CheckIcon className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className="text-center">
                <span className={cn('block text-xs font-medium', !done && !active && 'text-muted-foreground')}>{s.title}</span>
                {s.description && <span className="block text-[11px] text-muted-foreground">{s.description}</span>}
              </span>
            </div>
            {i < steps.length - 1 && <span className={cn('mx-2 mt-3.5 h-px flex-1 transition-colors', done ? 'bg-primary' : 'bg-border')} />}
          </li>
        );
      })}
    </ol>
  );
}
