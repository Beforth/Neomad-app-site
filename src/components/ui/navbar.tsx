import * as React from 'react';
import { MenuIcon, XIcon } from './icons';
import { cn } from '@/lib/utils';

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

/**
 * Top bar: brand on the left, links in the middle, actions (buttons, user menu) on the right.
 * Below `md` the links fold into a menu button. Add `sticky top-0` via className to pin it.
 */
export function Navbar({ brand, links, actions, className }: { brand: React.ReactNode; links: NavLink[]; actions?: React.ReactNode; className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <header className={cn('z-30 w-full border-b bg-background/85 backdrop-blur', className)}>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <a href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">{brand}</a>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} aria-current={l.active ? 'page' : undefined} className={cn('rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground', l.active && 'bg-secondary text-foreground')}>{l.label}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">{actions}</div>
          <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)} className="grid size-9 place-items-center rounded-md outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50 md:hidden">
            {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="grid gap-1 border-t px-4 py-3 animate-in md:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} aria-current={l.active ? 'page' : undefined} className={cn('rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground', l.active && 'bg-secondary text-foreground')}>{l.label}</a>
          ))}
          {actions && <div className="mt-2 flex gap-2 border-t pt-3 [&>*]:flex-1">{actions}</div>}
        </div>
      )}
    </header>
  );
}
