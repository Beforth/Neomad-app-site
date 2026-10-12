import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Vertical list you reorder by dragging a row, or by focusing its grip and pressing the up and down arrows.
 * Controlled: `items` in, `onChange` gets the new order. Items need a unique `id`. Mouse drag uses native drag and drop (no touch drag).
 */
export function SortableList<T extends { id: string }>({
  items,
  onChange,
  renderItem,
  className,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}) {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [slot, setSlot] = React.useState<number | null>(null); // insert before this index of the full list
  const [refocus, setRefocus] = React.useState<string | null>(null);
  const root = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    if (!refocus) return;
    root.current?.querySelector<HTMLElement>(`[data-grip="${CSS.escape(refocus)}"]`)?.focus();
    setRefocus(null);
  }, [refocus]);

  const reorder = (from: number, to: number) => {
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, it);
    onChange(next);
  };

  return (
    <ul
      ref={root}
      className={cn('grid gap-1.5', className)}
      onDragOver={(e) => { if (dragId) e.preventDefault(); }}
      onDrop={(e) => {
        e.preventDefault();
        const from = items.findIndex((i) => i.id === dragId);
        if (from >= 0 && slot !== null && slot !== from && slot !== from + 1) reorder(from, slot);
        setDragId(null);
        setSlot(null);
      }}
    >
      {items.map((it, i) => (
        <li
          key={it.id}
          draggable
          onDragStart={(e) => { e.dataTransfer.setData('text/plain', it.id); e.dataTransfer.effectAllowed = 'move'; setDragId(it.id); }}
          onDragEnd={() => { setDragId(null); setSlot(null); }}
          onDragOver={(e) => {
            if (!dragId) return;
            const r = e.currentTarget.getBoundingClientRect();
            setSlot(e.clientY < r.top + r.height / 2 ? i : i + 1);
          }}
          className={cn('relative flex cursor-grab items-center gap-2 rounded-lg border bg-card p-2 pr-3 text-[13px] shadow-sm transition-opacity active:cursor-grabbing', dragId === it.id && 'opacity-40')}
        >
          {slot === i && dragId && <span className="absolute -top-1 left-0 right-0 h-0.5 rounded-full bg-primary" />}
          {slot === i + 1 && i === items.length - 1 && dragId && <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-primary" />}
          <button
            type="button"
            data-grip={it.id}
            aria-label="Reorder, use arrow keys"
            onKeyDown={(e) => {
              const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
              if (!d || i + d < 0 || i + d >= items.length) return;
              e.preventDefault();
              reorder(i, d > 0 ? i + 2 : i - 1);
              setRefocus(it.id);
            }}
            className="grid size-6 shrink-0 cursor-grab place-items-center rounded text-muted-foreground outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40 active:cursor-grabbing"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor"><circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /></svg>
          </button>
          <div className="min-w-0 flex-1">{renderItem(it, i)}</div>
        </li>
      ))}
    </ul>
  );
}
