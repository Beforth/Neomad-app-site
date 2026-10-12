import * as React from 'react';
import { Calendar, startOfDay } from './calendar';
import { CalendarIcon } from './icons';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { TimePicker } from './time-picker';
import { cn } from '@/lib/utils';

const fmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Date and time in one field. Pick the day on the calendar, set the time below it. Value is a Date (local time). */
export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick date and time',
  minuteStep = 5,
  disabledDays,
  className,
  id,
}: {
  value?: Date;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
  minuteStep?: number;
  disabledDays?: (d: Date) => boolean;
  className?: string;
  id?: string;
}) {
  const time = value ? hhmm(value) : '09:00';
  const set = (day: Date, t: string) => {
    const [h, m] = t.split(':').map(Number);
    onChange(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m));
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn('flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm outline-none transition-[border,box-shadow] hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/15', className)}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn('flex-1 truncate', !value && 'text-muted-foreground/70')}>{value ? fmt.format(value) : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="grid w-auto gap-3 p-3">
        <Calendar selected={value} disabled={disabledDays} onSelect={(d) => d && set(d, time)} />
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-xs font-medium text-muted-foreground">Time</span>
          <TimePicker value={time} minuteStep={minuteStep} onValueChange={(t) => set(value ? startOfDay(value) : startOfDay(new Date()), t)} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
