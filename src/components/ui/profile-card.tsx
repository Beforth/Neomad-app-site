import * as React from 'react';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';

/** Person card: banner, avatar, name and role, a row of stats, and an actions slot (buttons). */
export function ProfileCard({
  name,
  role,
  location,
  avatar,
  status,
  stats,
  children,
  className,
}: {
  name: string;
  role?: string;
  location?: string;
  avatar?: string;
  /** Small green "Online"-style text next to the name. */
  status?: string;
  stats?: { label: string; value: React.ReactNode }[];
  /** Action buttons, shown at the bottom. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-72 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm', className)}>
      <div className="h-20 bg-primary/10" />
      <div className="-mt-9 grid justify-items-center gap-1 px-5 pb-5 text-center">
        <Avatar name={name} src={avatar} size="lg" className="size-[4.5rem] text-xl ring-4 ring-card" />
        <div className="mt-1 flex items-center gap-2">
          <h3 className="text-[15px] font-semibold">{name}</h3>
          {status && <span className="flex items-center gap-1 text-[11px] font-medium text-success"><span className="size-1.5 rounded-full bg-success" />{status}</span>}
        </div>
        {role && <p className="text-[13px] text-muted-foreground">{role}</p>}
        {location && <p className="text-xs text-muted-foreground">{location}</p>}
        {stats && (
          <dl className="mt-3 grid w-full grid-flow-col auto-cols-fr divide-x rounded-lg border py-2">
            {stats.map((s) => (
              <div key={s.label} className="grid gap-0.5">
                <dd className="text-sm font-semibold tabular-nums">{s.value}</dd>
                <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </dl>
        )}
        {children && <div className="mt-3 flex w-full gap-2 [&>*]:flex-1">{children}</div>}
      </div>
    </div>
  );
}
