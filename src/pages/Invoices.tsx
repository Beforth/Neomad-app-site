import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search, XCircle, ChevronLeft, ChevronRight,
  Download, RefreshCw, AlertCircle, Plus, CheckCircle2, X, MoreHorizontal, BarChart3,
} from 'lucide-react';
import { getUsers, createInvoice, updateInvoice, uploadSignedCopy } from '../lib/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchInvoicesList,
  clearInvoicesError,
  resetInvoices,
  deleteInvoiceThunk,
  cancelInvoiceThunk,
  restoreInvoiceToPendingThunk,
  restoreDeletedInvoiceThunk,
  assignInvoiceThunk,
  confirmPaymentThunk,
} from '../features/invoices/invoicesSlice';
import { InvoiceDesktopRow } from '../components/invoices/InvoiceDesktopRow';
import { InvoiceMobileCard } from '../components/invoices/InvoiceMobileCard';
import SearchableSelect from '../components/SearchableSelect';
import { fakeDuration } from './invoices/invoiceShared';
import type { ApiInvoice } from '../lib/api';
import { INVOICES_PAGE_SUBTITLE, INVOICES_PAGE_TITLE } from '../components/invoices/InvoiceSectionFrame';
import { NEW_INVOICE_EVENT, appApi } from '../lib/appApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { Segmented } from '@/components/ui/segmented';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Invoices() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.invoices.items);
  const totalCount = useAppSelector((s) => s.invoices.total);
  const listStatus = useAppSelector((s) => s.invoices.status);
  const isRefreshing = useAppSelector((s) => s.invoices.isRefreshing);
  const listError = useAppSelector((s) => s.invoices.error);

  const invoices = items;
  const listLoading = listStatus === 'loading' && items.length === 0;

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => new URLSearchParams(window.location.search).get('status') || 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [invoiceTab, setInvoiceTab] = useState<'active' | 'deleted'>('active');
  const [boyFilter, setBoyFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageSize] = useState(20);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const updatePage = useCallback((newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const [availableAssignees, setAvailableAssignees] = useState<{ id: number; name: string }[]>([]);
  const [assignModalInvId, setAssignModalInvId] = useState<number | null>(null);
  const [assignTarget, setAssignTarget] = useState('');
  const [showMetrics, setShowMetrics] = useState(false);
  const [invoiceMetrics, setInvoiceMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ invoice_number: '', hospital_name: '', amount: '', description: '', assigned_to: '' });
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');

  const [completeTarget, setCompleteTarget] = useState<ApiInvoice | null>(null);
  const [completeFile, setCompleteFile] = useState<File | null>(null);
  const [completeUploadedUrl, setCompleteUploadedUrl] = useState('');
  const [completeBusy, setCompleteBusy] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [completeReplace, setCompleteReplace] = useState(false);

  const [previewImage, setPreviewImage] = useState<{ url: string; number: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const prevFiltersRef = useRef({
    searchDebounced, statusFilter, typeFilter, boyFilter, dateFilter, sortBy, sortOrder, invoiceTab,
  });

  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed =
      searchDebounced !== prev.searchDebounced ||
      statusFilter !== prev.statusFilter ||
      typeFilter !== prev.typeFilter ||
      boyFilter !== prev.boyFilter ||
      dateFilter !== prev.dateFilter ||
      sortBy !== prev.sortBy ||
      sortOrder !== prev.sortOrder ||
      invoiceTab !== prev.invoiceTab;
    prevFiltersRef.current = {
      searchDebounced, statusFilter, typeFilter, boyFilter, dateFilter, sortBy, sortOrder, invoiceTab,
    };
    if (!changed) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', '1');
      return next;
    }, { replace: true });
  }, [searchDebounced, statusFilter, typeFilter, boyFilter, dateFilter, sortBy, sortOrder, invoiceTab]);

  useEffect(() => {
    if (!token) return;
    const onNewInvoice = () => {
      dispatch(
        fetchInvoicesList({
          token,
          params: {
            sort_by: sortBy,
            sort_order: sortOrder,
            page: 1,
            page_size: pageSize,
            ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
            ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
            ...(typeFilter !== 'all' ? { invoice_type: typeFilter } : {}),
            ...(boyFilter !== 'all' ? { assigned_to: Number(boyFilter) } : {}),
            ...(dateFilter ? { date_from: dateFilter, date_to: dateFilter } : {}),
            ...(invoiceTab === 'deleted' ? { deleted: true } : {}),
          },
        })
      );
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', '1');
        return next;
      }, { replace: true });
    };
    window.addEventListener(NEW_INVOICE_EVENT, onNewInvoice);
    return () => window.removeEventListener(NEW_INVOICE_EVENT, onNewInvoice);
  }, [token, dispatch, sortBy, sortOrder, pageSize, searchDebounced, statusFilter, typeFilter, boyFilter, dateFilter, invoiceTab]);

  useEffect(() => {
    if (!token) {
      dispatch(resetInvoices());
      return;
    }
    dispatch(clearInvoicesError());
    dispatch(
      fetchInvoicesList({
        token,
        params: {
          sort_by: sortBy,
          sort_order: sortOrder,
          page,
          page_size: pageSize,
          ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(typeFilter !== 'all' ? { invoice_type: typeFilter } : {}),
          ...(boyFilter !== 'all' ? { assigned_to: Number(boyFilter) } : {}),
          ...(dateFilter ? { date_from: dateFilter, date_to: dateFilter } : {}),
          ...(invoiceTab === 'deleted' ? { deleted: true } : {}),
        },
      })
    );
  }, [
    token,
    dispatch,
    searchDebounced,
    statusFilter,
    typeFilter,
    boyFilter,
    dateFilter,
    sortBy,
    sortOrder,
    page,
    pageSize,
    invoiceTab,
  ]);

  useEffect(() => {
    if (items.length === 0 && totalCount > 0 && page > 1) {
      updatePage(Math.max(1, page - 1));
    }
  }, [items.length, totalCount, page, updatePage]);

  // Re-fetch metrics when date filter changes and panel is open
  useEffect(() => {
    if (!showMetrics) return;
    setMetricsLoading(true);
    const dateParams = dateFilter ? { date_from: dateFilter, date_to: dateFilter } : undefined;
    appApi.getInvoiceMetrics(dateParams).then(m => { setInvoiceMetrics(m); setMetricsLoading(false); }).catch(() => setMetricsLoading(false));
  }, [dateFilter, showMetrics]);

  useEffect(() => {
    if (!token || (user?.role !== 'admin' && user?.role !== 'manager')) return;
    getUsers(token, { role_code: 'delivery' })
      .then((users) => {
        setAvailableAssignees(
          users.map((u) => ({ id: u.id, name: u.full_name || u.email.split('@')[0] || String(u.id) }))
        );
      })
      .catch(() => setAvailableAssignees([]));
  }, [token, user?.role]);

  useEffect(() => {
    if (!assignModalInvId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setAssignModalInvId(null);
      setAssignTarget('');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [assignModalInvId]);

  const assigneeName = (inv: ApiInvoice) =>
    inv.assignee_name ?? availableAssignees.find((b) => b.id === inv.assigned_to)?.name ?? '—';

  const openInvoiceDetail = useCallback(
    (inv: ApiInvoice) => {
      dispatch(clearInvoicesError());
      navigate(`/invoices/${inv.id}?page=${page}`);
    },
    [dispatch, navigate, page]
  );

  const openSignedPreview = useCallback(
    (imageUrl: string, invoiceNumber: string) => {
      setPreviewImage({ url: imageUrl, number: invoiceNumber });
    },
    []
  );

  const downloadInvoice = useCallback((inv: ApiInvoice) => {
    if (!inv.signed_copy_url) return;
    const ext = inv.signed_copy_url.split('.').pop()?.split('?')[0] || 'file';
    const a = document.createElement('a');
    a.href = inv.signed_copy_url;
    a.download = `${inv.invoice_number || `invoice-${inv.id}`}.${ext}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const openConfirmPayment = useCallback(
    (inv: ApiInvoice) => {
      if (window.confirm(`Confirm payment for invoice ${inv.invoice_number}?`)) {
        if (!token) return;
        dispatch(clearInvoicesError());
        dispatch(confirmPaymentThunk({ token, invoice: inv })).catch(() => {});
      }
    },
    [dispatch, token]
  );

  const openAssign = useCallback(
    (invId: number) => {
      setAssignModalInvId(invId);
      setAssignTarget('');
    },
    []
  );

  const openVoid = useCallback(
    (inv: ApiInvoice) => {
      if (window.confirm(`Are you sure you want to void invoice ${inv.invoice_number}?`)) {
        if (!token) return;
        dispatch(clearInvoicesError());
        dispatch(cancelInvoiceThunk({ token, id: inv.id })).catch(() => {});
      }
    },
    [dispatch, token]
  );

  const openRestore = useCallback(
    (inv: ApiInvoice) => {
      if (
        window.confirm(
          `Restore invoice ${inv.invoice_number} to pending?\nIt will be unassigned and available for delivery staff to accept.`
        )
      ) {
        if (!token) return;
        dispatch(clearInvoicesError());
        dispatch(restoreInvoiceToPendingThunk({ token, id: inv.id })).catch(() => {});
      }
    },
    [dispatch, token]
  );

  const openDelete = useCallback(
    (inv: ApiInvoice) => {
      if (window.confirm(`Move invoice ${inv.invoice_number} to deleted invoices? You can recover it later.`)) {
        if (!token) return;
        dispatch(clearInvoicesError());
        dispatch(deleteInvoiceThunk({ token, id: inv.id })).catch(() => {});
      }
    },
    [dispatch, token]
  );

  const openRecoverDeleted = useCallback(
    (inv: ApiInvoice) => {
      if (window.confirm(`Recover deleted invoice ${inv.invoice_number}?`)) {
        if (!token) return;
        dispatch(clearInvoicesError());
        dispatch(restoreDeletedInvoiceThunk({ token, id: inv.id })).catch(() => {});
      }
    },
    [dispatch, token]
  );

  const openMarkComplete = useCallback(
    (inv: ApiInvoice) => {
      setCompleteTarget(inv);
      setCompleteFile(null);
      setCompleteUploadedUrl('');
      setCompleteError('');
      setCompleteReplace(false);
    },
    []
  );

  const openReupload = useCallback(
    (inv: ApiInvoice) => {
      setCompleteTarget(inv);
      setCompleteFile(null);
      setCompleteUploadedUrl('');
      setCompleteError('');
      setCompleteReplace(true);
    },
    []
  );

  const filtered = useMemo(
    () => typeFilter === 'all' ? invoices : invoices.filter((i) => i.invoice_type === typeFilter),
    [invoices, typeFilter]
  );
  const handleExport = useCallback(() => {
    const rows = filtered;
    if (rows.length === 0) return;
    const escapeCsv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'Invoice Number',
      'Type',
      'Hospital Name',
      'Amount',
      'Status',
      'Assigned To',
      'Cash Received',
      'Cheque Received',
      'Created At',
      'Delivered At',
    ];
    const body = rows.map((inv) => [
      inv.invoice_number,
      inv.invoice_type ?? '',
      inv.hospital_name,
      inv.amount,
      inv.status,
      assigneeName(inv),
      inv.cash_received ?? 0,
      inv.cheque_received ?? 0,
      inv.created_at,
      inv.delivered_at ?? '',
    ]);
    const csv = [header, ...body]
      .map((line) => line.map(escapeCsv).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [filtered, assigneeName]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalCount);

  const refreshList = () => {
    if (!token) return;
    dispatch(
      fetchInvoicesList({
        token,
        params: {
          sort_by: sortBy,
          sort_order: sortOrder,
          page,
          page_size: pageSize,
          ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(boyFilter !== 'all' ? { assigned_to: Number(boyFilter) } : {}),
          ...(dateFilter ? { date_from: dateFilter, date_to: dateFilter } : {}),
          ...(invoiceTab === 'deleted' ? { deleted: true } : {}),
        },
      })
    );
  };
  const toggleMetrics = () => {
    if (!showMetrics || !invoiceMetrics) {
      setMetricsLoading(true);
      const dateParams = dateFilter ? { date_from: dateFilter, date_to: dateFilter } : undefined;
      appApi.getInvoiceMetrics(dateParams).then((m: any) => { setInvoiceMetrics(m); setMetricsLoading(false); });
    }
    setShowMetrics((v) => !v);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={INVOICES_PAGE_TITLE} description={INVOICES_PAGE_SUBTITLE} className="mb-1" actions={<>
        <Button variant="ghost" size="icon" type="button" data-hotkey-refresh="" aria-label="Refresh" title="Refresh (r)"
          disabled={listLoading || isRefreshing}
          onClick={refreshList}>
          <RefreshCw className={listLoading || isRefreshing ? 'animate-spin' : ''} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More"><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem disabled={filtered.length === 0} onSelect={handleExport}><Download /> Export CSV</DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleMetrics}><BarChart3 /> {showMetrics ? 'Hide metrics' : 'Show metrics'}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Button type="button" data-hotkey-new="" onClick={() => { setShowCreateModal(true); setCreateError(''); }}>
            <Plus /> New invoice
          </Button>
        )}
      </>} />
      {listError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-2 rounded-lg flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertCircle size={16} /> {listError}
          </span>
          <button
            type="button"
            onClick={() => dispatch(clearInvoicesError())}
            className="text-xs font-semibold text-destructive hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[
            { value: 'all', label: <>All</> },
            { value: 'pending', label: <>Pending</> },
            { value: 'assigned', label: <>Assigned</> },
            { value: 'delivered', label: <>Delivered</> },
            { value: 'completed', label: <>Completed</> },
            { value: 'cancelled', label: <>Cancelled</> },
          ]}
        />
        <Segmented
          value={invoiceTab}
          onValueChange={(v) => { setInvoiceTab(v as 'active' | 'deleted'); updatePage(1); }}
          options={[
            { value: 'active', label: <>Active</> },
            { value: 'deleted', label: <>Deleted</> },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input
            data-search=""
            className="w-full pl-9"
            type="text"
            placeholder="Search invoice, hospital…   ( / )"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SearchableSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'all', label: 'All types' },
            { value: 'challan', label: 'Challan' },
            { value: 'price_difference', label: 'Price Diff' },
            { value: 'sale_bill', label: 'Sale Bill' },
            { value: 'sale_return_credit_note', label: 'Sale Return' },
          ]}
          className="w-[150px]"
        />
        <SearchableSelect
          value={boyFilter}
          onChange={setBoyFilter}
          options={[
            { value: 'all', label: 'All riders' },
            ...availableAssignees.map((b) => ({ value: String(b.id), label: b.name })),
          ]}
          className="w-[170px]"
        />
        <Input className="w-[150px]" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} aria-label="Date" />
        {(search || statusFilter !== 'all' || typeFilter !== 'all' || boyFilter !== 'all' || dateFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setBoyFilter('all'); setDateFilter(''); }}>
            <XCircle /> Clear
          </Button>
        )}
      </div>

      {/* Invoice Metrics */}
      {showMetrics && (
        <Card className="p-4" >
          {metricsLoading ? (
            <p className="text-xs text-muted-foreground/70">Loading metrics…</p>
          ) : invoiceMetrics && (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase">Total</span>
                  <span className="text-lg font-semibold text-foreground">{invoiceMetrics.totalCount}</span>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase">Today</span>
                  <span className="text-lg font-semibold text-primary">{invoiceMetrics.todayCount}</span>
                </div>
              </div>

              {/* Per-type */}
              <div>
                <span className="text-xs font-medium text-muted-foreground/70">By Type</span>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {invoiceMetrics.typeCounts.map((t: any) => (
                    <span key={t.type} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted text-xs font-medium text-foreground/85">
                      {t.label}
                      <span className="font-semibold text-foreground">{t.count}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Per-boy */}
              <div>
                <span className="text-xs font-medium text-muted-foreground/70">Per Delivery Boy</span>
                <div className="overflow-x-auto mt-1.5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Boy</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Return</TableHead>
                        <TableHead>Cancelled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceMetrics.perBoy.map((b: any) => (
                        <TableRow key={b.id} className="">
                          <TableCell className="font-medium text-foreground">{b.name}</TableCell>
                          <TableCell className="font-semibold text-foreground">{b.total}</TableCell>
                          <TableCell className="text-warning font-medium">{b.pending}</TableCell>
                          <TableCell className="text-info font-medium">{b.assigned}</TableCell>
                          <TableCell className="text-primary font-medium">{b.completed}</TableCell>
                          <TableCell className="text-purple-600 font-medium">{b.return}</TableCell>
                          <TableCell className="text-destructive font-medium">{b.cancelled}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="overflow-hidden" >
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => { setSortBy('amount'); setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); }}
                >
                  Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => { setSortBy('status'); setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); }}
                >
                  Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Rider</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => { setSortBy('created_at'); setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); }}
                >
                  Created {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((invoice) => {
                  const dur = fakeDuration(invoice);
                  return (
                    <InvoiceDesktopRow
                      key={invoice.id}
                      invoice={invoice}
                      assigneeLabel={assigneeName(invoice)}
                      travel={dur?.travel || '—'}
                      waiting={dur?.waiting || '—'}
                      userRole={user?.role}
                      onOpenDetail={openInvoiceDetail}
                      onOpenSignedPreview={openSignedPreview}
                      onDownloadInvoice={downloadInvoice}
                      onConfirmPayment={openConfirmPayment}
                      onAssign={openAssign}
                      onRequestCancel={openVoid}
                      onRequestRestore={openRestore}
                      onRequestDelete={openDelete}
                      onRequestRecoverDeleted={invoiceTab === 'deleted' ? openRecoverDeleted : undefined}
                      onMarkComplete={openMarkComplete}
                      onReupload={invoice.signed_copy_url ? openReupload : undefined}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {listLoading ? (
            <div className="p-8 text-center text-muted-foreground/70 text-sm">Loading...</div>
          ) : (
            filtered.map((invoice) => (
              <InvoiceMobileCard
                key={invoice.id}
                invoice={invoice}
                assigneeLabel={assigneeName(invoice)}
                onOpenDetail={openInvoiceDetail}
              />
            ))
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{startRow}</span>–<span className="font-semibold text-foreground">{endRow}</span> of{' '}
          <span className="font-semibold text-foreground">{totalCount}</span> invoices
          {totalPages > 1 && (
            <span className="ml-2 text-muted-foreground/70">
              (page {page} of {totalPages})
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm"
            type="button"
            onClick={() => updatePage(Math.max(1, page - 1))}
            disabled={page <= 1 || listLoading || isRefreshing}
            
            aria-label="Previous page"
          >
            <ChevronLeft size={18} className="text-foreground/70" />
          </Button>
          <Button variant="outline" size="icon-sm"
            type="button"
            onClick={() => updatePage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || listLoading || isRefreshing}
            
            aria-label="Next page"
          >
            <ChevronRight size={18} className="text-foreground/70" />
          </Button>
        </div>
      </div>

      {assignModalInvId && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-sm overflow-hidden flex flex-col">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted relative">
              <h3 className="font-semibold text-foreground">Assign Invoice</h3>
              <button 
                onClick={() => setAssignModalInvId(null)} 
                className="text-muted-foreground/70 hover:text-foreground/70 absolute right-4"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <SearchableSelect
                value={assignTarget}
                onChange={setAssignTarget}
                options={[
                  { value: '', label: 'Select assignee...' },
                  ...availableAssignees.map((b) => ({ value: String(b.id), label: b.name })),
                ]}
                className="w-full"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" 
                  onClick={() => setAssignModalInvId(null)} 
                  
                >
                  Cancel
                </Button>
                <Button size="sm" 
                  disabled={!assignTarget}
                  onClick={() => {
                    if (!token) return;
                    dispatch(clearInvoicesError());
                    dispatch(assignInvoiceThunk({ token, id: assignModalInvId, assignedTo: Number(assignTarget) })).catch(() => {});
                    setAssignModalInvId(null);
                    setAssignTarget('');
                  }}
                  
                >
                  Assign
                </Button>
              </div>
            </div>
          </DialogContent>
</Dialog>
      )}

      {showCreateModal && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-md overflow-hidden flex flex-col">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted relative">
              <h3 className="font-semibold text-foreground">Create Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground/70 hover:text-foreground/70 absolute right-4">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {createError && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{createError}</p>}
              <Input className="w-full"
                type="text" placeholder="Invoice number *" value={createForm.invoice_number}
                onChange={(e) => setCreateForm({ ...createForm, invoice_number: e.target.value })}
                
              />
              <Input className="w-full"
                type="text" placeholder="Hospital / Entity *" value={createForm.hospital_name}
                onChange={(e) => setCreateForm({ ...createForm, hospital_name: e.target.value })}
                
              />
              <Input className="w-full"
                type="number" step="0.01" min="0" placeholder="Amount" value={createForm.amount}
                onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                
              />
              <Input className="w-full"
                type="text" placeholder="Description (optional)" value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                
              />
              <SearchableSelect
                value={createForm.assigned_to}
                onChange={(v) => setCreateForm({ ...createForm, assigned_to: v })}
                options={[
                  { value: '', label: 'No assignment (pending)' },
                  ...availableAssignees.map((b) => ({ value: String(b.id), label: b.name })),
                ]}
                className="w-full"
              />
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)} >
                  Cancel
                </Button>
                <Button variant="dark" size="sm"
                  disabled={createBusy || !createForm.invoice_number.trim() || !createForm.hospital_name.trim()}
                  onClick={async () => {
                    if (!token) return;
                    setCreateBusy(true);
                    setCreateError('');
                    try {
                      await createInvoice(token, {
                        invoice_number: createForm.invoice_number.trim(),
                        hospital_name: createForm.hospital_name.trim(),
                        amount: createForm.amount ? Number(createForm.amount) : 0,
                        description: createForm.description.trim() || undefined,
                        assigned_to: createForm.assigned_to ? Number(createForm.assigned_to) : undefined,
                      });
                      setShowCreateModal(false);
                      setCreateForm({ invoice_number: '', hospital_name: '', amount: '', description: '', assigned_to: '' });
                      dispatch(fetchInvoicesList({
                        token,
                        params: {
                          sort_by: sortBy, sort_order: sortOrder, page, page_size: pageSize,
                          ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
                          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
                          ...(typeFilter !== 'all' ? { invoice_type: typeFilter } : {}),
                          ...(boyFilter !== 'all' ? { assigned_to: Number(boyFilter) } : {}),
                          ...(dateFilter ? { date_from: dateFilter, date_to: dateFilter } : {}),
                          ...(invoiceTab === 'deleted' ? { deleted: true } : {}),
                        },
                      }));
                    } catch (e: any) {
                      setCreateError(e.message || 'Failed to create invoice');
                    } finally {
                      setCreateBusy(false);
                    }
                  }}
                  
                >
                  {createBusy ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
</Dialog>
      )}

      {completeTarget && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-md overflow-hidden flex flex-col">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted relative">
              <h3 className="font-semibold text-foreground">Mark Complete</h3>
              <button onClick={() => setCompleteTarget(null)} className="text-muted-foreground/70 hover:text-foreground/70 absolute right-4">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {completeError && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{completeError}</p>}
              <p className="text-xs text-foreground/70">
                Invoice: <span className="font-semibold text-foreground">{completeTarget.invoice_number}</span>
              </p>

              {(() => {
                const existingCopy = completeTarget.signed_copy_url;
                if (existingCopy && !completeReplace && !completeUploadedUrl) {
                  return (
                    <div className="space-y-2">
                      <p className="text-xs text-primary flex items-center gap-1">
                        <CheckCircle2 size={14} /> Signed copy already uploaded
                      </p>
                      <button
                        type="button"
                        onClick={() => setCompleteReplace(true)}
                        className="text-xs font-semibold text-warning hover:text-warning underline"
                      >
                        Replace with a different image
                      </button>
                    </div>
                  );
                }
                if (completeUploadedUrl) {
                  return (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <CheckCircle2 size={14} /> New signed copy uploaded
                    </p>
                  );
                }
                return (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Upload signed copy *</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setCompleteFile(e.target.files?.[0] ?? null)}
                      className="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-[13px] file:font-medium hover:file:bg-accent"
                    />
                  </div>
                );
              })()}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setCompleteTarget(null)} >
                  Cancel
                </Button>
                <Button size="sm"
                  disabled={completeBusy || (!completeFile && !completeUploadedUrl && (!completeTarget.signed_copy_url || completeReplace))}
                  onClick={async () => {
                    if (!token) return;
                    setCompleteBusy(true);
                    setCompleteError('');
                    try {
                      let signed_copy_url: string | undefined;
                      if (completeFile) {
                        const result = await uploadSignedCopy(token, completeTarget.id, completeFile);
                        signed_copy_url = result.signed_copy_url;
                      } else if (completeUploadedUrl) {
                        signed_copy_url = completeUploadedUrl;
                      }
                      await updateInvoice(token, completeTarget.id, { status: 'completed', signed_copy_url } as any);
                      setCompleteTarget(null);
                      setCompleteFile(null);
                      setCompleteUploadedUrl('');
                      dispatch(fetchInvoicesList({
                        token,
                        params: {
                          sort_by: sortBy, sort_order: sortOrder, page, page_size: pageSize,
                          ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
                          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
                          ...(typeFilter !== 'all' ? { invoice_type: typeFilter } : {}),
                          ...(boyFilter !== 'all' ? { assigned_to: Number(boyFilter) } : {}),
                          ...(dateFilter ? { date_from: dateFilter, date_to: dateFilter } : {}),
                          ...(invoiceTab === 'deleted' ? { deleted: true } : {}),
                        },
                      }));
                    } catch (e: any) {
                      setCompleteError(e.message || 'Failed to mark complete');
                    } finally {
                      setCompleteBusy(false);
                    }
                  }}
                  
                >
                  {completeBusy ? 'Completing…' : <><CheckCircle2 size={14} /> Complete</>}
                </Button>
              </div>
            </div>
          </DialogContent>
</Dialog>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-3xl overflow-hidden"
            
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <span className="text-xs font-semibold text-foreground/70">Signed copy — {previewImage.number}</span>
              <Button variant="ghost" size="icon-sm"
                type="button"
                onClick={() => setPreviewImage(null)}
                
                aria-label="Close preview"
              >
                <X size={18} />
              </Button>
            </div>
            <div className="p-4 flex justify-center bg-muted/30 max-h-[80vh] overflow-auto">
              <img
                src={previewImage.url}
                alt={`Signed copy — ${previewImage.number}`}
                className="max-w-full h-auto object-contain rounded-lg"
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
