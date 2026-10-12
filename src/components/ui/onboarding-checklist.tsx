import * as React from 'react';
import { CheckIcon, ChevronDownIcon } from './icons';
import { Progress } from './progress';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  /** Button or link shown while the item is open. */
  action?: React.ReactNode;
}

/** Getting-started card: progress bar, tick-off items with a short description and an action, collapsible. Controlled by `onToggle`. */
export function OnboardingChecklist({ title = 'Get started', items, onToggle, className }: { title?: string; items: ChecklistItem[]; onToggle: (id: string, done: boolean) => void; className?: string }) {
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const [open, setOpen] = React.useState(true);
  const [focus, setFocus] = React.useState<string | null>(items.find((i) => !i.done)?.id ?? null);
  return (
    <section className={cn('w-full max-w-md overflow-hidden rounded-xl border bg-card', className)}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none focus-visible:bg-muted/50">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{pct === 100 ? 'All set' : title}</p>
          <p className="text-xs text-muted-foreground">{done} of {items.length} done</p>
        </div>
        <span className="w-24"><Progress value={pct} tone={pct === 100 ? 'success' : undefined} /></span>
        <ChevronDownIcon className={cn('text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="border-t">
          {items.map((it) => (
            <li key={it.id} className="border-b last:border-b-0">
              <div className="flex items-start gap-3 px-4 py-3">
                <button type="button" role="checkbox" aria-checked={it.done} aria-label={it.title} onClick={() => onToggle(it.id, !it.done)} className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50', it.done ? 'border-success bg-success text-white' : 'border-input hover:border-primary')}>
                  {it.done && <CheckIcon className="size-3" />}
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => setFocus(focus === it.id ? null : it.id)} className={cn('text-left text-[13px] font-medium outline-none', it.done && 'text-muted-foreground line-through')}>{it.title}</button>
                  {focus === it.id && !it.done && (
                    <div className="mt-1 grid gap-2 animate-in">
                      {it.description && <p className="text-xs text-muted-foreground">{it.description}</p>}
                      {it.action}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
