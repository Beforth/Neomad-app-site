import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Banknote, Search, XCircle, Eye, X, Pen, Trash2, Inbox,
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  IndianRupee, CheckCircle2, Zap, Users, Receipt, Repeat,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/hrmsExpenses';
import {
  PayrollRun, PayEntry, EntryStatus,
  getPayrollRun, calculatePayrollRun, approvePayrollRun, payPayrollRun,
  deletePayrollRun, regeneratePayrollRun, syncPayrollRun, updatePayrollEntry, payPayrollEntry,
  monthLabel, PAYMENT_MODE_OPTIONS, payModelLabel, ROLE_LABELS,
} from '../../lib/hrmsPayroll';

type SortKey = 'name' | 'net';

const PAGE_SIZE = 10;

const ENTRY_STATUS_BADGE: Record<EntryStatus, { base: string; label: string }> = {
  draft: { base: 'bg-zinc-100 text-zinc-500', label: 'Draft' },
  calculated: { base: 'bg-amber-50 text-amber-600', label: 'Calculated' },
  approved: { base: 'bg-blue-50 text-blue-600', label: 'Approved' },
  paid: { base: 'bg-emerald-50 text-emerald-600', label: 'Paid' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

const MODEL_FILTER_OPTIONS = [
  { value: 'all', label: 'All Pay Models' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'shift', label: 'Shift' },
];

function num(s: string) { return Math.max(0, Number(s) || 0); }

function mergeEntry(prev: PayrollRun, entry: PayEntry): PayrollRun {
  return {
    ...prev,
    entries: prev.entries.map((e) => (e.id === entry.id ? entry : e)),
  };
}

export default function PayrollRunDetail() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const params = useParams<{ id: string }>();
  const runId = Number(params.id);
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const [editEntry, setEditEntry] = useState<PayEntry | null>(null);
  const [editForm, setEditForm] = useState<PayEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const loadRun = useCallback(async () => {
    if (!token || !runId) {
      setRun(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getPayrollRun(token, runId);
      setRun(data);
    } catch {
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [token, runId]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, modelFilter, searchDebounced]);

  const filtered = useMemo(() => {
    if (!run) return [];
    let list = [...run.entries];
    const q = searchDebounced.toLowerCase().trim();
    if (q) list = list.filter((e) => e.employeeName.toLowerCase().includes(q));
    if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter);
    if (modelFilter !== 'all') list = list.filter((e) => e.payModel === modelFilter);
    list.sort((a, b) => {
      if (sortBy === 'net') return sortOrder === 'asc' ? a.netPay - b.netPay : b.netPay - a.netPay;
      const va = a.employeeName.toLowerCase();
      const vb = b.employeeName.toLowerCase();
      return sortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return list;
  }, [run, searchDebounced, statusFilter, modelFilter, sortBy, sortOrder]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortOrder('asc'); }
  }

  async function handleCalculate() {
    if (!token || !run) return;
    try {
      const wasDraft = run.status === 'draft';
      const updated = await calculatePayrollRun(token, run.id);
      setRun(updated);
      showToast(wasDraft
        ? 'Salaries calculated from attendance (days, late penalty, OT)'
        : 'Salaries recalculated from attendance');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to calculate');
    }
  }

  async function handleApprove() {
    if (!token || !run) return;
    try {
      const updated = await approvePayrollRun(token, run.id);
      setRun(updated);
      showToast('Run approved and locked');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to approve');
    }
  }

  async function handlePayAll() {
    if (!token || !run) return;
    try {
      const updated = await payPayrollRun(token, run.id);
      setRun(updated);
      showToast('All approved entries marked paid');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to pay run');
    }
  }

  async function handleDelete() {
    if (!token || !run) return;
    try {
      await deletePayrollRun(token, run.id);
      setConfirmDelete(false);
      navigate('/hrms/payroll');
    } catch (e) {
      setConfirmDelete(false);
      showToast(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  async function handleRegenerate() {
    if (!token || !run) return;
    try {
      const updated = await regeneratePayrollRun(token, run.id);
      setRun(updated);
      setConfirmRegenerate(false);
      showToast(`Regenerated with ${updated.entries.length} employee(s) — now draft`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to regenerate');
    }
  }

  async function handleSync() {
    if (!token || !run) return;
    try {
      const updated = await syncPayrollRun(token, run.id);
      setRun(updated);
      showToast(`Synced — ${updated.entries.length} employee(s) in this run`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to sync');
    }
  }

  function openEdit(e: PayEntry) {
    setEditEntry(e);
    setEditForm({ ...e });
  }

  async function saveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!token || !run || !editEntry || !editForm) return;
    try {
      const updated = await updatePayrollEntry(token, run.id, editForm.id, {
        presentDays: editForm.presentDays,
        halfDays: editForm.halfDays,
        overtimeHours: editForm.overtimeHours,
        lopDays: editForm.lopDays,
        bonus: editForm.bonus,
        latePenalty: editForm.latePenalty,
        overtimeAmount: editForm.overtimeAmount,
        advanceDeduction: editForm.advanceDeduction,
        mediclaimDeduction: editForm.mediclaimDeduction,
        paymentMode: editForm.paymentMode,
        note: editForm.note,
      });
      setRun((prev) => (prev ? mergeEntry(prev, updated) : prev));
      setEditEntry(null);
      setEditForm(null);
      showToast('Entry updated and recalculated');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update entry');
    }
  }

  async function payEntry(e: PayEntry) {
    if (!token || !run) return;
    try {
      await payPayrollEntry(token, run.id, e.id);
      const refreshed = await getPayrollRun(token, run.id);
      setRun(refreshed);
      showToast('Entry marked as paid');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to pay entry');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-zinc-400 animate-pulse py-16 text-center">Loading payroll run...</p>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="bg-white border border-zinc-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
          <Inbox size={24} className="text-zinc-300" />
        </div>
        <h2 className="text-sm font-bold text-zinc-900 mb-1">Payroll run not found</h2>
        <p className="text-xs text-zinc-400 max-w-xs mb-4">This run may have been deleted.</p>
        <button onClick={() => navigate('/hrms/payroll')} className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
          <ChevronLeft size={14} />Back to Payroll
        </button>
      </div>
    );
  }

  const totals = run.entries.reduce(
    (acc, e) => ({ gross: acc.gross + e.gross, ded: acc.ded + e.totalDeductions, net: acc.net + e.netPay }),
    { gross: 0, ded: 0, net: 0 }
  );

  const statCards = [
    { label: 'Employees', value: run.entries.length, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Gross', value: formatINR(totals.gross), icon: Banknote, color: 'bg-purple-50 text-purple-600' },
    { label: 'Deductions', value: formatINR(totals.ded), icon: Receipt, color: 'bg-rose-50 text-rose-600' },
    { label: 'Net Pay', value: formatINR(totals.net), icon: IndianRupee, color: 'bg-emerald-50 text-emerald-600' },
  ];

  const hasFilters = search || statusFilter !== 'all' || modelFilter !== 'all';
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
        >
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </motion.div>
      )}

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{monthLabel(run.month)}</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5 flex items-center gap-2">
            Payroll run <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${ENTRY_STATUS_BADGE[run.status].base}`}>{ENTRY_STATUS_BADGE[run.status].label}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(run.status === 'draft' || run.status === 'calculated') && (
            <>
              <button onClick={handleSync} className="flex items-center gap-2 bg-white text-zinc-700 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
                <Users size={14} />Sync employees
              </button>
              <button onClick={handleCalculate} className="flex items-center gap-2 bg-white text-zinc-900 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
                <Zap size={14} />{run.status === 'draft' ? 'Calculate' : 'Recalculate'}
              </button>
            </>
          )}
          {run.status === 'calculated' && (
            <button onClick={handleApprove} className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
              <CheckCircle2 size={14} />Approve Run
            </button>
          )}
          {run.status === 'approved' && (
            <button onClick={handlePayAll} className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
              <Banknote size={14} />Pay All
            </button>
          )}
          <button onClick={() => setConfirmRegenerate(true)} className="flex items-center gap-2 bg-white text-zinc-900 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
            <Repeat size={14} />Regenerate
          </button>
          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 bg-white text-red-500 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors shadow-sm">
            <Trash2 size={14} />Delete
          </button>
        </div>
      </motion.header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">{card.value}</p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center"
      >
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
          />
        </div>
        <div className="w-[150px]">
          <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
        </div>
        <div className="w-[150px]">
          <SearchableSelect value={modelFilter} onChange={setModelFilter} options={MODEL_FILTER_OPTIONS} placeholder="Pay Model" />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setModelFilter('all'); }} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
            <XCircle size={12} />Clear
          </button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
      >
        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
              <Inbox size={24} className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">No results found</h3>
            <p className="text-xs text-zinc-400 max-w-xs">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                  <tr>
                    <th onClick={() => toggleSort('name')} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600 select-none">
                      <span className="flex items-center gap-1">Employee{sortBy === 'name' ? (sortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />) : <ArrowUpDown size={12} className="text-zinc-300" />}</span>
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Attendance</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Gross</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Deductions</th>
                    <th onClick={() => toggleSort('net')} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600 select-none">
                      <span className="flex items-center gap-1">Net{sortBy === 'net' ? (sortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />) : <ArrowUpDown size={12} className="text-zinc-300" />}</span>
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {paged.map((e, i) => (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => navigate(`/hrms/payroll/run/${run.id}/payslip/${e.id}`)}
                      className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-zinc-900">{e.employeeName}</p>
                        <p className="text-[10px] text-zinc-400">{ROLE_LABELS[e.role] || e.role}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${e.payModel === 'monthly' ? 'bg-purple-50 text-purple-600' : 'bg-cyan-50 text-cyan-600'}`}>
                          {payModelLabel(e.payModel)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[10px] text-zinc-500 whitespace-nowrap">
                          P {e.presentDays} · H {e.halfDays} · LOP {e.lopDays}
                          {(e.latePenalty > 0 || e.overtimeAmount > 0) && (
                            <span className="block mt-0.5">
                              {e.latePenalty > 0 && <span className="text-rose-500">−₹{e.latePenalty} pen </span>}
                              {e.overtimeAmount > 0 && <span className="text-violet-600">+₹{e.overtimeAmount} OT</span>}
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-zinc-900">{formatINR(e.gross)}</td>
                      <td className="px-4 py-3 text-xs text-rose-500">{formatINR(e.totalDeductions)}</td>
                      <td className="px-4 py-3 text-xs font-extrabold text-emerald-600">{formatINR(e.netPay)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${ENTRY_STATUS_BADGE[e.status].base}`}>
                          {ENTRY_STATUS_BADGE[e.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/hrms/payroll/run/${run.id}/payslip/${e.id}`)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="Payslip">
                            <Eye size={14} />
                          </button>
                          {run.status === 'calculated' && (
                            <button onClick={() => openEdit(e)} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                              <Pen size={14} />
                            </button>
                          )}
                          {e.status === 'approved' && (
                            <button onClick={() => payEntry(e)} className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Mark Paid">
                              <Banknote size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-zinc-100">
              {paged.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/hrms/payroll/run/${run.id}/payslip/${e.id}`)}
                  className="p-4 space-y-2 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-900">{e.employeeName}</p>
                      <p className="text-[10px] text-zinc-400">{ROLE_LABELS[e.role] || e.role} · {payModelLabel(e.payModel)}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${ENTRY_STATUS_BADGE[e.status].base}`}>
                      {ENTRY_STATUS_BADGE[e.status].label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                    <span>P {e.presentDays}</span><span>H {e.halfDays}</span><span>LOP {e.lopDays}</span>
                    {e.latePenalty > 0 && <span className="text-rose-500">−₹{e.latePenalty}</span>}
                    {e.overtimeAmount > 0 && <span className="text-violet-600">+₹{e.overtimeAmount} OT</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold text-emerald-600">{formatINR(e.netPay)}</p>
                    <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                      <button onClick={() => navigate(`/hrms/payroll/run/${run.id}/payslip/${e.id}`)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="Payslip">
                        <Eye size={14} />
                      </button>
                      {run.status === 'calculated' && (
                        <button onClick={() => openEdit(e)} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                          <Pen size={14} />
                        </button>
                      )}
                      {e.status === 'approved' && (
                        <button onClick={() => payEntry(e)} className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Mark Paid">
                          <Banknote size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">
                  Showing <span className="font-bold text-zinc-900">{startRow}</span>–
                  <span className="font-bold text-zinc-900">{endRow}</span> of{' '}
                  <span className="font-bold text-zinc-900">{filtered.length}</span> entries
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={16} className="text-zinc-600" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={16} className="text-zinc-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {editEntry && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setEditEntry(null)} role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-zinc-900">Edit Entry — {editForm.employeeName}</h3>
              <button type="button" onClick={() => setEditEntry(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Present Days">
                  <input type="number" className={inputClass} value={editForm.presentDays} onChange={(e) => setEditForm({ ...editForm, presentDays: num(e.target.value) })} />
                </Field>
                <Field label="Half Days">
                  <input type="number" className={inputClass} value={editForm.halfDays} onChange={(e) => setEditForm({ ...editForm, halfDays: num(e.target.value) })} />
                </Field>
                <Field label="Overtime Hours">
                  <input type="number" className={inputClass} value={editForm.overtimeHours} onChange={(e) => setEditForm({ ...editForm, overtimeHours: num(e.target.value) })} />
                </Field>
                <Field label="LOP Days (Unpaid)">
                  <input type="number" className={inputClass} value={editForm.lopDays} onChange={(e) => setEditForm({ ...editForm, lopDays: num(e.target.value) })} />
                </Field>
                <Field label="Bonus / Incentive">
                  <input type="number" className={inputClass} value={editForm.bonus} onChange={(e) => setEditForm({ ...editForm, bonus: num(e.target.value) })} />
                </Field>
                <Field label="Late Penalty (₹)">
                  <input type="number" className={inputClass} value={editForm.latePenalty} onChange={(e) => setEditForm({ ...editForm, latePenalty: num(e.target.value) })} />
                </Field>
                <Field label="Overtime Amount (₹)">
                  <input type="number" className={inputClass} value={editForm.overtimeAmount} onChange={(e) => setEditForm({ ...editForm, overtimeAmount: num(e.target.value) })} />
                </Field>
                <Field label="Salary Advance Repayment (₹)">
                  <input type="number" className={inputClass} value={editForm.advanceDeduction || 0} onChange={(e) => setEditForm({ ...editForm, advanceDeduction: num(e.target.value) })} />
                </Field>
                <Field label="Mediclaim Premium (₹)">
                  <input type="number" className={inputClass} value={editForm.mediclaimDeduction || 0} onChange={(e) => setEditForm({ ...editForm, mediclaimDeduction: num(e.target.value) })} />
                </Field>
                <Field label="Payment Mode">
                  <SearchableSelect
                    value={editForm.paymentMode}
                    onChange={(v) => setEditForm({ ...editForm, paymentMode: v as PayEntry['paymentMode'] })}
                    options={PAYMENT_MODE_OPTIONS}
                    placeholder="Payment Mode"
                  />
                </Field>
              </div>
              <p className="text-[10px] text-zinc-400">
                Calculate pulls these from attendance. You can override here; saving recomputes the payslip.
              </p>
              <button type="submit" className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                <Pen size={16} />Save & Recalculate
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-5">
              <h3 className="font-bold text-zinc-900 mb-1">Delete this run?</h3>
              <p className="text-xs text-zinc-500">This permanently removes the {monthLabel(run.month)} run. You can Generate Run again for that month afterward.</p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmRegenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-5">
              <h3 className="font-bold text-zinc-900 mb-1">Regenerate this run?</h3>
              <p className="text-xs text-zinc-500">Rebuilds {monthLabel(run.month)} from all active salary structures, resets to draft, and replaces existing entries.</p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setConfirmRegenerate(false)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors">Cancel</button>
              <button onClick={handleRegenerate} className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-colors">Regenerate</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all';
