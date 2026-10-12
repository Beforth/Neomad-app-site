import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { addDays, isSameDay, startOfDay } from './calendar';
import { Button } from './button';
import { cn } from '@/lib/utils';

export type EventTone = 'primary' | 'success' | 'warning' | 'destructive' | 'muted';
export interface CalendarEvent {
  id: string;
  title: string;
  /** First day. Multi-day events show on every day up to `end`. */
  start: Date;
  end?: Date;
  tone?: EventTone;
}

const tones: Record<EventTone, string> = {
  primary: 'bg-primary/12 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/20 text-warning',
  destructive: 'bg-destructive/12 text-destructive',
  muted: 'bg-secondary text-secondary-foreground',
};

/** Full month view with events on their days, "+n more" overflow, and month navigation. Month names and weekdays follow `locale`, and arrow icons flip in right-to-left pages. */
export function EventCalendar({
  events,
  onEventClick,
  onDayClick,
  month: monthProp,
  onMonthChange,
  weekStartsOn = 0,
  locale = 'en-US',
  maxPerDay = 3,
  defaultView = 'month',
  className,
}: {
  events: CalendarEvent[];
  onEventClick?: (e: CalendarEvent) => void;
  onDayClick?: (d: Date) => void;
  /** Controlled month. Leave out to let the calendar manage it. */
  month?: Date;
  onMonthChange?: (m: Date) => void;
  weekStartsOn?: 0 | 1;
  locale?: string;
  maxPerDay?: number;
  /** Month grid or a week with every event listed. People can switch with the toggle. */
  defaultView?: 'month' | 'week';
  className?: string;
}) {
  const [inner, setInner] = React.useState(() => new Date());
  const [view, setView] = React.useState(defaultView);
  const week = view === 'week';
  const month = monthProp ?? inner;
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const go = (to: Date) => { setInner(to); onMonthChange?.(to); };
  const step = (dir: -1 | 1) => go(week ? addDays(month, dir * 7) : new Date(month.getFullYear(), month.getMonth() + dir, 1));
  const today = startOfDay(new Date());

  const anchor = week ? startOfDay(month) : first;
  const gridStart = addDays(anchor, -((anchor.getDay() - weekStartsOn + 7) % 7));
  const weeks = week ? 1 : Math.ceil(((first.getDay() - weekStartsOn + 7) % 7 + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  const dfmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o);
  const title = week ? `${dfmt({ day: 'numeric', month: 'short' }).format(days[0]!)} – ${dfmt({ day: 'numeric', month: 'short', year: 'numeric' }).format(days[6]!)}` : dfmt({ month: 'long', year: 'numeric' }).format(first);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const num = new Intl.NumberFormat(locale);

  const eventsOn = (d: Date) => events.filter((e) => startOfDay(e.start) <= d && d <= startOfDay(e.end ?? e.start)).sort((a, b) => a.start.getTime() - b.start.getTime());

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card', className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-sm font-semibold" aria-live="polite">{title}</h3>
        <div className="flex items-center gap-1">
          <div className="me-1 flex rounded-md border p-0.5" role="group" aria-label="View">
            {(['month', 'week'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn('rounded px-2 py-0.5 text-xs font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50', view === v ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}>{v}</button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => go(new Date())}>Today</Button>
          <Button size="icon-sm" variant="ghost" aria-label={week ? 'Previous week' : 'Previous month'} onClick={() => step(-1)}><ChevronLeftIcon className="rtl:rotate-180" /></Button>
          <Button size="icon-sm" variant="ghost" aria-label={week ? 'Next week' : 'Next month'} onClick={() => step(1)}><ChevronRightIcon className="rtl:rotate-180" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium text-muted-foreground">
        {days.slice(0, 7).map((d) => <span key={d.getDay()} className="py-2">{weekday.format(d)}</span>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const list = eventsOn(d);
          const outside = !week && d.getMonth() !== month.getMonth();
          return (
            <div
              key={d.toISOString()}
              onClick={() => onDayClick?.(d)}
              className={cn('min-w-0 border-b border-e p-1.5 [&:nth-child(7n)]:border-e-0', week ? 'min-h-56' : 'min-h-24', i >= days.length - 7 && 'border-b-0', onDayClick && 'cursor-pointer hover:bg-secondary/40', outside && 'bg-muted/30')}
            >
              <span className={cn('mb-1 grid size-6 place-items-center rounded-full text-xs tabular-nums', outside && 'text-muted-foreground/50', isSameDay(d, today) && 'bg-primary font-semibold text-primary-foreground')}>{num.format(d.getDate())}</span>
              <div className="grid gap-0.5">
                {list.slice(0, week ? undefined : maxPerDay).map((e) => {
                  // A multi-day event names itself on its first day and at the start of each week row, and is a plain bar between.
                  const named = week || isSameDay(startOfDay(e.start), d) || i % 7 === 0;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      aria-label={e.title}
                      onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e); }}
                      className={cn('h-[22px] truncate rounded px-1.5 py-0.5 text-start text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50', tones[e.tone ?? 'primary'])}
                    >
                      {named ? e.title : ''}
                    </button>
                  );
                })}
                {!week && list.length > maxPerDay && <span className="px-1.5 text-[11px] text-muted-foreground"><bdi>+{num.format(list.length - maxPerDay)}</bdi> more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
