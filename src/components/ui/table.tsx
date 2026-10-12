import * as React from 'react';
import { cn } from '@/lib/utils';

/** Move focus between body rows with the arrow keys (or j / k); Home / End jump to the first / last row. */
function onTableKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
  const t = e.target as HTMLElement;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
  const keys = ['ArrowDown', 'ArrowUp', 'j', 'k', 'Home', 'End'];
  if (!keys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
  const row = t.closest('tbody tr[data-row]') as HTMLElement | null;
  const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('tbody tr[data-row]'));
  if (!rows.length) return;
  if (!row && (e.key === 'j' || e.key === 'k')) return;
  const i = row ? rows.indexOf(row) : -1;
  let next = i;
  if (e.key === 'ArrowDown' || e.key === 'j') next = Math.min(rows.length - 1, i + 1);
  else if (e.key === 'ArrowUp' || e.key === 'k') next = Math.max(0, i - 1);
  else if (e.key === 'Home') next = 0;
  else next = rows.length - 1;
  e.preventDefault();
  rows[next]?.focus();
  rows[next]?.scrollIntoView({ block: 'nearest' });
}

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string; wrapperStyle?: React.CSSProperties }>(
  ({ className, wrapperClassName, wrapperStyle, ...props }, ref) => (
    <div className={cn('relative w-full overflow-x-auto', wrapperClassName)} style={wrapperStyle} onKeyDown={onTableKeyDown}>
      <table ref={ref} className={cn('w-full caption-bottom text-[13px]', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('[&_tr]:border-b', className)} {...props} />
);
export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);
/**
 * Body rows are focusable (arrow keys move between them, see Table). Pressing . or m opens the row's actions menu (a button marked `data-row-menu`). Pressing Enter on a row clicks its
 * `data-primary` element, else its first link, else the row's own onClick.
 */
export const TableRow = ({ className, onKeyDown, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    data-row=""
    tabIndex={props.tabIndex ?? (props.onClick ? 0 : -1)}
    onKeyDown={(e) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || e.target !== e.currentTarget) return;
      if (e.key === '.' || e.key === 'm') {
        const menu = e.currentTarget.querySelector<HTMLElement>('[data-row-menu]');
        if (menu) {
          e.preventDefault();
          menu.focus();
          // Radix menus open on pointer-down or a key press, not on click().
          menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
        }
        return;
      }
      if (e.key === 'Enter' || (e.key === ' ' && props.onClick)) {
        const primary = e.currentTarget.querySelector<HTMLElement>('[data-primary], a[href]');
        if (primary) { e.preventDefault(); primary.click(); }
        else if (props.onClick) { e.preventDefault(); e.currentTarget.click(); }
      }
    }}
    className={cn('border-b outline-none transition-colors hover:bg-muted/70 focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 data-[state=selected]:bg-accent', className)}
    {...props}
  />
);
export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn('h-9 whitespace-nowrap px-4 text-left align-middle text-[11px] font-medium uppercase tracking-wider text-muted-foreground', className)}
    {...props}
  />
);
export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-4 py-2.5 align-middle', className)} {...props} />
);
export const TableFooter = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tfoot className={cn('border-t bg-muted/50 font-medium [&_td]:py-2', className)} {...props} />
);
export const TableCaption = ({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) => (
  <caption className={cn('mt-3 text-xs text-muted-foreground', className)} {...props} />
);
