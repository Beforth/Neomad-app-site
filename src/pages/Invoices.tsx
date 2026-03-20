import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search, XCircle, ChevronLeft, ChevronRight,
  Download, RefreshCw, AlertCircle,
} from 'lucide-react';
import { getUsers } from '../lib/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchInvoicesList,
  clearInvoicesError,
  resetInvoices,
} from '../features/invoices/invoicesSlice';
import { InvoiceDesktopRow } from '../components/invoices/InvoiceDesktopRow';
import { InvoiceMobileCard } from '../components/invoices/InvoiceMobileCard';
import { fakeDuration } from './invoices/invoiceShared';
import type { ApiInvoice } from '../lib/api';
import { INVOICES_PAGE_SUBTITLE, INVOICES_PAGE_TITLE } from '../components/invoices/InvoiceSectionFrame';

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
  const [boyFilter, setBoyFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [availableAssignees, setAvailableAssignees] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, statusFilter, boyFilter, dateFilter, sortBy, sortOrder]);

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
          ...(boyFilter !== 'all' ? { assigned_to: Number(boyFilter) } : {}),
          ...(dateFilter ? { date_from: dateFilter, date_to: dateFilter } : {}),
        },
      })
    );
  }, [
    token,
    dispatch,
    searchDebounced,
    statusFilter,
    boyFilter,
    dateFilter,
    sortBy,
    sortOrder,
    page,
    pageSize,
  ]);

  useEffect(() => {
    if (items.length === 0 && totalCount > 0 && page > 1) {
      setPage((p) => Math.max(1, p - 1));
    }
  }, [items.length, totalCount, page]);

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

  const assigneeName = (inv: ApiInvoice) =>
    inv.assignee_name ?? availableAssignees.find((b) => b.id === inv.assigned_to)?.name ?? '—';

  const openInvoiceDetail = useCallback(
    (inv: ApiInvoice) => {
      dispatch(clearInvoicesError());
      navigate(`/invoices/${inv.id}`);
    },
    [dispatch, navigate]
  );

  const openSignedPreview = useCallback(
    (invId: number) => {
      navigate(`/invoices/${invId}/signed-preview`);
    },
    [navigate]
  );

  const openConfirmPayment = useCallback(
    (inv: ApiInvoice) => navigate(`/invoices/${inv.id}/confirm-payment`),
    [navigate]
  );

  const openAssign = useCallback(
    (invId: number) => navigate(`/invoices/${invId}/assign`),
    [navigate]
  );

  const openVoid = useCallback(
    (inv: ApiInvoice) => navigate(`/invoices/${inv.id}/void`),
    [navigate]
  );

  const openDelete = useCallback(
    (inv: ApiInvoice) => navigate(`/invoices/${inv.id}/delete`),
    [navigate]
  );

  const filtered = invoices;
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
                  },
                })
              );
            }}
            disabled={listLoading || isRefreshing}
            className="bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={listLoading || isRefreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm">
            <Download size={14} />Export
          </button>
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={boyFilter}
          onChange={(e) => setBoyFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer"
        >
          <option value="all">All Assignees</option>
          {availableAssignees.map((b) => (
            <option key={b.id} value={String(b.id)}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer"
        />
        {(search || statusFilter !== 'all' || boyFilter !== 'all' || dateFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
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

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Invoice / ID</th>
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
                  <td colSpan={10} className="px-4 py-8 text-center text-xs text-zinc-400">
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
                      onConfirmPayment={openConfirmPayment}
                      onAssign={openAssign}
                      onRequestCancel={openVoid}
                      onRequestDelete={openDelete}
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || listLoading || isRefreshing}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} className="text-zinc-600" />
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || listLoading || isRefreshing}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight size={18} className="text-zinc-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
