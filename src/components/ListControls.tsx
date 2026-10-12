/**
 * Shared toolbar pieces for server-driven listing pages: a search box, sortable
 * table headers and a pager. Pair with `useListControls`.
 */
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ArrowUp, ArrowDown, Search, X } from 'lucide-react';
import type { SortOrder } from '../hooks/useListControls';
import { TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input, selectClass } from '@/components/ui/input';

export function SearchInput({
  value, onChange, placeholder = 'Search…', pending = false,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; pending?: boolean;
}) {
  return (
    <div className="relative flex-1 min-w-[180px] max-w-sm">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none" />
      <Input className="w-full pl-9 pr-8"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground/70 hover:text-foreground/70"
        >
          <X size={14} />
        </button>
      )}
      {pending && (
        <span className="absolute -bottom-4 left-1 text-[11px] text-muted-foreground/70">searching…</span>
      )}
    </div>
  );
}

/** A `<select>` filter. Pass `''` as the value for "all". */
export function FilterSelect({
  value, onChange, options, allLabel = 'All', label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  label?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={selectClass}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Clickable table header that drives server-side sorting. */
export function SortableTh({
  field, sortBy, sortOrder, onSort, children, align = 'left', className = '',
}: {
  field: string;
  sortBy?: string;
  sortOrder: SortOrder;
  onSort: (field: string) => void;
  children: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const active = sortBy === field;
  const Icon = !active ? ChevronsUpDown : sortOrder === 'asc' ? ArrowUp : ArrowDown;
  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <TableHead className={`${className}`} aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 ${justify} w-full text-xs font-bold uppercase tracking-wide transition-colors ${
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/85'
        }`}
      >
        {children}
        <Icon size={13} className={active ? 'text-primary' : 'text-muted-foreground/50'} />
      </button>
    </TableHead>
  );
}

export function Pagination({
  page, totalPages, total, pageSize, onPage, onPageSize,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize?: (n: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-border bg-muted/50">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground/85">{from}–{to}</span> of{' '}
        <span className="font-semibold text-foreground/85">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {onPageSize && (
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            aria-label="Rows per page"
            className={selectClass}
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        )}
        <Button variant="outline" size="sm"
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          
        >
          <ChevronLeft size={14} /> Previous
        </Button>
        <span className="text-xs text-muted-foreground px-1">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm"
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          
        >
          Next <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
