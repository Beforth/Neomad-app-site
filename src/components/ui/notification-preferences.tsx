import * as React from 'react';
import { Switch } from './switch';
import { cn } from '@/lib/utils';

export type Preferences = Record<string, string[]>;

/**
 * Settings grid: what to be told about (rows) and where (channel columns), each cell a switch. `value` maps an event id to its enabled channels.
 * Header switches turn a whole channel on or off. Controlled.
 */
export function NotificationPreferences({
  events,
  channels,
  value,
  onChange,
  className,
}: {
  events: { id: string; label: string; description?: string }[];
  channels: { id: string; label: string }[];
  value: Preferences;
  onChange: (next: Preferences) => void;
  className?: string;
}) {
  const on = (e: string, c: string) => value[e]?.includes(c) ?? false;
  const set = (ids: string[], c: string, v: boolean) => {
    const next = { ...value };
    for (const e of ids) next[e] = v ? [...(next[e] ?? []).filter((x) => x !== c), c] : (next[e] ?? []).filter((x) => x !== c);
    onChange(next);
  };
  const all = events.map((e) => e.id);
  const cols = `minmax(0,1fr) repeat(${channels.length}, 4.5rem)`;
  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border bg-card', className)}>
      <div className="min-w-[30rem]">
        <div className="grid items-end gap-2 border-b bg-muted/40 px-4 py-3" style={{ gridTemplateColumns: cols }}>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Notify me when</span>
          {channels.map((c) => {
            const n = all.filter((e) => on(e, c.id)).length;
            return (
              <label key={c.id} className="grid cursor-pointer justify-items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {c.label}
                <Switch aria-label={`${c.label} for everything`} checked={n === all.length} className={cn(n > 0 && n < all.length && 'bg-primary/40')} onCheckedChange={(v) => set(all, c.id, v)} />
              </label>
            );
          })}
        </div>
        {events.map((e) => (
          <div key={e.id} className="grid items-center gap-2 border-b px-4 py-3 last:border-b-0" style={{ gridTemplateColumns: cols }}>
            <div className="min-w-0"><p className="text-[13px] font-medium">{e.label}</p>{e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}</div>
            {channels.map((c) => <span key={c.id} className="grid justify-items-center"><Switch aria-label={`${e.label} by ${c.label}`} checked={on(e.id, c.id)} onCheckedChange={(v) => set([e.id], c.id, v)} /></span>)}
          </div>
        ))}
      </div>
    </div>
  );
}
