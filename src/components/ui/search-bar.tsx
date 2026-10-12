import * as React from 'react';
import { ClockIcon, SearchIcon, XIcon } from './icons';
import { cn } from '@/lib/utils';

export interface SearchItem {
  id: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
}

/** Highlights the part of `text` that matches `q`. */
function mark(text: string, q: string) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark className="bg-transparent font-semibold text-foreground">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

/** Search field with a live results list. Arrow keys move, Enter picks, Escape closes. With an empty query it shows `recent`. */
export function SearchBar({
  items,
  recent = [],
  onSelect,
  placeholder = 'Search',
  empty = 'No results',
  className,
}: {
  items: SearchItem[];
  recent?: SearchItem[];
  onSelect?: (item: SearchItem) => void;
  placeholder?: string;
  empty?: string;
  className?: string;
}) {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const root = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const list = q ? items.filter((i) => `${i.label} ${i.hint ?? ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : recent;

  React.useEffect(() => {
    const off = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, []);

  const pick = (item: SearchItem) => {
    onSelect?.(item);
    setQ(item.label);
    setOpen(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open && list[active]) { e.preventDefault(); pick(list[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };
  const show = open && (q ? true : recent.length > 0);

  return (
    <div ref={root} className={cn('relative', className)}>
      <div className="group relative flex items-center">
        <SearchIcon className="pointer-events-none absolute left-3 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          role="combobox"
          aria-expanded={show}
          aria-controls={`${id}-list`}
          aria-activedescendant={show && list[active] ? `${id}-${active}` : undefined}
          value={q}
          placeholder={placeholder}
          onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-9 text-sm outline-none transition-[border,box-shadow] placeholder:text-muted-foreground/70 hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15"
        />
        {q && (
          <button type="button" aria-label="Clear" onClick={() => { setQ(''); setActive(0); }} className="absolute right-2 grid size-6 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground">
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      {show && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg animate-pop">
          {!q && <li className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Recent</li>}
          {list.length === 0 && <li className="px-2.5 py-6 text-center text-[13px] text-muted-foreground">{empty}</li>}
          {list.map((it, i) => (
            <li
              key={it.id}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(it); }}
              className={cn('flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px]', i === active && 'bg-secondary')}
            >
              <span className="text-muted-foreground [&_svg]:size-4">{it.icon ?? (q ? <SearchIcon /> : <ClockIcon />)}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{mark(it.label, q)}</span>
              {it.hint && <span className="shrink-0 text-xs text-muted-foreground/70">{it.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
