import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search, Eye, XCircle, ChevronLeft, ChevronRight,
  Download, UserPlus, RefreshCw, Clock, CheckCircle2,
  MapPin, FileImage, IndianRupee, Filter, Plus, ClipboardCheck,
  Package, Building, Hash, Banknote, Users, FileText, AlertCircle, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getInvoices,
  getUsers,
  assignInvoice,
  cancelInvoice,
  deleteInvoice,
  updateInvoice,
  type ApiInvoice,
} from '../lib/api';

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
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [boyFilter, setBoyFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<ApiInvoice | null>(null);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [assignTarget, setAssignTarget] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [availableAssignees, setAvailableAssignees] = useState<{ id: number; name: string }[]>([]);
  const [confirmPaymentInvoice, setConfirmPaymentInvoice] = useState<ApiInvoice | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, statusFilter, boyFilter, dateFilter, sortBy, sortOrder]);

  const fetchInvoices = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setInvoices([]);
      setTotalCount(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      };
      if (searchDebounced.trim()) params.search = searchDebounced.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (boyFilter !== 'all') params.assigned_to = Number(boyFilter);
      if (dateFilter) {
        params.date_from = dateFilter;
        params.date_to = dateFilter;
      }
      const result = await getInvoices(token, params as any);
      setInvoices(result.items);
      setTotalCount(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices');
      setInvoices([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [token, searchDebounced, statusFilter, boyFilter, dateFilter, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

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

  const handleCancel = async (id: number) => {
    if (!token) return;
    setActionLoading(true);
    try {
      await cancelInvoice(token, id);
      fetchInvoices();
      setSelectedInvoice(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async (id: number) => {
    if (!token || !assignTarget) return;
    setActionLoading(true);
    try {
      await assignInvoice(token, id, Number(assignTarget));
      fetchInvoices();
      setAssigning(null);
      setAssignTarget('');
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    setActionLoading(true);
    try {
      await deleteInvoice(token, id);
      fetchInvoices();
      setSelectedInvoice(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPayment = async (inv: ApiInvoice) => {
    if (!token) return;
    setActionLoading(true);
    setConfirmPaymentInvoice(null);
    try {
      await updateInvoice(token, inv.id, {
        cash_confirmed: (inv.cash_received ?? 0) > 0,
        cheque_confirmed: (inv.cheque_received ?? 0) > 0,
      });
      fetchInvoices();
      setSelectedInvoice((prev) => (prev?.id === inv.id ? { ...prev, cash_confirmed: true, cheque_confirmed: true } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to confirm payment');
    } finally {
      setActionLoading(false);
    }
  };

  /** Build installments list from invoice (cash + cheque, non-zero). */
  const getInstallments = (inv: ApiInvoice) => {
    const items: { label: string; amount: number }[] = [];
    const cash = inv.cash_received ?? 0;
    const cheque = inv.cheque_received ?? 0;
    if (cash > 0) items.push({ label: 'Cash', amount: cash });
    if (cheque > 0) items.push({ label: 'Cheque', amount: cheque });
    if (items.length === 0) items.push({ label: 'Total', amount: inv.amount });
    return items;
  };

  const assigneeName = (inv: ApiInvoice) => inv.assignee_name ?? availableAssignees.find((b) => b.id === inv.assigned_to)?.name ?? '—';
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
          <button onClick={() => fetchInvoices()} disabled={loading} className="bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm">
            <Download size={14} />Export
          </button>
        </div>
      </header>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {error}
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
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-xs text-zinc-400">Loading invoices...</td></tr>
              ) : filtered.map((invoice, i) => {
                const dur = fakeDuration(invoice);
                return (
                  <motion.tr key={invoice.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }}
                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(invoice)}>
                    <td className="px-4 py-3"><span className="text-xs font-bold text-zinc-900">{invoice.invoice_number}</span></td>
                    <td className="px-4 py-3"><p className="text-xs font-semibold text-zinc-900">{invoice.hospital_name}</p></td>
                    <td className="px-4 py-3"><p className="text-xs font-bold text-zinc-900">₹{invoice.amount.toLocaleString()}</p></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${STATUS_COLORS[invoice.status]}`}>{invoice.status}</span>
                    </td>                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {invoice.signed_copy_url ? (
                          <div className="relative group w-10 h-10 rounded-lg overflow-hidden border border-emerald-100 shadow-sm cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: invoice.signed_copy_url!, title: `Signed Copy — ${invoice.invoice_number}` }); }}>
                            <img src={invoice.signed_copy_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Signed Copy" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye size={12} className="text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-300">
                            <ClipboardCheck size={16} />
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3"><p className="text-xs text-zinc-600">{assigneeName(invoice)}</p></td>
                    <td className="px-4 py-3"><p className="text-xs text-zinc-500">{dur?.travel || '—'}</p></td>
                    <td className="px-4 py-3"><p className="text-xs text-amber-600">{dur?.waiting || '—'}</p></td>
                    <td className="px-4 py-3 text-[10px] font-medium text-zinc-400">{new Date(invoice.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedInvoice(invoice)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View Details">
                          <Eye size={14} />
                        </button>
                        <button className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="Download Invoice">
                          <Download size={14} />
                        </button>
                        {invoice.status === 'delivered' && user?.role === 'admin' && ((invoice.cash_received ?? 0) > 0 || (invoice.cheque_received ?? 0) > 0) && (
                          <button onClick={() => setConfirmPaymentInvoice(invoice)} disabled={actionLoading} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50" title="Confirm Payment">
                            <Banknote size={14} />
                          </button>
                        )}
                        {invoice.status !== 'delivered' && invoice.status !== 'cancelled' && (
                          <button onClick={() => setAssigning(invoice.id)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Assign">
                            <UserPlus size={14} />
                          </button>
                        )}
                        {(invoice.status === 'pending' || invoice.status === 'assigned') && (
                          <button onClick={() => handleCancel(invoice.id)} disabled={actionLoading} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Cancel">
                            <XCircle size={14} />
                          </button>
                        )}
                        {(user?.role === 'admin' || user?.role === 'manager') && (
                          <button onClick={() => handleDelete(invoice.id)} disabled={actionLoading} className="p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-zinc-100">
          {loading ? <div className="p-8 text-center text-zinc-400 text-sm">Loading...</div>
            : filtered.map((invoice, i) => (
                <motion.div key={invoice.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="p-4 space-y-2 active:bg-zinc-50" onClick={() => setSelectedInvoice(invoice)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-zinc-400">{invoice.invoice_number}</p>
                      <p className="font-bold text-zinc-900">{invoice.hospital_name}</p>
                      {assigneeName(invoice) !== '—' && (
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Users size={12} /> {assigneeName(invoice)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_COLORS[invoice.status]}`}>{invoice.status}</span>
                      {invoice.signed_copy_url && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100">
                          <ClipboardCheck size={10} /> Signed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-sm font-bold text-zinc-900">₹{invoice.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-zinc-500">{new Date(invoice.created_at).toLocaleDateString()}</p>
                  </div>
                </motion.div>
              ))}
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
            disabled={page <= 1 || loading}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} className="text-zinc-600" />
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight size={18} className="text-zinc-600" />
          </button>
        </div>
      </div>

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

      {/* Invoice Detail Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedInvoice(null)}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] border border-zinc-100 flex flex-col"
            >
              {/* Close button - outside header so it's never blocked */}
              <div className="absolute top-4 right-4 z-[100]">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white touch-manipulation cursor-pointer"
                  aria-label="Close"
                >
                  <XCircle size={28} />
                </button>
              </div>

              {/* Premium Header */}
              <div className="relative p-8 bg-zinc-900 text-white overflow-hidden shrink-0">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <FileText size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Medical Invoice</p>
                        <h2 className="text-3xl font-black tracking-tighter">{selectedInvoice.invoice_number}</h2>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                        <Building size={14} className="text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-300">{selectedInvoice.hospital_name}</span>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest ${STATUS_COLORS[selectedInvoice.status]} border border-current opacity-90`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {selectedInvoice.status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pb-1 text-right hidden md:block">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Gross Amount</p>
                    <p className="text-4xl font-black text-white tracking-tighter flex items-center justify-end gap-1">
                      <IndianRupee size={24} className="text-emerald-500" />
                      {selectedInvoice.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  
                  {/* Left Column: Essential Details (8/12) */}
                  <div className="lg:col-span-7 space-y-10">
                    
                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Travel time</p>
                        <p className="text-lg font-black text-zinc-900 tracking-tight">18 min</p>
                      </div>
                      <div className="bg-amber-50/30 p-4 rounded-3xl border border-amber-100/50">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Clinic wait</p>
                        <p className="text-lg font-black text-amber-600 tracking-tight">6 min</p>
                      </div>
                      <div className="bg-emerald-50/30 p-4 rounded-3xl border border-emerald-100/50">
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total cycle</p>
                        <p className="text-lg font-black text-emerald-600 tracking-tight">24 min</p>
                      </div>
                    </div>

                    {/* Signed Copy Section */}
                    {selectedInvoice.status === 'delivered' && (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <FileImage size={14} /> Official Signed Document
                          </label>
                          <button onClick={() => setPreviewImage({ url: selectedInvoice.signed_copy_url || 'https://images.unsplash.com/photo-1586282391129-59a998fd6a90?auto=format&fit=crop&q=80&w=800', title: `Full Screen — ${selectedInvoice.invoice_number}`})}
                                  className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest">
                            View Fullscreen
                          </button>
                        </div>
                        <div className="relative group rounded-4xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-zinc-200 aspect-4/3 bg-zinc-100">
                           <img 
                            src={selectedInvoice.signed_copy_url || 'https://images.unsplash.com/photo-1586282391129-59a998fd6a90?auto=format&fit=crop&q=80&w=800'} 
                            alt="Signed Copy" 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                            <p className="text-white text-xs font-bold flex items-center gap-2">
                              <ClipboardCheck size={14} /> Proof of delivery captured via Neomed App
                            </p>
                          </div>
                        </div>
                      </section>
                    )}

                    {!selectedInvoice.signed_copy_url && selectedInvoice.status === 'delivered' && (
                      <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4">
                        <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                          <AlertCircle size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-amber-900 uppercase">Document Missing</p>
                          <p className="text-xs text-amber-600 mt-1 font-medium">The delivery boy has not uploaded the signed copy yet. You can attach a mock for demo.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Timeline & Payment (5/12) */}
                  <div className="lg:col-span-5 space-y-10">
                    
                    {/* Payment Summary */}
                    <section className="space-y-4">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Banknote size={14} /> Payment breakdown
                      </label>
                      <div className="bg-zinc-50 rounded-4xl p-6 border border-zinc-100 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-zinc-500 font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-300" /> Cash Received</span>
                          <span className="text-lg font-black text-zinc-900">₹{(selectedInvoice.cash_received || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-zinc-500 font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-300" /> Cheque</span>
                          <span className="text-lg font-black text-zinc-900">₹{(selectedInvoice.cheque_received || 0).toLocaleString()}</span>
                        </div>
                        <div className="pt-4 border-t border-zinc-200 flex justify-between items-center">
                          <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Grand Total</span>
                          <span className="text-2xl font-black text-emerald-600">₹{selectedInvoice.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </section>

                    {/* Performance Timeline */}
                    <section className="space-y-4">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={14} /> Full Logistics Timeline
                      </label>
                      <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                        <div className="relative">
                          <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-zinc-900 border-4 border-white ring-1 ring-zinc-200 shadow-sm" />
                          <p className="text-xs font-black text-zinc-900 uppercase">Order Created</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(selectedInvoice.created_at).toLocaleString()}</p>
                        </div>
                        {selectedInvoice.accepted_at ? (
                          <div className="relative">
                            <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white ring-1 ring-emerald-100 shadow-sm" />
                            <p className="text-xs font-black text-zinc-900 uppercase">Accepted by Logistics</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(selectedInvoice.accepted_at).toLocaleString()}</p>
                            <p className="text-[10px] text-emerald-600 font-bold mt-1 bg-emerald-50 w-fit px-2 py-0.5 rounded-lg border border-emerald-100">
                              {assigneeName(selectedInvoice)}
                            </p>
                          </div>
                        ) : (
                           <div className="relative opacity-40">
                            <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-zinc-200 border-4 border-white ring-1 ring-zinc-100 shadow-sm" />
                            <p className="text-xs font-black text-zinc-400 uppercase">Pending Assignment</p>
                          </div>
                        )}
                        {selectedInvoice.delivered_at && (
                          <div className="relative">
                            <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-black border-4 border-white ring-1 ring-zinc-200 shadow-sm" />
                            <p className="text-xs font-black text-zinc-900 uppercase">Successfully Delivered</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(selectedInvoice.delivered_at).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex flex-wrap gap-4 shrink-0 overflow-x-auto no-scrollbar">
                {(user?.role === 'admin' || user?.role === 'manager') && selectedInvoice.status === 'delivered' && (
                  <div className="flex gap-3">
                    {((selectedInvoice.cash_received ?? 0) > 0 || (selectedInvoice.cheque_received ?? 0) > 0) && (
                      <button onClick={() => setConfirmPaymentInvoice(selectedInvoice)} disabled={actionLoading}
                        className="px-6 py-3 bg-emerald-500 text-white rounded-[1.25rem] font-black text-sm hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/10 flex items-center gap-2 disabled:opacity-50">
                        <CheckCircle2 size={18} /> Confirm Payment
                      </button>
                    )}
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <button onClick={() => handleDelete(selectedInvoice.id)} disabled={actionLoading}
                        className="px-6 py-3 bg-red-100 text-red-600 rounded-[1.25rem] font-black text-sm hover:bg-red-200 transition-all flex items-center gap-2 disabled:opacity-50">
                        <Trash2 size={18} /> Delete
                      </button>
                    )}
                  </div>
                )}
                
                <div className="flex-1" />
                
                <div className="flex gap-3">
                  {(selectedInvoice.status === 'pending' || selectedInvoice.status === 'assigned') && user?.role !== 'delivery_boy' && (user?.role === 'admin' || user?.role === 'manager') && (
                    <>
                      <button onClick={() => { setAssigning(selectedInvoice.id); setSelectedInvoice(null); }}
                        className="px-6 py-3 bg-blue-100 text-blue-700 rounded-[1.25rem] font-black text-sm hover:bg-blue-200 transition-all flex items-center gap-2">
                        <UserPlus size={18} /> {selectedInvoice.status === 'assigned' ? 'Reassign' : 'Fulfill'}
                      </button>
                      <button onClick={() => handleCancel(selectedInvoice.id)}
                        className="px-6 py-3 bg-red-100 text-red-600 rounded-[1.25rem] font-black text-sm hover:bg-red-200 transition-all flex items-center gap-2">
                        <XCircle size={18} /> Void
                      </button>
                    </>
                  )}
                  <button onClick={() => setSelectedInvoice(null)}
                    className="px-8 py-3 bg-zinc-100 text-zinc-600 rounded-[1.25rem] font-black text-sm hover:bg-zinc-200 transition-all">
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Payment – Installments popup */}
      <AnimatePresence>
        {confirmPaymentInvoice && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmPaymentInvoice(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl border border-zinc-100 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100">
                <h3 className="text-lg font-black text-zinc-900">Confirm Payment</h3>
                <p className="text-sm text-zinc-500 mt-1">{confirmPaymentInvoice.invoice_number} · {confirmPaymentInvoice.hospital_name}</p>
              </div>
              <div className="p-6">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Invoice installments</p>
                <ul className="space-y-3">
                  {getInstallments(confirmPaymentInvoice).map((inst, i) => (
                    <li key={i} className="flex justify-between items-center py-2 px-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-sm font-bold text-zinc-700">
                        {getInstallments(confirmPaymentInvoice).length > 1 ? `Installment ${i + 1} (${inst.label})` : inst.label}
                      </span>
                      <span className="text-base font-black text-zinc-900">₹{inst.amount.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-zinc-200 flex justify-between items-center">
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Total</span>
                  <span className="text-xl font-black text-emerald-600">₹{confirmPaymentInvoice.amount.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmPaymentInvoice(null)}
                  className="px-5 py-2.5 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmPayment(confirmPaymentInvoice)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-sm hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={18} /> Confirm Payment
                </button>
              </div>
            </motion.div>
          </div>
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
