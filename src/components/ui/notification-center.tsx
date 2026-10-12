import * as React from 'react';
import { BellIcon, CheckIcon } from './icons';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';

export interface Notice {
  id: string;
  title: string;
  body?: string;
  time: string;
  read?: boolean;
}

/** Bell with an unread count. The popover lists notices; clicking one marks it read, and "Mark all read" clears the count. */
export function NotificationCenter({
  notices,
  onChange,
  onOpenNotice,
  className,
}: {
  notices: Notice[];
  /** Called with the new list when something is marked read. */
  onChange: (next: Notice[]) => void;
  onOpenNotice?: (n: Notice) => void;
  className?: string;
}) {
  const unread = notices.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className={cn('relative', className)}>
          <BellIcon />
          {unread > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">{unread > 9 ? '9+' : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="link" size="xs" disabled={!unread} onClick={() => onChange(notices.map((n) => ({ ...n, read: true })))} className="gap-1 text-xs disabled:opacity-40">
            <CheckIcon className="size-3.5" /> Mark all read
          </Button>
        </div>
        <ul className="max-h-80 overflow-auto">
          {notices.length === 0 && <li className="px-3 py-10 text-center text-[13px] text-muted-foreground">You are all caught up</li>}
          {notices.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => { onChange(notices.map((x) => (x.id === n.id ? { ...x, read: true } : x))); onOpenNotice?.(n); }}
                className="flex w-full items-start gap-2.5 border-b px-3 py-2.5 text-left outline-none last:border-0 hover:bg-muted focus-visible:bg-muted"
              >
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[13px]', n.read ? 'text-muted-foreground' : 'font-medium')}>{n.title}</span>
                  {n.body && <span className="block truncate text-xs text-muted-foreground">{n.body}</span>}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{n.time}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
