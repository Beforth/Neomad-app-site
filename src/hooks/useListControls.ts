/**
 * Server-driven search / sort / pagination state for listing pages.
 *
 * The API does the filtering, so every change here re-fetches. Search is
 * debounced to avoid a request per keystroke, and changing the search, sort or
 * page size resets back to page 1 — otherwise you can land on an empty page.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

export type SortOrder = 'asc' | 'desc';

export interface ListQuery {
  search?: string;
  sort_by?: string;
  sort_order?: SortOrder;
  page: number;
  page_size: number;
}

/** The envelope paginated endpoints return; plain arrays are also accepted. */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export function isPaged<T>(v: Paged<T> | T[]): v is Paged<T> {
  return !Array.isArray(v) && Array.isArray((v as Paged<T>).items);
}

interface Options {
  defaultSortBy?: string;
  defaultSortOrder?: SortOrder;
  pageSize?: number;
  /** Milliseconds to wait after typing stops before searching. */
  debounceMs?: number;
}

export function useListControls({
  defaultSortBy,
  defaultSortOrder = 'asc',
  pageSize = 25,
  debounceMs = 350,
}: Options = {}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | undefined>(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(t);
  }, [search, debounceMs]);

  // A new search term almost never has as many pages as the old one.
  useEffect(() => { setPage(1); }, [debouncedSearch, size]);

  /** Click a column: same column flips direction, a new column starts ascending. */
  const toggleSort = useCallback((field: string) => {
    setSortBy((current) => {
      if (current === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortOrder('asc');
      return field;
    });
    setPage(1);
  }, []);

  const query = useMemo<ListQuery>(() => ({
    search: debouncedSearch.trim() || undefined,
    sort_by: sortBy,
    sort_order: sortBy ? sortOrder : undefined,
    page,
    page_size: size,
  }), [debouncedSearch, sortBy, sortOrder, page, size]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  /** Feed a list response back in; returns the rows regardless of shape. */
  const absorb = useCallback(<T,>(res: Paged<T> | T[]): T[] => {
    if (isPaged(res)) {
      setTotal(res.total);
      return res.items;
    }
    setTotal(res.length);
    return res;
  }, []);

  return {
    search, setSearch,
    sortBy, sortOrder, toggleSort,
    page, setPage, totalPages,
    pageSize: size, setPageSize: setSize,
    total, setTotal,
    query, absorb,
    /** True while the debounce is still pending. */
    searchPending: search !== debouncedSearch,
  };
}

/** Serialise a ListQuery into URL params, omitting empty values. */
export function toQueryString(q: ListQuery): string {
  const p = new URLSearchParams();
  if (q.search) p.set('search', q.search);
  if (q.sort_by) p.set('sort_by', q.sort_by);
  if (q.sort_order) p.set('sort_order', q.sort_order);
  p.set('page', String(q.page));
  p.set('page_size', String(q.page_size));
  return p.toString();
}
