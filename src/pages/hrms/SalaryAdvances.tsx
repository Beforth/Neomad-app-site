import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Plus, Search, XCircle, X,
  ChevronLeft, ChevronRight,
  IndianRupee, Clock, CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  AdvanceExpense, formatINR, todayStr,
  listAdvances, createAdvance, resolveAdvance,
} from '../../lib/hrmsExpenses';

const PAGE_SIZE = 10;

export default function SalaryAdvances() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [advances, setAdvances] = useState<AdvanceExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');

  // Request modal state for staff
  const [advModalOpen, setAdvModalOpen] = useState(false);
  const [advTitle, setAdvTitle] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advReason, setAdvReason] = useState('');
  const [advDate, setAdvDate] = useState(todayStr());
  const [advSubmitting, setAdvSubmitting] = useState(false);

  // Approval modal state for admin
  const [confirmAdvModal, setConfirmAdvModal] = useState<{ advanceId: number; action: 'approve' | 'reject' } | null>(null);
  const [advConfirmNotes, setAdvConfirmNotes] = useState('');
  const [advApproveAmount, setAdvApproveAmount] = useState(0);

  const fetchAdvancesData = useCallback(async () => {
    if (!token) {
      setAdvances([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listAdvances(token);
      setAdvances(data);
    } catch (e) {
      setAdvances([]);
      setToast(e instanceof Error ? e.message : 'Failed to load advances');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAdvancesData();
  }, [fetchAdvancesData]);

  async function handleAdvSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!token || !advTitle.trim() || !advAmount) return;
    setAdvSubmitting(true);
    try {
      await createAdvance(token, {
        title: advTitle.trim(),
        amount: parseFloat(advAmount) || 0,
        date: advDate || todayStr(),
        reason: advReason.trim() || undefined,
      });
      await fetchAdvancesData();
      setAdvModalOpen(false);
      setAdvTitle('');
      setAdvAmount('');
      setAdvReason('');
      setToast('Salary advance request submitted to admin!');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to submit advance request');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setAdvSubmitting(false);
    }
  }

  async function updateAdvStatus(advId: number, newStatus: 'approved' | 'rejected', notes = '', approvedAmt?: number) {
    if (!token) return;
    try {
      await resolveAdvance(token, advId, {
        status: newStatus,
        approval_notes: notes || undefined,
        approved_amount: newStatus === 'approved' ? approvedAmt : undefined,
      });
      await fetchAdvancesData();
      setToast(newStatus === 'approved' ? 'Salary Advance Approved' : 'Salary Advance Rejected');
      setTimeout(() => setToast(''), 2500);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to update advance');
      setTimeout(() => setToast(''), 2500);
    }
  }

  const filtered = advances.filter((a) => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.employeeName.toLowerCase().includes(q) || (a.reason || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalApproved = advances.filter((a) => a.status === 'approved').reduce((s, a) => s + (a.approvedAmount || a.amount), 0);
  const pendingCount = advances.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </motion.div>
      )}

      {/* Top Header Buttons (Business Claims vs Salary Advances) */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
        <button
          onClick={() => navigate('/hrms/expenses')}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        >
          Business Claims
        </button>
        <button
          onClick={() => navigate('/hrms/advances')}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-zinc-900 text-white shadow-sm"
        >
          Salary Advances {pendingCount > 0 && <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-amber-500 text-white rounded-full font-extrabold">{pendingCount}</span>}
        </button>
      </div>

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Salary Advances</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            {isAdmin ? 'Manage employee salary advances & emergency cash loans' : 'Request salary advances and view status'}
          </p>
        </div>
        <button
          onClick={() => setAdvModalOpen(true)}
          className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Plus size={14} /> Request Salary Advance
        </button>
      </motion.header>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <IndianRupee size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">{formatINR(totalApproved)}</p>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">Total Approved Advances</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">{pendingCount}</p>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">Pending Requests</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">{advances.length}</p>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">Total Requests Submitted</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input
            type="text"
            placeholder="Search advances by title, employee, or reason..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {['all', 'pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                statusFilter === st ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table / Empty State */}
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-xs font-medium">Loading salary advance records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="mx-auto text-zinc-300" size={32} />
            <p className="text-sm font-bold text-zinc-700">No salary advance requests found</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {isAdmin ? 'No employees have submitted salary advance requests yet.' : 'You have not submitted any salary advance requests.'}
            </p>
            <button
              onClick={() => setAdvModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors"
            >
              <Plus size={14} /> Submit New Request
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Title & Reason</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Requested</th>
                    <th className="px-4 py-3">Approved</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {paged.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-zinc-900">{a.employeeName}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-zinc-800">{a.title}</p>
                        {a.reason && <p className="text-[11px] text-zinc-400 truncate max-w-[200px]" title={a.reason}>{a.reason}</p>}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 font-medium">{a.date}</td>
                      <td className="px-4 py-3 font-extrabold text-zinc-900">{formatINR(a.amount)}</td>
                      <td className="px-4 py-3 font-extrabold text-emerald-600">
                        {a.status === 'approved' ? formatINR(a.approvedAmount || a.amount) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          a.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                          a.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && a.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setConfirmAdvModal({ advanceId: a.id, action: 'approve' }); setAdvApproveAmount(a.amount); }}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => { setConfirmAdvModal({ advanceId: a.id, action: 'reject' }); }}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400 font-medium">
                            {a.approvalNotes ? `Notes: ${a.approvalNotes}` : 'No actions'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">
                  Showing <span className="font-bold text-zinc-900">{startRow}</span>–
                  <span className="font-bold text-zinc-900">{endRow}</span> of{' '}
                  <span className="font-bold text-zinc-900">{filtered.length}</span> records
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Staff Request Modal */}
      {advModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm" onClick={() => setAdvModalOpen(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 text-sm">Request Salary Advance</h3>
              <button onClick={() => setAdvModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-900 rounded-lg"><X size={16} /></button>
            </div>
            <form onSubmit={handleAdvSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Title / Purpose *</label>
                <input
                  type="text" required placeholder="e.g. Medical Emergency Loan, Festival Advance"
                  value={advTitle} onChange={(e) => setAdvTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Advance Amount (₹) *</label>
                <input
                  type="number" min={1} required placeholder="e.g. 10000"
                  value={advAmount} onChange={(e) => setAdvAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Date Required *</label>
                <input
                  type="date" required value={advDate} onChange={(e) => setAdvDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Reason / Explanation</label>
                <textarea
                  rows={2} placeholder="Explain why you need this advance..."
                  value={advReason} onChange={(e) => setAdvReason(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:border-zinc-900"
                />
              </div>
              <div className="pt-2 flex gap-2 justify-end">
                <button type="button" onClick={() => setAdvModalOpen(false)} className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-bold hover:bg-zinc-50">Cancel</button>
                <button type="submit" disabled={advSubmitting} className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 disabled:opacity-50">
                  {advSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Admin Approval / Rejection Modal */}
      {confirmAdvModal && (() => {
        const target = advances.find((a) => a.id === confirmAdvModal.advanceId);
        if (!target) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm" onClick={() => setConfirmAdvModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="font-bold text-zinc-900 text-sm">{confirmAdvModal.action === 'approve' ? 'Approve Salary Advance' : 'Reject Salary Advance'}</h3>
                <button onClick={() => setConfirmAdvModal(null)} className="p-1 text-zinc-400 hover:text-zinc-900 rounded-lg"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-zinc-50 p-3 rounded-xl space-y-1.5 text-xs">
                  <p><span className="text-zinc-400 font-bold">Employee:</span> <span className="font-bold text-zinc-900">{target.employeeName}</span></p>
                  <p><span className="text-zinc-400 font-bold">Title:</span> <span className="font-bold text-zinc-900">{target.title}</span></p>
                  <p><span className="text-zinc-400 font-bold">Requested:</span> <span className="font-extrabold text-zinc-900">{formatINR(target.amount)}</span></p>
                  {target.reason && <p><span className="text-zinc-400 font-bold">Reason:</span> <span className="text-zinc-700">{target.reason}</span></p>}
                </div>
                {confirmAdvModal.action === 'approve' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Approved Amount (₹)</label>
                    <input
                      type="number" min={1} value={advApproveAmount} onChange={(e) => setAdvApproveAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:border-zinc-900"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Notes / Instructions</label>
                  <textarea
                    rows={2} placeholder="e.g. Approved. Repay ₹1,000/month in Pay Run."
                    value={advConfirmNotes} onChange={(e) => setAdvConfirmNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:border-zinc-900"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setConfirmAdvModal(null)} className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-bold hover:bg-zinc-50">Cancel</button>
                  <button
                    onClick={() => {
                      updateAdvStatus(confirmAdvModal.advanceId, confirmAdvModal.action === 'approve' ? 'approved' : 'rejected', advConfirmNotes, confirmAdvModal.action === 'approve' ? advApproveAmount : undefined);
                      setConfirmAdvModal(null);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white ${confirmAdvModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                  >
                    Confirm {confirmAdvModal.action === 'approve' ? 'Approve' : 'Reject'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
}
