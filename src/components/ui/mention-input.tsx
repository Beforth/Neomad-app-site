import * as React from 'react';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';

export interface Mentionable {
  id: string;
  name: string;
  role?: string;
}

/**
 * Textarea that suggests people when you type @. Arrow keys pick, Enter or Tab inserts `@Name `, Escape closes.
 * The value is plain text; find mentions in it with the names you passed in `people`.
 */
export function MentionInput({
  value,
  onChange,
  people,
  placeholder = 'Write a comment, @ to mention',
  rows = 3,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  people: Mentionable[];
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = React.useState(0);
  const [active, setActive] = React.useState(0);
  const [dismissed, setDismissed] = React.useState(false);

  const match = /(^|\s)@([\w.-]*)$/.exec(value.slice(0, caret));
  const query = match?.[2].toLowerCase() ?? '';
  const list = match && !dismissed ? people.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 5) : [];
  const open = list.length > 0;

  const pick = (p: Mentionable) => {
    const start = caret - (match![2].length + 1);
    const next = `${value.slice(0, start)}@${p.name} ${value.slice(caret)}`;
    const pos = start + p.name.length + 2;
    onChange(next);
    setDismissed(false);
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(pos, pos); setCaret(pos); });
  };

  return (
    <div className={cn('relative w-full', className)}>
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={(e) => { onChange(e.target.value); setCaret(e.target.selectionStart); setActive(0); setDismissed(false); }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % list.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + list.length) % list.length); }
          else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(list[active] ?? list[0]); }
          else if (e.key === 'Escape') { e.preventDefault(); setDismissed(true); }
        }}
        className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition-[border,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15"
      />
      {open && (
        <ul role="listbox" className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-lg border bg-popover p-1 shadow-lg animate-pop">
          {list.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px]', i === active && 'bg-secondary')}
            >
              <Avatar name={p.name} size="xs" />
              <span className="font-medium">{p.name}</span>
              {p.role && <span className="ml-auto text-xs text-muted-foreground">{p.role}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
