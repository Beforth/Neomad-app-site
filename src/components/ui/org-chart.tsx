import * as React from 'react';
import { Avatar } from './avatar';
import { ChevronDownIcon } from './icons';
import { cn } from '@/lib/utils';

export interface OrgNode {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
  children?: OrgNode[];
}

function Node({ node, level, openLevels }: { node: OrgNode; level: number; openLevels: number }) {
  const kids = node.children ?? [];
  const [open, setOpen] = React.useState(level < openLevels);
  return (
    <li className={cn('relative flex flex-col items-center px-2', level > 0 && 'pt-6 before:absolute before:left-0 before:right-0 before:top-0 before:h-px before:bg-border first:before:left-1/2 last:before:right-1/2 only:before:hidden after:absolute after:left-1/2 after:top-0 after:h-6 after:w-px after:bg-border')}>
      <div className="relative w-44 rounded-xl border bg-card p-3 text-center shadow-sm">
        <Avatar name={node.name} src={node.avatar} size="md" className="mx-auto" />
        <p className="mt-2 truncate text-[13px] font-medium">{node.name}</p>
        {node.title && <p className="truncate text-xs text-muted-foreground">{node.title}</p>}
        {kids.length > 0 && (
          <button type="button" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}'s team`} onClick={() => setOpen(!open)} className="absolute -bottom-3 left-1/2 z-10 flex h-6 -translate-x-1/2 items-center gap-0.5 rounded-full border bg-background px-1.5 text-[11px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40">
            {kids.length}<ChevronDownIcon className={cn('size-3 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {open && kids.length > 0 && (
        <ul className="relative mt-3 flex pt-3 before:absolute before:left-1/2 before:top-0 before:h-3 before:w-px before:bg-border">
          {kids.map((k) => <Node key={k.id} node={k} level={level + 1} openLevels={openLevels} />)}
        </ul>
      )}
    </li>
  );
}

/** Reporting tree. Cards connect with lines; the count chip on each card collapses its team. `openLevels` sets how many levels start open. */
export function OrgChart({ root, openLevels = 2, className }: { root: OrgNode; openLevels?: number; className?: string }) {
  return (
    <div className={cn('w-full overflow-x-auto pb-4', className)}>
      <ul className="mx-auto flex w-max min-w-full justify-center"><Node node={root} level={0} openLevels={openLevels} /></ul>
    </div>
  );
}
