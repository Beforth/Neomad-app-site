import * as React from 'react';
import { PlusIcon, TrashIcon, XIcon } from './icons';
import { cn } from '@/lib/utils';

export const tagColors = {
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  gray: 'bg-secondary text-secondary-foreground',
};
const swatch = { blue: 'bg-blue-500', green: 'bg-emerald-500', violet: 'bg-violet-500', amber: 'bg-amber-500', rose: 'bg-rose-500', gray: 'bg-muted-foreground' };
export type TagColor = keyof typeof tagColors;
export interface Tag { id: string; name: string; color: TagColor }

/**
 * Create, rename, recolor and delete labels. Click a tag name to rename, click its dot to cycle the color, the trash to delete.
 * New tags need a unique name. Controlled: `tags` in, `onChange` out. `usage` shows how many records use each tag.
 */
export function TagManager({ tags, onChange, usage = {}, className }: { tags: Tag[]; onChange: (tags: Tag[]) => void; usage?: Record<string, number>; className?: string }) {
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState<TagColor>('blue');
  const [editing, setEditing] = React.useState<string | null>(null);
  const keys = Object.keys(tagColors) as TagColor[];
  const dup = (n: string, except?: string) => tags.some((t) => t.id !== except && t.name.toLowerCase() === n.trim().toLowerCase());
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || dup(n)) return;
    onChange([...tags, { id: `${Date.now()}`, name: n, color }]);
    setName('');
  };
  const patch = (id: string, p: Partial<Tag>) => onChange(tags.map((t) => (t.id === id ? { ...t, ...p } : t)));

  return (
    <div className={cn('grid w-full max-w-md gap-3 rounded-xl border bg-card p-4', className)}>
      <form onSubmit={add} className="flex items-center gap-2">
        <div className="flex gap-1" role="radiogroup" aria-label="New tag color">
          {keys.map((k) => <button key={k} type="button" role="radio" aria-checked={color === k} aria-label={k} onClick={() => setColor(k)} className={cn('size-5 rounded-full outline-none ring-offset-2 ring-offset-card transition-shadow focus-visible:ring-2 focus-visible:ring-ring', swatch[k], color === k && 'ring-2 ring-foreground/70')} />)}
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag" aria-label="New tag name" aria-invalid={!!name && dup(name)} className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2.5 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15" />
        <button type="submit" aria-label="Add tag" disabled={!name.trim() || dup(name)} className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40"><PlusIcon className="size-4" /></button>
      </form>
      {!!name && dup(name) && <p className="-mt-1 text-xs text-destructive">A tag with that name exists.</p>}
      <ul className="grid gap-1">
        {tags.map((t) => (
          <li key={t.id} className="group flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/60">
            <button type="button" aria-label={`Change color of ${t.name}`} onClick={() => patch(t.id, { color: keys[(keys.indexOf(t.color) + 1) % keys.length] })} className={cn('size-3.5 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring', swatch[t.color])} />
            {editing === t.id ? (
              <input autoFocus defaultValue={t.name} aria-label={`Rename ${t.name}`} onBlur={(e) => { const v = e.target.value.trim(); if (v && !dup(v, t.id)) patch(t.id, { name: v }); setEditing(null); }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = t.name; e.currentTarget.blur(); } }} className="h-7 min-w-0 flex-1 rounded border bg-background px-2 text-[13px] outline-none focus-visible:border-ring" />
            ) : (
              <button type="button" onClick={() => setEditing(t.id)} className="flex min-w-0 flex-1 items-center text-left outline-none"><span className={cn('truncate rounded-full px-2 py-0.5 text-xs font-medium', tagColors[t.color])}>{t.name}</span></button>
            )}
            {usage[t.id] !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{usage[t.id]}</span>}
            <button type="button" aria-label={`Delete ${t.name}`} onClick={() => onChange(tags.filter((x) => x.id !== t.id))} className="grid size-6 place-items-center rounded text-muted-foreground opacity-0 outline-none hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"><TrashIcon className="size-3.5" /></button>
          </li>
        ))}
        {tags.length === 0 && <li className="py-4 text-center text-xs text-muted-foreground">No tags yet.</li>}
      </ul>
    </div>
  );
}
