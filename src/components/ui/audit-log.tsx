import * as React from 'react';
import { Avatar } from './avatar';
import { Badge } from './badge';
import { ChevronDownIcon } from './icons';
import { cn } from '@/lib/utils';

export interface AuditEntry {
  id: string;
  actor: string;
  action: 'created' | 'updated' | 'deleted' | 'viewed' | 'exported' | string;
  target: string;
  at: Date | string | number;
  ip?: string;
  /** Field-level changes shown when the row is expanded. */
  changes?: { field: string; from?: string; to?: string }[];
}

const tone = { created: 'success', updated: 'info', deleted: 'danger', exported: 'warning' } as const;
const when = (d: Date | string | number) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Who changed what, newest first. Rows with `changes` expand to a before and after list. Pair with a filter above it for large logs. */
export function AuditLog({ entries, className }: { entries: AuditEntry[]; className?: string }) {
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const flip = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <ul className={cn('divide-y overflow-hidden rounded-xl border bg-card', className)}>
      {entries.map((e) => {
        const can = !!e.changes?.length;
        const on = open.has(e.id);
        return (
          <li key={e.id}>
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar name={e.actor} size="sm" />
              <div className="min-w-0 flex-1 text-[13px]">
                <p className="truncate"><span className="font-medium">{e.actor}</span> <Badge variant={tone[e.action as keyof typeof tone] ?? 'default'} className="mx-1">{e.action}</Badge> <span className="font-medium">{e.target}</span></p>
                <p className="text-xs text-muted-foreground">{when(e.at)}{e.ip && ` · ${e.ip}`}</p>
              </div>
              {can && (
                <button type="button" aria-expanded={on} aria-label={on ? 'Hide changes' : 'Show changes'} onClick={() => flip(e.id)} className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40">
                  <ChevronDownIcon className={cn('transition-transform', on && 'rotate-180')} />
                </button>
              )}
            </div>
            {can && on && (
              <dl className="grid gap-1.5 border-t bg-muted/40 px-4 py-3 pl-16 text-xs animate-in">
                {e.changes!.map((c) => (
                  <div key={c.field} className="flex flex-wrap items-center gap-x-2">
                    <dt className="w-28 shrink-0 text-muted-foreground">{c.field}</dt>
                    <dd className="flex items-center gap-2">
                      {c.from !== undefined && <s className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">{c.from || 'empty'}</s>}
                      {c.to !== undefined && <span className="rounded bg-success/10 px-1.5 py-0.5 text-success">{c.to || 'empty'}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}
