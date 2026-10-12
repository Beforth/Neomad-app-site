import * as React from 'react';
import { EditIcon } from './icons';
import { cn } from '@/lib/utils';

/** Text that turns into a field when clicked. Enter or blur saves, Escape cancels. */
export function InlineEdit({
  value,
  onSave,
  placeholder = 'Click to edit',
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const cancelled = React.useRef(false);
  const start = () => { setDraft(value); cancelled.current = false; setEditing(true); };
  const finish = () => {
    setEditing(false);
    if (!cancelled.current && draft.trim() !== value) onSave(draft.trim());
  };
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={finish}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur(); }
        }}
        className={cn('h-8 w-full rounded-md border border-ring bg-background px-2 text-sm outline-none ring-3 ring-ring/15', className)}
      />
    );
  }
  return (
    <button type="button" onClick={start} className={cn('group -mx-2 inline-flex h-8 max-w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none', className)}>
      <span className={cn('truncate', !value && 'text-muted-foreground')}>{value || placeholder}</span>
      <EditIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}
