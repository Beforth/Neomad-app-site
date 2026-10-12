import * as React from 'react';
import { ChevronRightIcon } from './icons';
import { cn } from '@/lib/utils';

export interface TreeRow {
  id: string;
  children?: TreeRow[];
  [key: string]: unknown;
}
export interface TreeColumn<T extends TreeRow> {
  key: string;
  header: React.ReactNode;
  /** The first column holds the expand arrow and indents by depth. */
  render?: (row: T, depth: number) => React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

/** Table whose rows can have child rows. Click the arrow (or press Right and Left on a row) to open and close a branch. */
export function TreeTable<T extends TreeRow>({
  rows,
  columns,
  defaultExpanded = [],
  onRowClick,
  className,
}: {
  rows: T[];
  columns: TreeColumn<T>[];
  /** Ids of rows that start open. Use `'all'` to open everything. */
  defaultExpanded?: string[] | 'all';
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState<Set<string>>(() => {
    if (defaultExpanded !== 'all') return new Set(defaultExpanded);
    const ids = new Set<string>();
    const walk = (list: TreeRow[]) => list.forEach((r) => { if (r.children?.length) { ids.add(r.id); walk(r.children); } });
    walk(rows);
    return ids;
  });
  const flip = (id: string, to?: boolean) => setOpen((s) => { const n = new Set(s); (to ?? !n.has(id)) ? n.add(id) : n.delete(id); return n; });

  const flat: { row: T; depth: number }[] = [];
  const walk = (list: TreeRow[], depth: number) => list.forEach((r) => { flat.push({ row: r as T, depth }); if (r.children?.length && open.has(r.id)) walk(r.children, depth + 1); });
  walk(rows, 0);

  return (
    <div className={cn('overflow-x-auto rounded-xl border bg-card', className)}>
      <table role="treegrid" className="w-full text-[13px]">
        <thead>
          <tr className="border-b bg-muted/40">
            {columns.map((c) => <th key={c.key} scope="col" className={cn('px-3 py-2 text-xs font-medium text-muted-foreground', c.align === 'end' ? 'text-end' : 'text-start', c.className)}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {flat.map(({ row, depth }) => {
            const branch = !!row.children?.length;
            const isOpen = open.has(row.id);
            return (
              <tr
                key={row.id}
                role="row"
                aria-level={depth + 1}
                aria-expanded={branch ? isOpen : undefined}
                tabIndex={0}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' && branch) { e.preventDefault(); flip(row.id, true); }
                  else if (e.key === 'ArrowLeft' && branch) { e.preventDefault(); flip(row.id, false); }
                  else if (e.key === 'ArrowDown') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus(); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); (e.currentTarget.previousElementSibling as HTMLElement | null)?.focus(); }
                }}
                className={cn('border-b outline-none transition-colors last:border-0 hover:bg-secondary/40 focus-visible:bg-secondary/60', onRowClick && 'cursor-pointer')}
              >
                {columns.map((c, i) => (
                  <td key={c.key} className={cn('px-3 py-2', c.align === 'end' && 'text-end tabular-nums', depth === 0 && branch && i === 0 && 'font-medium', c.className)}>
                    {i === 0 ? (
                      <span className="flex items-center gap-1.5" style={{ paddingInlineStart: depth * 20 }}>
                        {branch ? (
                          <button type="button" tabIndex={-1} aria-label={isOpen ? 'Collapse' : 'Expand'} onClick={(e) => { e.stopPropagation(); flip(row.id); }} className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-secondary">
                            <ChevronRightIcon className={cn('size-3.5 transition-transform duration-200 rtl:-scale-x-100', isOpen && 'rotate-90')} />
                          </button>
                        ) : <span className="size-5 shrink-0" />}
                        {c.render ? c.render(row, depth) : String(row[c.key] ?? '')}
                      </span>
                    ) : c.render ? c.render(row, depth) : String(row[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
