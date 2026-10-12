import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Small count on the icon. */
  badge?: number;
}

/**
 * Mobile tab bar with icon and label. Controlled with `value` and `onValueChange`.
 * It does not position itself: add `fixed inset-x-0 bottom-0` (and safe-area padding) where you use it.
 */
export function BottomNav({ items, value, onValueChange, className }: { items: BottomNavItem[]; value: string; onValueChange: (id: string) => void; className?: string }) {
  return (
    <nav aria-label="Primary" className={cn('flex w-full border-t bg-background/95 px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur', className)}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            aria-current={on ? 'page' : undefined}
            onClick={() => onValueChange(it.id)}
            className={cn('group flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50', on ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
          >
            <span className={cn('relative grid h-7 w-12 place-items-center rounded-full transition-colors [&_svg]:size-5', on && 'bg-primary/10')}>
              {it.icon}
              {!!it.badge && <span className="absolute right-1.5 top-0 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">{it.badge > 99 ? '99+' : it.badge}</span>}
            </span>
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
