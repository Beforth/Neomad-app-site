import * as React from 'react';
import { PlusIcon } from './icons';
import { cn } from '@/lib/utils';

export interface FabAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

/**
 * Floating action button. With `label` it becomes an extended pill. With `actions` it opens a speed dial that fans the actions upward.
 * It does not position itself: wrap it or add `fixed bottom-6 right-6` where you use it.
 */
export function Fab({ icon, label, onClick, actions, className }: { icon?: React.ReactNode; label?: string; onClick?: () => void; actions?: FabAction[]; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative inline-flex flex-col items-end gap-2.5', className)}>
      {actions && open && (
        <div className="flex flex-col items-end gap-2">
          {actions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              onClick={() => { setOpen(false); a.onClick(); }}
              style={{ animationDelay: `${(actions.length - 1 - i) * 30}ms` }}
              className="flex animate-pop items-center gap-2 rounded-full border bg-card py-1.5 pl-3.5 pr-1.5 text-[13px] font-medium shadow-md outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {a.label}
              <span className="grid size-8 place-items-center rounded-full bg-secondary text-foreground [&_svg]:size-4">{a.icon}</span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label={label ?? 'Actions'}
        aria-expanded={actions ? open : undefined}
        onClick={() => (actions ? setOpen(!open) : onClick?.())}
        className={cn('inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-[transform,box-shadow] hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 active:scale-95 [&_svg]:size-5', label ? 'px-5 text-sm font-medium' : 'w-14')}
      >
        <span className={cn('grid transition-transform duration-200', open && 'rotate-45')}>{icon ?? <PlusIcon />}</span>
        {label}
      </button>
    </div>
  );
}
