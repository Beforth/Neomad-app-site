import * as React from 'react';
import { ChevronRightIcon, FileIcon, FolderIcon, ImageIcon, ListIcon, ComponentsIcon } from './icons';
import { cn } from '@/lib/utils';

export interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'image';
  /** Bytes. Shown for files. */
  size?: number;
  modified: string;
}

const size = (n?: number) => (n === undefined ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const iconOf = (t: FileItem['type']) => (t === 'folder' ? <FolderIcon className="size-5 text-primary" /> : t === 'image' ? <ImageIcon className="size-5 text-success" /> : <FileIcon className="size-5 text-muted-foreground" />);

/**
 * Folder browser with breadcrumb, list and grid views, and single selection. You hold the current `path` and the `items` in it:
 * `onOpen` fires on double-click or Enter (open a folder, preview a file), `onNavigate(i)` when a breadcrumb is clicked.
 */
export function FileManager({
  path,
  items,
  onNavigate,
  onOpen,
  className,
}: {
  path: string[];
  items: FileItem[];
  onNavigate: (depth: number) => void;
  onOpen: (item: FileItem) => void;
  className?: string;
}) {
  const [view, setView] = React.useState<'list' | 'grid'>('list');
  const [sel, setSel] = React.useState<string | null>(null);
  const sorted = [...items].sort((a, b) => (a.type === 'folder' ? 0 : 1) - (b.type === 'folder' ? 0 : 1) || a.name.localeCompare(b.name));
  const vbtn = (v: 'list' | 'grid', icon: React.ReactNode, label: string) => (
    <button type="button" aria-label={label} aria-pressed={view === v} onClick={() => setView(v)} className={cn('grid size-7 place-items-center rounded-md text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40', view === v && 'bg-secondary text-foreground')}>{icon}</button>
  );
  const key = (e: React.KeyboardEvent, it: FileItem) => { if (e.key === 'Enter') onOpen(it); else if (e.key === ' ') { e.preventDefault(); setSel(it.id); } };

  return (
    <div className={cn('w-full overflow-hidden rounded-xl border bg-card', className)}>
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <nav aria-label="Path" className="flex min-w-0 items-center gap-0.5 text-[13px]">
          {path.map((p, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRightIcon className="size-3.5 text-muted-foreground" />}
              <button type="button" onClick={() => onNavigate(i)} aria-current={i === path.length - 1 ? 'page' : undefined} className={cn('truncate rounded px-1.5 py-0.5 outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40', i === path.length - 1 ? 'font-medium' : 'text-muted-foreground')}>{p}</button>
            </React.Fragment>
          ))}
        </nav>
        <div className="flex gap-0.5">{vbtn('list', <ListIcon className="size-4" />, 'List view')}{vbtn('grid', <ComponentsIcon className="size-4" />, 'Grid view')}</div>
      </div>
      {sorted.length === 0 && <p className="py-12 text-center text-[13px] text-muted-foreground">This folder is empty.</p>}
      {view === 'list' ? (
        <ul>
          {sorted.map((it) => (
            <li
              key={it.id}
              tabIndex={0}
              aria-selected={sel === it.id}
              onClick={() => setSel(it.id)}
              onDoubleClick={() => onOpen(it)}
              onKeyDown={(e) => key(e, it)}
              className={cn('flex cursor-default items-center gap-3 px-4 py-2 text-[13px] outline-none hover:bg-muted/60 focus-visible:bg-muted/60', sel === it.id && 'bg-accent hover:bg-accent')}
            >
              {iconOf(it.type)}
              <span className="min-w-0 flex-1 truncate font-medium">{it.name}</span>
              <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">{size(it.size)}</span>
              <span className="hidden w-24 text-right text-xs text-muted-foreground sm:block">{it.modified}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
          {sorted.map((it) => (
            <li
              key={it.id}
              tabIndex={0}
              aria-selected={sel === it.id}
              onClick={() => setSel(it.id)}
              onDoubleClick={() => onOpen(it)}
              onKeyDown={(e) => key(e, it)}
              className={cn('grid cursor-default justify-items-center gap-1.5 rounded-lg border border-transparent p-3 text-center text-xs outline-none hover:bg-muted/60 focus-visible:border-ring', sel === it.id && 'border-primary/30 bg-accent hover:bg-accent')}
            >
              <span className="grid size-12 place-items-center rounded-lg bg-muted [&_svg]:size-7">{iconOf(it.type)}</span>
              <span className="w-full truncate font-medium">{it.name}</span>
              <span className="text-[11px] text-muted-foreground">{it.type === 'folder' ? it.modified : size(it.size)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
