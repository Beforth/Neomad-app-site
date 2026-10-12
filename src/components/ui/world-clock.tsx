import * as React from 'react';
import { MoonIcon, SunIcon } from './icons';
import { cn } from '@/lib/utils';

export interface Zone { city: string; timeZone: string }

function read(tz: string) {
  const d = new Date();
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d);
  const n = (t: string) => Number(f.find((p) => p.type === t)?.value);
  const here = new Date(d.toLocaleString('en-US', { timeZone: tz }));
  const offset = Math.round((here.getTime() - new Date(d.toLocaleString('en-US')).getTime()) / 36e5 * 2) / 2;
  return { h: n('hour') % 24, m: n('minute'), s: n('second'), offset };
}

/** List of cities with live local time, day or night icon and the hour difference from you. */
export function WorldClock({ zones, className }: { zones: Zone[]; className?: string }) {
  const [, tick] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => { const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);
  return (
    <ul className={cn('divide-y overflow-hidden rounded-xl border bg-card', className)}>
      {zones.map((z) => {
        const t = read(z.timeZone);
        const day = t.h >= 6 && t.h < 18;
        const diff = t.offset === 0 ? 'Same time' : `${t.offset > 0 ? '+' : ''}${t.offset}h`;
        return (
          <li key={z.timeZone} className="flex items-center gap-3 px-4 py-3">
            <span className={cn('grid size-8 place-items-center rounded-full transition-colors duration-700', day ? 'bg-warning/15 text-warning' : 'bg-info/15 text-info')}>
              {day ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{z.city}</p>
              <p className="text-xs text-muted-foreground">{diff}</p>
            </div>
            <span className="font-mono text-lg font-semibold tabular-nums">
              {String(t.h).padStart(2, '0')}:{String(t.m).padStart(2, '0')}<span className="text-sm text-muted-foreground">:{String(t.s).padStart(2, '0')}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
