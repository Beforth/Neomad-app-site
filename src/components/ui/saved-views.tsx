import * as React from 'react';
import { Button } from './button';
import { BookmarkIcon, ChevronDownIcon, XIcon } from './icons';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';

export interface SavedView { id: string; name: string }

/**
 * Menu of saved filter and sort setups for a table. Pick one to apply it, save the current setup under a name, or remove a view.
 * You store what a view means (filters, sort, columns); this only manages the list and the selection.
 */
export function SavedViews({ views, activeId, onSelect, onSave, onDelete, className }: { views: SavedView[]; activeId?: string; onSelect: (id: string | undefined) => void; onSave: (name: string) => void; onDelete?: (id: string) => void; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const active = views.find((v) => v.id === activeId);
  const save = (e: React.FormEvent) => { e.preventDefault(); if (name.trim()) { onSave(name.trim()); setName(''); } };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={className}><BookmarkIcon /> {active?.name ?? 'Views'} <ChevronDownIcon className="size-3.5" /></Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        <ul className="grid gap-0.5">
          <li><button type="button" onClick={() => { onSelect(undefined); setOpen(false); }} className={cn('flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] outline-none hover:bg-secondary focus-visible:bg-secondary', !activeId && 'font-medium text-primary')}>All records</button></li>
          {views.map((v) => (
            <li key={v.id} className="group flex items-center rounded-md hover:bg-secondary">
              <button type="button" onClick={() => { onSelect(v.id); setOpen(false); }} className={cn('min-w-0 flex-1 truncate rounded-md px-2.5 py-1.5 text-left text-[13px] outline-none focus-visible:bg-secondary', v.id === activeId && 'font-medium text-primary')}>{v.name}</button>
              {onDelete && <button type="button" aria-label={`Delete view ${v.name}`} onClick={() => onDelete(v.id)} className="mr-1 grid size-6 place-items-center rounded text-muted-foreground opacity-0 outline-none hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"><XIcon className="size-3.5" /></button>}
            </li>
          ))}
        </ul>
        <form onSubmit={save} className="mt-1.5 flex gap-1.5 border-t p-1.5 pt-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Save current as…" aria-label="View name" className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2.5 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15" />
          <Button type="submit" size="sm" disabled={!name.trim()}>Save</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
