import * as React from 'react';
import { ChevronDownIcon } from './icons';
import { cn } from '@/lib/utils';

/** One section that opens and closes with a smooth height animation. For several together use Accordion. */
export function Collapsible({
  title,
  defaultOpen = false,
  className,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();
  return (
    <div className={className}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 rounded-md py-1.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
        {title}
        <ChevronDownIcon className={cn('text-muted-foreground transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div id={id} className={cn('grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="overflow-hidden"><div className="pb-1 pt-1 text-sm text-muted-foreground">{children}</div></div>
      </div>
    </div>
  );
}
