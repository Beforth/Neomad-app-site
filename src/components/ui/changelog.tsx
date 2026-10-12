import * as React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

export interface ChangelogChange {
  type: 'new' | 'improved' | 'fixed' | 'removed';
  text: string;
}
export interface ChangelogRelease {
  version: string;
  date: string;
  title?: string;
  changes: ChangelogChange[];
}

const tag = { new: ['success', 'New'], improved: ['info', 'Improved'], fixed: ['warning', 'Fixed'], removed: ['danger', 'Removed'] } as const;

/** Release notes: one block per version with a dated header and tagged changes. */
export function Changelog({ releases, className }: { releases: ChangelogRelease[]; className?: string }) {
  return (
    <div className={cn('grid gap-8', className)}>
      {releases.map((r, i) => (
        <section key={r.version} className="grid gap-3 sm:grid-cols-[9rem_1fr] sm:gap-6">
          <div className="sm:pt-0.5">
            <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
              <Badge variant={i === 0 ? 'primary' : 'outline'} className="font-mono">v{r.version}</Badge>
              <time className="text-xs text-muted-foreground">{r.date}</time>
            </div>
          </div>
          <div className="grid gap-2 border-l pl-5 sm:pl-6">
            {r.title && <h3 className="text-[15px] font-semibold tracking-tight">{r.title}</h3>}
            <ul className="grid gap-2">
              {r.changes.map((c, j) => (
                <li key={j} className="flex items-start gap-2.5 text-[13px]">
                  <Badge variant={tag[c.type][0]} className="mt-px w-[4.5rem] justify-center">{tag[c.type][1]}</Badge>
                  <span className="text-muted-foreground">{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
