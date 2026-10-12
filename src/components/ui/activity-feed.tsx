import * as React from 'react';
import { Avatar } from './avatar';
import { RelativeTime } from './relative-time';
import { cn } from '@/lib/utils';

export interface Activity {
  id: string;
  actor: string;
  avatar?: string;
  /** What happened, e.g. `moved` — the target follows it in bold. */
  action: React.ReactNode;
  target?: React.ReactNode;
  at: Date | string | number;
  /** Quoted comment, file chip or anything else shown under the line. */
  detail?: React.ReactNode;
  /** Small icon on the avatar corner. */
  icon?: React.ReactNode;
}

const dayLabel = (d: Date, now = new Date()) => {
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Who did what and when, grouped under Today / Yesterday / date headings. Pass items newest first. */
export function ActivityFeed({ items, className }: { items: Activity[]; className?: string }) {
  const groups: { label: string; list: Activity[] }[] = [];
  for (const it of items) {
    const label = dayLabel(new Date(it.at));
    const last = groups[groups.length - 1];
    if (last?.label === label) last.list.push(it);
    else groups.push({ label, list: [it] });
  }
  return (
    <div className={cn('grid gap-5', className)}>
      {groups.map((g) => (
        <section key={g.label}>
          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{g.label}</h3>
          <ol className="grid">
            {g.list.map((a, i) => (
              <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < g.list.length - 1 && <span className="absolute bottom-0 left-4 top-10 w-px bg-border" />}
                <span className="relative shrink-0">
                  <Avatar name={a.actor} src={a.avatar} />
                  {a.icon && <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border bg-background text-muted-foreground [&_svg]:size-2.5">{a.icon}</span>}
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-[13px] leading-snug">
                    <span className="font-medium">{a.actor}</span> <span className="text-muted-foreground">{a.action}</span>
                    {a.target && <> <span className="font-medium">{a.target}</span></>}
                    <RelativeTime date={a.at} className="ml-2 whitespace-nowrap text-[11px] text-muted-foreground" />
                  </p>
                  {a.detail && <div className="mt-1.5 rounded-lg border bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground">{a.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
