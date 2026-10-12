import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

/** macOS-style dock: icons grow toward the pointer and neighbours follow. Labels show on hover. */
export function Dock({ items, className }: { items: DockItem[]; className?: string }) {
  const [x, setX] = React.useState<number | null>(null);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const scale = (i: number) => {
    const el = refs.current[i];
    if (x === null || !el) return 1;
    const r = el.getBoundingClientRect();
    const d = Math.abs(x - (r.left + r.width / 2));
    return 1 + 0.7 * Math.max(0, 1 - d / 110) ** 2;
  };
  return (
    <div
      onPointerMove={(e) => setX(e.clientX)}
      onPointerLeave={() => setX(null)}
      className={cn('flex h-16 items-end gap-2 rounded-2xl border bg-card/80 px-3 pb-2.5 shadow-lg backdrop-blur', className)}
      role="toolbar"
    >
      {items.map((it, i) => (
        <button
          key={it.id}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          aria-label={it.label}
          onClick={it.onClick}
          style={{ transform: `scale(${scale(i)})`, transformOrigin: 'bottom' }}
          className="group relative grid size-10 place-items-center rounded-xl bg-secondary text-foreground outline-none transition-[transform,background] duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-5"
        >
          {it.icon}
          <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded-md bg-foreground px-2 py-0.5 text-[11px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
