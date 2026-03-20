import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search, Eye, XCircle, ChevronLeft, ChevronRight,
  Download, UserPlus, RefreshCw, Clock, CheckCircle2,
  MapPin, FileImage, IndianRupee, Plus, ClipboardCheck,
  Building, Hash, Banknote, FileText, AlertCircle, Trash2, List,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUsers, type ApiInvoice } from '../lib/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchInvoicesList,
  deleteInvoiceThunk,
  cancelInvoiceThunk,
  assignInvoiceThunk,
  confirmPaymentThunk,
  clearInvoicesError,
  resetInvoices,
} from '../features/invoices/invoicesSlice';
import { InvoiceDesktopRow } from '../components/invoices/InvoiceDesktopRow';
import { InvoiceMobileCard } from '../components/invoices/InvoiceMobileCard';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

function fakeDuration(inv: ApiInvoice) {
  if (inv.status !== 'delivered') return null;
  return { travel: '18 mins', waiting: '6 mins', total: '24 mins' };
}

export default function Invoices() {
  const { user, token } = useAuth();
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
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<ApiInvoice | null>(null);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [assignTarget, setAssignTarget] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [availableAssignees, setAvailableAssignees] = useState<{ id: number; name: string }[]>([]);
  const [confirmPaymentInvoice, setConfirmPaymentInvoice] = useState<ApiInvoice | null>(null);

  const selectedInvoice = useMemo(() => {
    if (selectedInvoiceId == null) return null;
    return items.find((i) => i.id === selectedInvoiceId) ?? null;
  }, [items, selectedInvoiceId]);

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
    if (selectedInvoiceId == null) return;
    if (!items.some((i) => i.id === selectedInvoiceId)) {
      setSelectedInvoiceId(null);
    }
  }, [items, selectedInvoiceId]);

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

  const handleCancel = useCallback(
    async (id: number) => {
      if (!token) return;
      setActionLoading(true);
      dispatch(clearInvoicesError());
      try {
        await dispatch(cancelInvoiceThunk({ token, id })).unwrap();
        setSelectedInvoiceId(null);
      } finally {
        setActionLoading(false);
      }
    },
    [token, dispatch]
  );

  const handleAssign = useCallback(
    async (id: number) => {
      if (!token || !assignTarget) return;
      setActionLoading(true);
      dispatch(clearInvoicesError());
      try {
        await dispatch(assignInvoiceThunk({ token, id, assignedTo: Number(assignTarget) })).unwrap();
        setAssigning(null);
        setAssignTarget('');
        setSelectedInvoiceId((cur) => (cur === id ? null : cur));
      } finally {
        setActionLoading(false);
      }
    },
    [token, assignTarget, dispatch]
  );

  const confirmDeleteInvoice = useCallback(async () => {
    if (!token || !invoiceToDelete) return;
    setActionLoading(true);
    dispatch(clearInvoicesError());
    try {
      const id = invoiceToDelete.id;
      await dispatch(deleteInvoiceThunk({ token, id })).unwrap();
      setInvoiceToDelete(null);
      setSelectedInvoiceId((cur) => (cur === id ? null : cur));
    } finally {
      setActionLoading(false);
    }
  }, [token, invoiceToDelete, dispatch]);

  const handleConfirmPayment = useCallback(
    async (inv: ApiInvoice) => {
      if (!token) return;
      setActionLoading(true);
      setConfirmPaymentInvoice(null);
      dispatch(clearInvoicesError());
      try {
        await dispatch(confirmPaymentThunk({ token, invoice: inv })).unwrap();
      } finally {
        setActionLoading(false);
      }
    },
    [token, dispatch]
  );

  const openInvoiceDetail = useCallback(
    (inv: ApiInvoice) => {
      dispatch(clearInvoicesError());
      setSelectedInvoiceId(inv.id);
    },
    [dispatch]
  );

  const previewSigned = useCallback((url: string, title: string) => {
    setPreviewImage({ url, title });
  }, []);

  const requestDeleteInvoice = useCallback(
    (inv: ApiInvoice) => {
      dispatch(clearInvoicesError());
      setInvoiceToDelete(inv);
    },
    [dispatch]
  );

  const openAssignPanel = useCallback((id: number) => setAssigning(id), []);
  const openConfirmPay = useCallback((inv: ApiInvoice) => setConfirmPaymentInvoice(inv), []);

  type InstallmentUiStatus = 'paid' | 'pending' | 'before_paid' | 'current_paid';

  const INSTALLMENT_STATUS_LABEL: Record<InstallmentUiStatus, string> = {
    paid: 'Paid',
    pending: 'Pending',
    before_paid: 'Before paid',
    current_paid: 'Current paid',
  };

  const INSTALLMENT_STATUS_STYLE: Record<InstallmentUiStatus, string> = {
    paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    before_paid: 'bg-sky-100 text-sky-800 border-sky-200',
    current_paid: 'bg-violet-100 text-violet-800 border-violet-200',
  };

  /**
   * Rows for the confirm-payment popup: deposit (before paid), cash/cheque (current vs paid),
   * and remaining invoice balance (pending). Totals align with invoice amount when possible.
   */
  const getInstallmentRows = (inv: ApiInvoice): { id: string; label: string; amount: number; status: InstallmentUiStatus }[] => {
    const amount = inv.amount ?? 0;
    const cash = inv.cash_received ?? 0;
    const cheque = inv.cheque_received ?? 0;
    const collected = cash + cheque;
    const cashConf = !!inv.cash_confirmed;
    const chequeConf = !!inv.cheque_confirmed;

    const rows: { id: string; label: string; amount: number; status: InstallmentUiStatus }[] = [];

    // "Before paid" — first third of invoice as prior-period / deposit (clamped so rows stay consistent with total)
    let deposit = amount > 0 ? Math.min(Math.round(amount / 3), amount) : 0;
    let outstanding = Math.max(0, amount - deposit - collected);
    if (deposit + collected > amount) {
      deposit = Math.max(0, amount - collected);
      outstanding = 0;
    }

    if (deposit > 0) {
      rows.push({
        id: 'before-paid',
        label: 'Installment 1 — prior / deposit',
        amount: deposit,
        status: 'before_paid',
      });
    }

    if (cash > 0) {
      rows.push({
        id: 'cash',
        label: 'Cash (this delivery)',
        amount: cash,
        status: cashConf ? 'paid' : 'current_paid',
      });
    }
    if (cheque > 0) {
      rows.push({
        id: 'cheque',
        label: 'Cheque (this delivery)',
        amount: cheque,
        status: chequeConf ? 'paid' : 'current_paid',
      });
    }

    // Always list pending amount (remaining due on invoice), including ₹0 when fully covered
    if (amount > 0) {
      rows.push({
        id: 'pending-balance',
        label: 'Pending (still due on invoice)',
        amount: outstanding,
        status: 'pending',
      });
    } else if (rows.length === 0) {
      rows.push({ id: 'total', label: 'Invoice total', amount: 0, status: 'pending' });
    }

    return rows;
  };

  const assigneeName = (inv: ApiInvoice) => inv.assignee_name ?? availableAssignees.find((b) => b.id === inv.assigned_to)?.name ?? '—';
  const assigneeInitial = (inv: ApiInvoice) => {
    const n = assigneeName(inv);
    return n !== '—' ? (n[0]?.toUpperCase() ?? '?') : '?';
  };
  const filtered = invoices;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Invoices</h1>
          <p className="text-xs text-zinc-500 font-medium">Manage and track all delivery invoices</p>
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

      {/* Filters */}
      <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input type="text" placeholder="Search tasks / entities..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={boyFilter} onChange={e => setBoyFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer">
          <option value="all">All Assignees</option>
          {availableAssignees.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer" />
        {(search || statusFilter !== 'all' || boyFilter !== 'all' || dateFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setBoyFilter('all'); setDateFilter(''); }}
            className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1">
            <XCircle size={12} />Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Invoice / ID</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Task / Entity</th>
                <th
                  className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600"
                  onClick={() => { setSortBy('amount'); setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); }}
                >Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th
                  className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600"
                  onClick={() => { setSortBy('status'); setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); }}
                >Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Signed Copy</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Assigned To</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Travel</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Waiting</th>
                <th
                  className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600"
                  onClick={() => { setSortBy('created_at'); setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); }}
                >Date {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
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
                      actionBusy={actionLoading}
                      onOpenDetail={openInvoiceDetail}
                      onPreviewSigned={previewSigned}
                      onConfirmPayment={openConfirmPay}
                      onAssign={openAssignPanel}
                      onCancel={handleCancel}
                      onRequestDelete={requestDeleteInvoice}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
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
          Showing <span className="font-bold text-zinc-900">{startRow}</span>–<span className="font-bold text-zinc-900">{endRow}</span> of <span className="font-bold text-zinc-900">{totalCount}</span> invoices
          {totalPages > 1 && (
            <span className="ml-2 text-zinc-400">(page {page} of {totalPages})</span>
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

      {/* Delete confirmation — requires consent before API call */}
      <AnimatePresence>
        {invoiceToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-[55] p-4"
            onClick={() => !actionLoading && setInvoiceToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl border border-zinc-100 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100">
                <h3 className="text-lg font-bold text-zinc-900">Delete this invoice?</h3>
                <p className="text-sm text-zinc-600 mt-2">
                  <span className="font-bold">{invoiceToDelete.invoice_number}</span> · {invoiceToDelete.hospital_name}
                </p>
                <p className="text-xs text-red-600 font-medium mt-3">This action cannot be undone.</p>
              </div>
              <div className="p-6 bg-zinc-50 flex gap-3 justify-end">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setInvoiceToDelete(null)}
                  className="px-5 py-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void confirmDeleteInvoice()}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete invoice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Inline Panel */}
      <AnimatePresence>
        {assigning !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
            <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-bold text-zinc-900">Assign / Reassign Task</h3>
              <select value={assignTarget} onChange={e => setAssignTarget(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option value="">Select assignee...</option>
                {availableAssignees.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
              </select>
              <div className="flex gap-3">
                <button onClick={() => handleAssign(assigning!)} disabled={!assignTarget || actionLoading}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-40">
                  Confirm Assign
                </button>
                <button onClick={() => { setAssigning(null); setAssignTarget(''); }}
                  className="px-4 py-2.5 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Detail Modal — matches Tasks detail modal layout */}
      <AnimatePresence>
        {selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-100 flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100 shrink-0">
                    <FileText size={20} className="text-zinc-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-zinc-900 leading-tight truncate">{selectedInvoice.invoice_number}</h3>
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider truncate">{selectedInvoice.hospital_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <button
                      type="button"
                      onClick={() => selectedInvoice && requestDeleteInvoice(selectedInvoice)}
                      disabled={actionLoading}
                      className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-500 hover:text-red-600 disabled:opacity-50"
                      title="Delete invoice"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedInvoiceId(null)}
                    className="p-2 hover:bg-zinc-50 rounded-xl transition-colors text-zinc-400"
                    aria-label="Close"
                  >
                    <XCircle size={22} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <List size={12} /> Notes / Description
                      </label>
                      <div className="text-sm text-zinc-600 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100/50 leading-relaxed font-medium min-h-[80px]">
                        {selectedInvoice.description || 'No additional details for this invoice.'}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPin size={12} /> Delivery destination
                      </label>
                      <div className="flex items-start gap-3 p-3.5 bg-zinc-50/50 rounded-2xl border border-zinc-100/50">
                        <Building size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                        <span className="text-sm font-semibold text-zinc-700">{selectedInvoice.hospital_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 p-3.5 bg-zinc-50/50 rounded-2xl border border-zinc-100/50">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <IndianRupee size={14} className="text-zinc-400" /> Gross amount
                      </span>
                      <span className="text-sm font-bold text-zinc-900">₹{selectedInvoice.amount.toLocaleString()}</span>
                    </div>

                    {fakeDuration(selectedInvoice) && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Travel</p>
                          <p className="text-sm font-bold text-zinc-900">{fakeDuration(selectedInvoice)!.travel}</p>
                        </div>
                        <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Wait</p>
                          <p className="text-sm font-bold text-zinc-900">{fakeDuration(selectedInvoice)!.waiting}</p>
                        </div>
                        <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Total</p>
                          <p className="text-sm font-bold text-emerald-700">{fakeDuration(selectedInvoice)!.total}</p>
                        </div>
                      </div>
                    )}

                    {selectedInvoice.status === 'delivered' && selectedInvoice.signed_copy_url && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            <FileImage size={12} /> Signed document
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url:
                                  selectedInvoice.signed_copy_url ||
                                  'https://images.unsplash.com/photo-1586282391129-59a998fd6a90?auto=format&fit=crop&q=80&w=800',
                                title: `Full screen — ${selectedInvoice.invoice_number}`,
                              })
                            }
                            className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-wider"
                          >
                            Fullscreen
                          </button>
                        </div>
                        <div className="rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-100 max-h-48">
                          <img
                            src={
                              selectedInvoice.signed_copy_url ||
                              'https://images.unsplash.com/photo-1586282391129-59a998fd6a90?auto=format&fit=crop&q=80&w=800'
                            }
                            alt="Signed copy"
                            className="w-full h-full max-h-48 object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {selectedInvoice.status === 'delivered' && !selectedInvoice.signed_copy_url && (
                      <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                        <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-900">Document missing</p>
                          <p className="text-[11px] text-amber-700 mt-0.5 font-medium">Signed copy not uploaded yet.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live status</label>
                      <div
                        className={`w-fit flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs capitalize ${STATUS_COLORS[selectedInvoice.status]} border border-current/10`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        {selectedInvoice.status}
                      </div>
                    </div>

                    <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-zinc-50 bg-zinc-50/30">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mb-3">Assigned to</p>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 border border-zinc-200 shrink-0">
                            {assigneeInitial(selectedInvoice)}
                          </div>
                          <span className="text-sm font-medium text-zinc-800">{assigneeName(selectedInvoice)}</span>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1.5">
                            <Clock size={12} /> Created
                          </span>
                          <span className="text-xs font-bold text-zinc-700">
                            {new Date(selectedInvoice.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1.5">
                            <Hash size={12} /> Reference
                          </span>
                          <span className="text-xs font-bold text-zinc-700">{selectedInvoice.invoice_number}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Banknote size={12} /> Payment breakdown
                      </label>
                      <div className="bg-zinc-50/50 rounded-2xl p-4 border border-zinc-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500 font-bold">Cash received</span>
                          <span className="text-sm font-bold text-zinc-900">₹{(selectedInvoice.cash_received || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500 font-bold">Cheque</span>
                          <span className="text-sm font-bold text-zinc-900">₹{(selectedInvoice.cheque_received || 0).toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t border-zinc-200 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Grand total</span>
                          <span className="text-lg font-bold text-emerald-600">₹{selectedInvoice.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={12} /> Logistics timeline
                      </label>
                      <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                        <div className="relative">
                          <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-zinc-900 border-4 border-white ring-1 ring-zinc-200 shadow-sm" />
                          <p className="text-xs font-bold text-zinc-900 uppercase">Order created</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(selectedInvoice.created_at).toLocaleString()}</p>
                        </div>
                        {selectedInvoice.accepted_at ? (
                          <div className="relative">
                            <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white ring-1 ring-emerald-100 shadow-sm" />
                            <p className="text-xs font-bold text-zinc-900 uppercase">Accepted by logistics</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(selectedInvoice.accepted_at).toLocaleString()}</p>
                            <p className="text-[10px] text-emerald-600 font-bold mt-1 bg-emerald-50 w-fit px-2 py-0.5 rounded-lg border border-emerald-100">
                              {assigneeName(selectedInvoice)}
                            </p>
                          </div>
                        ) : (
                          <div className="relative opacity-40">
                            <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-zinc-200 border-4 border-white ring-1 ring-zinc-100 shadow-sm" />
                            <p className="text-xs font-bold text-zinc-400 uppercase">Pending assignment</p>
                          </div>
                        )}
                        {selectedInvoice.delivered_at && (
                          <div className="relative">
                            <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-zinc-900 border-4 border-white ring-1 ring-zinc-200 shadow-sm" />
                            <p className="text-xs font-bold text-zinc-900 uppercase">Successfully delivered</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(selectedInvoice.delivered_at).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-zinc-50/50 border-t border-zinc-100 flex flex-wrap gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceId(null)}
                  className="flex-1 min-w-[120px] px-5 py-2.5 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors"
                >
                  Dismiss
                </button>
                {(user?.role === 'admin' || user?.role === 'manager') && selectedInvoice.status === 'delivered' &&
                  ((selectedInvoice.cash_received ?? 0) > 0 || (selectedInvoice.cheque_received ?? 0) > 0) && (
                    <button
                      type="button"
                      onClick={() => setConfirmPaymentInvoice(selectedInvoice)}
                      disabled={actionLoading}
                      className="flex-1 min-w-[120px] px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} /> Confirm payment
                    </button>
                  )}
                {(selectedInvoice.status === 'pending' || selectedInvoice.status === 'assigned') &&
                  user?.role !== 'delivery_boy' &&
                  (user?.role === 'admin' || user?.role === 'manager') && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setAssigning(selectedInvoice.id);
                          setSelectedInvoiceId(null);
                        }}
                        className="flex-1 min-w-[120px] px-5 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <UserPlus size={16} /> {selectedInvoice.status === 'assigned' ? 'Reassign' : 'Fulfill'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(selectedInvoice.id)}
                        className="flex-1 min-w-[120px] px-5 py-2.5 bg-white border border-red-200 text-red-700 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle size={16} /> Void
                      </button>
                    </>
                  )}
                {(user?.role === 'admin' || user?.role === 'manager') && (
                  <button
                    type="button"
                    onClick={() => selectedInvoice && requestDeleteInvoice(selectedInvoice)}
                    disabled={actionLoading}
                    className="flex-1 min-w-[120px] px-5 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Payment — installments with Paid / Pending / Before paid / Current paid */}
      <AnimatePresence>
        {confirmPaymentInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setConfirmPaymentInvoice(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl border border-zinc-100 w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                <h3 className="text-lg font-black text-zinc-900">Confirm payment</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  {confirmPaymentInvoice.invoice_number} · {confirmPaymentInvoice.hospital_name}
                </p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-3">
                  Installment schedule &amp; status
                </p>
              </div>
              <div className="p-6">
                <div className="rounded-xl border border-zinc-200 overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 bg-zinc-100 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <span>Installment</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right min-w-[7rem]">Status</span>
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {getInstallmentRows(confirmPaymentInvoice).map((row) => (
                      <li key={row.id} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-3 items-center bg-white hover:bg-zinc-50/80">
                        <span className="text-sm font-bold text-zinc-800 leading-tight">{row.label}</span>
                        <span className="text-sm font-black text-zinc-900 tabular-nums text-right">₹{row.amount.toLocaleString()}</span>
                        <span className="flex justify-end">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${INSTALLMENT_STATUS_STYLE[row.status]}`}
                          >
                            {INSTALLMENT_STATUS_LABEL[row.status]}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-200 flex justify-between items-center">
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Invoice total</span>
                  <span className="text-xl font-black text-emerald-600 tabular-nums">₹{confirmPaymentInvoice.amount.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex flex-wrap gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmPaymentInvoice(null)}
                  className="px-5 py-2.5 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmPayment(confirmPaymentInvoice)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-sm hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={18} /> Confirm payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 bg-zinc-900/90 backdrop-blur-md flex items-center justify-center z-60 p-4 md:p-12">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center">
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setPreviewImage(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                  <XCircle size={32} />
                </button>
              </div>
              <div className="bg-white p-2 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh]">
                <img src={previewImage.url} alt={previewImage.title} className="w-full h-full object-contain" />
              </div>
              <p className="text-white font-bold mt-6 text-xl">{previewImage.title}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
