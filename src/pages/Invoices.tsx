import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search, XCircle, ChevronLeft, ChevronRight,
  Download, RefreshCw, AlertCircle, Plus, CheckCircle2, X,
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
  const [statusFilter, setStatusFilter] = useState('all');
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{INVOICES_PAGE_TITLE}</h1>
          <p className="text-xs text-zinc-500 font-medium">{INVOICES_PAGE_SUBTITLE}</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
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
            }}
            disabled={listLoading || isRefreshing}
            className="bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={listLoading || isRefreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Download size={14} />Export
          </button>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button
              type="button"
              onClick={() => { setShowCreateModal(true); setCreateError(''); }}
              className="bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={14} /> Create Invoice
            </button>
          )}
        </div>
      </header>
      {listError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertCircle size={16} /> {listError}
          </span>
          <button
            type="button"
            onClick={() => dispatch(clearInvoicesError())}
            className="text-xs font-bold text-red-800 hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="flex rounded-lg bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => {
              setInvoiceTab('active');
              updatePage(1);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold ${invoiceTab === 'active' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
          >
            Active invoices
          </button>
          <button
            type="button"
            onClick={() => {
              setInvoiceTab('deleted');
              updatePage(1);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold ${invoiceTab === 'deleted' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
          >
            Deleted invoices
          </button>
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input
            type="text"
            placeholder="Search tasks / entities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
          />
        </div>
        <SearchableSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'assigned', label: 'Assigned' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          className="min-w-[150px]"
        />
        <SearchableSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'challan', label: 'Challan' },
            { value: 'price_difference', label: 'Price Diff' },
            { value: 'sale_bill', label: 'Sale Bill' },
            { value: 'sale_return_credit_note', label: 'Sale Return' },
          ]}
          className="min-w-[150px]"
        />
        <SearchableSelect
          value={boyFilter}
          onChange={setBoyFilter}
          options={[
            { value: 'all', label: 'All Assignees' },
            ...availableAssignees.map((b) => ({ value: String(b.id), label: b.name })),
          ]}
          className="min-w-[180px]"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer"
        />
        <button onClick={() => {
          if (!showMetrics || !invoiceMetrics) {
            setMetricsLoading(true);
            const dateParams = dateFilter ? { date_from: dateFilter, date_to: dateFilter } : undefined;
            appApi.getInvoiceMetrics(dateParams).then(m => { setInvoiceMetrics(m); setMetricsLoading(false); });
          }
          setShowMetrics(v => !v);
        }} className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors flex items-center gap-1.5">
          📊 Metrics
        </button>
        {(search || statusFilter !== 'all' || typeFilter !== 'all' || boyFilter !== 'all' || dateFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setTypeFilter('all');
              setBoyFilter('all');
              setDateFilter('');
            }}
            className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1"
          >
            <XCircle size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Invoice Metrics */}
      {showMetrics && (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-4">
          {metricsLoading ? (
            <p className="text-xs text-zinc-400">Loading metrics…</p>
          ) : invoiceMetrics && (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Total</span>
                  <span className="text-lg font-bold text-zinc-900">{invoiceMetrics.totalCount}</span>
                </div>
                <div className="w-px h-6 bg-zinc-200" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Today</span>
                  <span className="text-lg font-bold text-emerald-600">{invoiceMetrics.todayCount}</span>
                </div>
              </div>

              {/* Per-type */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">By Type</span>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {invoiceMetrics.typeCounts.map((t: any) => (
                    <span key={t.type} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-50 text-xs font-medium text-zinc-700">
                      {t.label}
                      <span className="font-bold text-zinc-900">{t.count}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Per-boy */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Per Delivery Boy</span>
                <div className="overflow-x-auto mt-1.5">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] font-bold text-zinc-400 uppercase border-b border-zinc-50">
                        <th className="py-1.5 pr-3">Boy</th>
                        <th className="py-1.5 pr-3">Total</th>
                        <th className="py-1.5 pr-3 text-amber-600">Pending</th>
                        <th className="py-1.5 pr-3 text-blue-600">Assigned</th>
                        <th className="py-1.5 pr-3 text-emerald-600">Completed</th>
                        <th className="py-1.5 pr-3 text-purple-600">Return</th>
                        <th className="py-1.5 pr-3 text-red-600">Cancelled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceMetrics.perBoy.map((b: any) => (
                        <tr key={b.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                          <td className="py-1.5 pr-3 font-medium text-zinc-900">{b.name}</td>
                          <td className="py-1.5 pr-3 font-bold text-zinc-900">{b.total}</td>
                          <td className="py-1.5 pr-3 text-amber-600 font-medium">{b.pending}</td>
                          <td className="py-1.5 pr-3 text-blue-600 font-medium">{b.assigned}</td>
                          <td className="py-1.5 pr-3 text-emerald-600 font-medium">{b.completed}</td>
                          <td className="py-1.5 pr-3 text-purple-600 font-medium">{b.return}</td>
                          <td className="py-1.5 pr-3 text-red-600 font-medium">{b.cancelled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Invoice / ID</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Task / Entity</th>
                <th
                  className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600"
                  onClick={() => {
                    setSortBy('amount');
                    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                  }}
                >
                  Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600"
                  onClick={() => {
                    setSortBy('status');
                    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                  }}
                >
                  Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Signed Copy</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Assigned To</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Travel</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Waiting</th>
                <th
                  className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600"
                  onClick={() => {
                    setSortBy('created_at');
                    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                  }}
                >
                  Date {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {listLoading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-xs text-zinc-400">
                    Loading invoices...
                  </td>
                </tr>
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
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-zinc-100">
          {listLoading ? (
            <div className="p-8 text-center text-zinc-400 text-sm">Loading...</div>
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
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-zinc-500">
          Showing <span className="font-bold text-zinc-900">{startRow}</span>–<span className="font-bold text-zinc-900">{endRow}</span> of{' '}
          <span className="font-bold text-zinc-900">{totalCount}</span> invoices
          {totalPages > 1 && (
            <span className="ml-2 text-zinc-400">
              (page {page} of {totalPages})
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updatePage(Math.max(1, page - 1))}
            disabled={page <= 1 || listLoading || isRefreshing}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} className="text-zinc-600" />
          </button>
          <button
            type="button"
            onClick={() => updatePage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || listLoading || isRefreshing}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight size={18} className="text-zinc-600" />
          </button>
        </div>
      </div>

      {assignModalInvId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 relative">
              <h3 className="font-bold text-zinc-900">Assign Invoice</h3>
              <button 
                onClick={() => setAssignModalInvId(null)} 
                className="text-zinc-400 hover:text-zinc-600 absolute right-4"
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
                <button 
                  onClick={() => setAssignModalInvId(null)} 
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button 
                  disabled={!assignTarget}
                  onClick={() => {
                    if (!token) return;
                    dispatch(clearInvoicesError());
                    dispatch(assignInvoiceThunk({ token, id: assignModalInvId, assignedTo: Number(assignTarget) })).catch(() => {});
                    setAssignModalInvId(null);
                    setAssignTarget('');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 relative">
              <h3 className="font-bold text-zinc-900">Create Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-zinc-600 absolute right-4">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {createError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>}
              <input
                type="text" placeholder="Invoice number *" value={createForm.invoice_number}
                onChange={(e) => setCreateForm({ ...createForm, invoice_number: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5"
              />
              <input
                type="text" placeholder="Hospital / Entity *" value={createForm.hospital_name}
                onChange={(e) => setCreateForm({ ...createForm, hospital_name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5"
              />
              <input
                type="number" step="0.01" min="0" placeholder="Amount" value={createForm.amount}
                onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5"
              />
              <input
                type="text" placeholder="Description (optional)" value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5"
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
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50">
                  Cancel
                </button>
                <button
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
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 disabled:opacity-50"
                >
                  {createBusy ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {completeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 relative">
              <h3 className="font-bold text-zinc-900">Mark Complete</h3>
              <button onClick={() => setCompleteTarget(null)} className="text-zinc-400 hover:text-zinc-600 absolute right-4">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {completeError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{completeError}</p>}
              <p className="text-xs text-zinc-600">
                Invoice: <span className="font-bold text-zinc-900">{completeTarget.invoice_number}</span>
              </p>

              {(() => {
                const existingCopy = completeTarget.signed_copy_url;
                if (existingCopy && !completeReplace && !completeUploadedUrl) {
                  return (
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={14} /> Signed copy already uploaded
                      </p>
                      <button
                        type="button"
                        onClick={() => setCompleteReplace(true)}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 underline"
                      >
                        Replace with a different image
                      </button>
                    </div>
                  );
                }
                if (completeUploadedUrl) {
                  return (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> New signed copy uploaded
                    </p>
                  );
                }
                return (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Upload signed copy *</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setCompleteFile(e.target.files?.[0] ?? null)}
                      className="w-full text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
                    />
                  </div>
                );
              })()}

              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setCompleteTarget(null)} className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50">
                  Cancel
                </button>
                <button
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
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {completeBusy ? 'Completing…' : <><CheckCircle2 size={14} /> Complete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/40">
              <span className="text-xs font-bold text-zinc-600">Signed copy — {previewImage.number}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-zinc-50/30 max-h-[80vh] overflow-auto">
              <img
                src={previewImage.url}
                alt={`Signed copy — ${previewImage.number}`}
                className="max-w-full h-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
