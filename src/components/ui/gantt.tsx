import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GanttTask {
  id: string;
  name: string;
  start: string; // yyyy-mm-dd
  end: string; // yyyy-mm-dd, inclusive
  /** 0 to 100. */
  progress?: number;
  owner?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const fill = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-destructive', info: 'bg-info' };
const track = { primary: 'bg-primary/25', success: 'bg-success/25', warning: 'bg-warning/25', danger: 'bg-destructive/25', info: 'bg-info/25' };
const DAY = 86400000;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };

/**
 * Schedule view: one bar per task across a day or week grid, with progress, a today line and a hover readout. Read-only.
 * `dayWidth` is pixels per day; scrolls sideways when the range is long.
 */
export function Gantt({ tasks, dayWidth = 28, className }: { tasks: GanttTask[]; dayWidth?: number; className?: string }) {
  const t0 = Math.min(...tasks.map((t) => parse(t.start)));
  const t1 = Math.max(...tasks.map((t) => parse(t.end)));
  const days = Math.round((t1 - t0) / DAY) + 1;
  const today = Math.round((new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime() - t0) / DAY);
  const rowH = 40;
  const label = (i: number) => new Date(t0 + i * DAY);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div className={cn('flex w-full overflow-hidden rounded-xl border bg-card', className)}>
      <div className="w-44 shrink-0 border-r">
        <div className="h-10 border-b px-3 text-[11px] font-medium uppercase tracking-wider leading-10 text-muted-foreground">Task</div>
        {tasks.map((t) => (
          <div key={t.id} style={{ height: rowH }} className="flex flex-col justify-center border-b px-3 last:border-b-0">
            <span className="truncate text-[13px] font-medium">{t.name}</span>
            {t.owner && <span className="truncate text-[11px] text-muted-foreground">{t.owner}</span>}
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="relative" style={{ width: days * dayWidth }}>
          <div className="flex h-10 border-b">
            {Array.from({ length: days }, (_, i) => {
              const d = label(i);
              const first = d.getDate() === 1 || i === 0;
              return (
                <div key={i} style={{ width: dayWidth }} className={cn('shrink-0 border-l text-center text-[10px] leading-4 text-muted-foreground first:border-l-0', [0, 6].includes(d.getDay()) && 'bg-muted/50')}>
                  <div className="h-4 truncate pl-1 text-left font-medium">{first ? d.toLocaleDateString('en-GB', { month: 'short' }) : ''}</div>
                  <div>{d.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 top-10 flex">
            {Array.from({ length: days }, (_, i) => <div key={i} style={{ width: dayWidth }} className={cn('shrink-0 border-l first:border-l-0', [0, 6].includes(label(i).getDay()) && 'bg-muted/50')} />)}
          </div>
          {today >= 0 && today < days && <div className="absolute bottom-0 top-10 z-10 w-px bg-destructive" style={{ left: today * dayWidth + dayWidth / 2 }}><span className="absolute -top-0 left-1 rounded bg-destructive px-1 text-[9px] font-semibold text-white">Today</span></div>}
          <div className="relative">
            {tasks.map((t) => {
              const s = Math.round((parse(t.start) - t0) / DAY);
              const w = Math.round((parse(t.end) - parse(t.start)) / DAY) + 1;
              return (
                <div key={t.id} style={{ height: rowH }} className="relative border-b last:border-b-0">
                  <div
                    title={`${t.name}: ${fmt(new Date(parse(t.start)))} to ${fmt(new Date(parse(t.end)))}${t.progress !== undefined ? ` · ${t.progress}%` : ''}`}
                    style={{ left: s * dayWidth + 2, width: w * dayWidth - 4 }}
                    className={cn('absolute top-2.5 h-5 overflow-hidden rounded-md', track[t.tone ?? 'primary'])}
                  >
                    <div className={cn('h-full rounded-md', fill[t.tone ?? 'primary'])} style={{ width: `${t.progress ?? 100}%` }} />
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-semibold text-white mix-blend-normal [text-shadow:0_0_2px_rgb(0_0_0/0.4)]">{t.progress !== undefined ? `${t.progress}%` : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
