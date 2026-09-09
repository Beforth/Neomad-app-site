import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Receipt, Plus, Search, XCircle, Eye, X, Pen,
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  Inbox, IndianRupee, Clock, CheckCircle2, Banknote, CreditCard,
  Smartphone, Landmark, FileText,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import {
  Category, Expense, ExpenseStatus, AdvanceExpense,
  expenseAmount, expenseTotal, primaryPayment, formatINR, todayStr,
  listExpenses, resolveExpense, listAdvances, createAdvance, resolveAdvance,
} from '../../lib/hrmsExpenses';

type SortKey = 'date' | 'created' | 'amount';

const STATUS_BADGE: Record<ExpenseStatus, { base: string; label: string }> = {
  draft: { base: 'bg-zinc-100 text-zinc-500', label: 'Draft' },
  pending: { base: 'bg-amber-50 text-amber-600', label: 'Pending' },
  approved: { base: 'bg-emerald-50 text-emerald-600', label: 'Approved' },
  rejected: { base: 'bg-rose-50 text-rose-600', label: 'Rejected' },
};

const CATEGORY_BADGE: Record<Category, { base: string; label: string }> = {
  travel: { base: 'bg-blue-50 text-blue-600', label: 'Travel' },
  food: { base: 'bg-amber-50 text-amber-600', label: 'Food' },
  office: { base: 'bg-purple-50 text-purple-600', label: 'Office' },
  accommodation: { base: 'bg-teal-50 text-teal-600', label: 'Accommodation' },
  utilities: { base: 'bg-orange-50 text-orange-600', label: 'Utilities' },
  software: { base: 'bg-indigo-50 text-indigo-600', label: 'Software' },
  subscriptions: { base: 'bg-cyan-50 text-cyan-600', label: 'Subscriptions' },
  supplies: { base: 'bg-lime-50 text-lime-600', label: 'Supplies / Stationery' },
  maintenance: { base: 'bg-yellow-50 text-yellow-600', label: 'Maintenance' },
  training: { base: 'bg-pink-50 text-pink-600', label: 'Training' },
  communication: { base: 'bg-sky-50 text-sky-600', label: 'Communication' },
  other: { base: 'bg-zinc-100 text-zinc-600', label: 'Other' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'office', label: 'Office' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'software', label: 'Software' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'supplies', label: 'Supplies / Stationery' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'training', label: 'Training' },
  { value: 'communication', label: 'Communication' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_BADGE: Record<string, { base: string; label: string }> = {
  cash: { base: 'bg-emerald-50 text-emerald-600', label: 'Cash' },
  card: { base: 'bg-blue-50 text-blue-600', label: 'Card' },
  upi: { base: 'bg-purple-50 text-purple-600', label: 'UPI' },
  net_banking: { base: 'bg-indigo-50 text-indigo-600', label: 'Net Banking' },
  cheque: { base: 'bg-amber-50 text-amber-600', label: 'Cheque' },
};

const PAYMENT_ICON: Record<string, any> = {
  cash: Banknote,
  card: CreditCard,
  upi: Smartphone,
  net_banking: Landmark,
  cheque: FileText,
};

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'All Payments' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'cheque', label: 'Cheque' },
];

const PAGE_SIZE = 10;

function formatCreatedTime(createdAt?: string) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function Expenses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  
  const statusParam = searchParams.get('status') || 'all';
  const [statusFilter, setStatusFilterState] = useState(statusParam);

  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setStatusFilterState(s);
  }, [searchParams]);

  const setStatusFilter = (val: string) => {
    setStatusFilterState(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val === 'all') next.delete('status');
      else next.set('status', val);
      return next;
    });
  };
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ expenseId: number; action: 'approve' | 'reject' } | null>(null);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [approveAmount, setApproveAmount] = useState(0);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTabState] = useState<'expenses' | 'advances'>(tabParam === 'advances' ? 'advances' : 'expenses');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'advances') setActiveTabState('advances');
    else if (t === 'expenses') setActiveTabState('expenses');
  }, [searchParams]);

  const setActiveTab = (tab: 'expenses' | 'advances') => {
    setActiveTabState(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'advances') next.set('tab', 'advances');
      else next.delete('tab');
      return next;
    });
  };
  const [advances, setAdvances] = useState<AdvanceExpense[]>([]);
  const [advModalOpen, setAdvModalOpen] = useState(false);
  const [advTitle, setAdvTitle] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advReason, setAdvReason] = useState('');
  const [advDate, setAdvDate] = useState(todayStr());
  const [advSubmitting, setAdvSubmitting] = useState(false);

  const [confirmAdvModal, setConfirmAdvModal] = useState<{ advanceId: number; action: 'approve' | 'reject' } | null>(null);
  const [advConfirmNotes, setAdvConfirmNotes] = useState('');
  const [advApproveAmount, setAdvApproveAmount] = useState(0);

  const fetchAdvances = useCallback(async () => {
    if (!token) return;
    try {
      const data = await listAdvances(token);
      setAdvances(data);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  const fetchExpenses = useCallback(async () => {
    if (!token) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listExpenses(token);
      setExpenses(data);
    } catch (e) {
      setExpenses([]);
      setToast(e instanceof Error ? e.message : 'Failed to load expenses');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchExpenses();
    fetchAdvances();
  }, [fetchExpenses, fetchAdvances]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, categoryFilter, paymentFilter, searchDebounced]);

  const hasFilters = search || statusFilter !== 'all' || categoryFilter !== 'all' || paymentFilter !== 'all';

  const filtered = useMemo(() => {
    let list = [...expenses];
    const q = searchDebounced.toLowerCase().trim();
    if (q) {
      list = list.filter((e) =>
        e.employeeName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter((e) => e.category === categoryFilter);
    if (paymentFilter !== 'all') list = list.filter((e) => primaryPayment(e)?.paymentMethod === paymentFilter);
    list.sort((a, b) => {
      const va = sortBy === 'amount' ? expenseAmount(a) : sortBy === 'created' ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
      const vb = sortBy === 'amount' ? expenseAmount(b) : sortBy === 'created' ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
      return sortOrder === 'asc' ? va - vb : vb - va;
    });
    return list;
  }, [expenses, searchDebounced, statusFilter, categoryFilter, paymentFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortOrder('asc'); }
  }

  const totalAmount = expenses.reduce((s, e) => s + expenseTotal(e), 0);
  const pendingCount = expenses.filter((e) => e.status === 'pending').length;
  const approvedCount = expenses.filter((e) => e.status === 'approved').length;

  const statCards = [
    { label: 'Total Expenses', value: expenses.length, icon: Receipt, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending', value: pendingCount, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Approved', value: approvedCount, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Amount', value: formatINR(totalAmount), icon: IndianRupee, color: 'bg-purple-50 text-purple-600', small: true },
  ];

  const sortColumns: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount' },
  ];

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />;
  }

  async function updateExpenseStatus(expenseId: number, newStatus: 'approved' | 'rejected', notes = '', approvedAmt?: number) {
    if (!token) return;
    try {
      await resolveExpense(token, expenseId, {
        status: newStatus,
        approval_notes: notes || undefined,
        approved_amount: newStatus === 'approved' ? approvedAmt : undefined,
      });
      await fetchExpenses();
      setToast(newStatus === 'approved' ? 'Expense approved' : 'Expense rejected');
      setTimeout(() => setToast(''), 2500);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to update expense');
      setTimeout(() => setToast(''), 2500);
    }
  }

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
      await fetchAdvances();
      setAdvModalOpen(false);
      setAdvTitle('');
      setAdvAmount('');
      setAdvReason('');
      setToast('Salary advance request submitted!');
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
      await fetchAdvances();
      setToast(newStatus === 'approved' ? 'Salary Advance Approved' : 'Salary Advance Rejected');
      setTimeout(() => setToast(''), 2500);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to update advance');
      setTimeout(() => setToast(''), 2500);
    }
  }

  const totalAdvApproved = advances.filter(a => a.status === 'approved').reduce((s, a) => s + (a.approvedAmount || a.amount), 0);
  const pendingAdvCount = advances.filter(a => a.status === 'pending').length;

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
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-zinc-900 text-white shadow-sm"
        >
          Business Claims
        </button>
        <button
          onClick={() => navigate('/hrms/advances')}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        >
          Salary Advances
        </button>
      </div>

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Expenses</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Company expense reimbursement claims</p>
        </div>
        <button onClick={() => navigate('/hrms/expenses/new')} className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
          <Plus size={14} />Add Expense
        </button>
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
              <p className={`${card.small ? 'text-sm' : 'text-lg'} font-extrabold text-zinc-900 leading-none truncate`}>
                {card.value}
              </p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">
                {card.label}
              </p>
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
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
          />
        </div>
        <div className="w-[150px]">
          <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
        </div>
        <div className="w-[150px]">
          <SearchableSelect value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_FILTER_OPTIONS} placeholder="Category" />
        </div>
        <div className="w-[150px]">
          <SearchableSelect value={paymentFilter} onChange={setPaymentFilter} options={PAYMENT_OPTIONS} placeholder="Payment" />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setPaymentFilter('all'); }} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
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
            <h3 className="text-sm font-bold text-zinc-900 mb-1">
              {loading ? 'Loading expenses...' : expenses.length === 0 ? 'No expenses yet' : 'No results found'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs">
              {expenses.length === 0 ? 'Click "Add Expense" to log your first expense.' : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Employee</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Category</th>
                    {sortColumns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600 select-none"
                      >
                        <span className="flex items-center gap-1">{col.label}<SortIcon col={col.key} /></span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Payment</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {paged.map((e, i) => {
                    const pm = primaryPayment(e)?.paymentMethod || '';
                    return (
                      <motion.tr
                        key={e.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => navigate(`/hrms/expenses/${e.id}`)}
                        className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <button onClick={(ev) => { ev.stopPropagation(); navigate(`/hrms/expenses/employee/${encodeURIComponent(e.employeeName)}`); }}
                            className="text-xs font-bold text-zinc-900 hover:text-emerald-600 transition-colors text-left">
                            {e.employeeName}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${CATEGORY_BADGE[e.category]?.base || 'bg-zinc-100 text-zinc-600'}`}>
                              {CATEGORY_BADGE[e.category]?.label || e.category}
                            </span>
                            {(e.date > todayStr() || e.description?.toLowerCase().includes('advance') || primaryPayment(e)?.title?.toLowerCase().includes('advance')) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold">
                                ⚡ Advance Expense
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs text-zinc-500">{e.date}</p>
                          {formatCreatedTime(e.createdAt) && (
                            <p className="text-[10px] text-zinc-400">{formatCreatedTime(e.createdAt)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-zinc-900">{formatINR(expenseAmount(e))}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${PAYMENT_BADGE[pm]?.base}`}>
                            {(() => {
                              const Icon = PAYMENT_ICON[pm];
                              return Icon && <Icon size={10} />;
                            })()}
                            {PAYMENT_BADGE[pm]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[e.status].base}`}>
                            {STATUS_BADGE[e.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => navigate(`/hrms/expenses/${e.id}`)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View">
                              <Eye size={14} />
                            </button>
                            {e.status === 'draft' && (
                              <button onClick={() => navigate(`/hrms/expenses/edit/${e.id}`)} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="Edit draft">
                                <Pen size={12} /> Edit
                              </button>
                            )}
                            {e.status === 'pending' && (
                              <>
                                <button onClick={() => { setConfirmModal({ expenseId: e.id, action: 'approve' }); setConfirmNotes(''); setApproveAmount(expenseTotal(e)); }} className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                                  <CheckCircle2 size={14} />
                                </button>
                                <button onClick={() => { setConfirmModal({ expenseId: e.id, action: 'reject' }); setConfirmNotes(''); }} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-zinc-100">
              {paged.map((e, i) => {
                const pm = primaryPayment(e)?.paymentMethod || '';
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/hrms/expenses/${e.id}`)}
                    className="p-4 space-y-2 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <button onClick={(ev) => { ev.stopPropagation(); navigate(`/hrms/expenses/employee/${encodeURIComponent(e.employeeName)}`); }}
                        className="text-xs font-bold text-zinc-900 hover:text-emerald-600 transition-colors text-left">
                        {e.employeeName}
                      </button>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[e.status].base}`}>
                        {STATUS_BADGE[e.status].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span className="flex flex-col">
                        <span>{e.date}</span>
                        {formatCreatedTime(e.createdAt) && (
                          <span className="text-zinc-400">{formatCreatedTime(e.createdAt)}</span>
                        )}
                      </span>
                      <span>Â·</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${CATEGORY_BADGE[e.category].base}`}>
                        {CATEGORY_BADGE[e.category].label}
                      </span>
                      <span>Â·</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${PAYMENT_BADGE[pm]?.base}`}>
                        {(() => {
                          const Icon = PAYMENT_ICON[pm];
                          return Icon && <Icon size={9} />;
                        })()}
                        {PAYMENT_BADGE[pm]?.label}
                      </span>
                    </div>
                    <p className="text-xs font-extrabold text-zinc-900">{formatINR(expenseAmount(e))}</p>
                    {e.status === 'draft' && (
                      <div onClick={(ev) => ev.stopPropagation()}>
                        <button onClick={() => navigate(`/hrms/expenses/edit/${e.id}`)} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="Edit draft">
                          <Pen size={12} /> Edit Draft
                        </button>
                      </div>
                    )}
                    {e.status === 'pending' && (
                      <div className="flex items-center gap-1 pt-1" onClick={(ev) => ev.stopPropagation()}>
                        <button onClick={() => { setConfirmModal({ expenseId: e.id, action: 'approve' }); setConfirmNotes(''); setApproveAmount(expenseTotal(e)); }} className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                          <CheckCircle2 size={14} />
                        </button>
                        <button onClick={() => { setConfirmModal({ expenseId: e.id, action: 'reject' }); setConfirmNotes(''); }} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                          <XCircle size={14} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">
                  Showing <span className="font-bold text-zinc-900">{startRow}</span>â€“
                  <span className="font-bold text-zinc-900">{endRow}</span> of{' '}
                  <span className="font-bold text-zinc-900">{filtered.length}</span> expenses
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

      {confirmModal && (() => {
        const target = expenses.find(x => x.id === confirmModal.expenseId);
        if (!target) return null;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => { setConfirmModal(null); setConfirmNotes(''); }} role="dialog" aria-modal="true">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 relative">
              <button type="button" onClick={() => { setConfirmModal(null); setConfirmNotes(''); }}
                className="absolute top-6 right-6 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-zinc-900">
                {confirmModal.action === 'approve' ? 'Approve Expense' : 'Reject Expense'}
              </h3>
            </div>
            <div className="p-5 space-y-3 border-b border-zinc-100 bg-zinc-50/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee</span>
                <span className="text-sm font-bold text-zinc-900">{target.employeeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Requested</span>
                <span className="text-sm font-bold text-zinc-900">{formatINR(expenseTotal(target))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</span>
                <span className="text-sm text-zinc-700 text-right max-w-[200px] truncate" title={target.description}>{target.description}</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {confirmModal.action === 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Approved Amount (â‚¹)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} value={approveAmount} onChange={(e) => setApproveAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all" />
                    <span className="text-xs text-zinc-400 whitespace-nowrap">/ â‚¹{expenseTotal(target).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  {confirmModal.action === 'reject' ? 'Rejection Reason (Required) *' : 'Approval Notes (Optional)'}
                </label>
                <textarea value={confirmNotes} onChange={(e) => setConfirmNotes(e.target.value)} rows={2}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all"
                  placeholder={confirmModal.action === 'approve' ? 'Reason for partial amount...' : 'State the reason for rejecting this claim...'} />
              </div>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-zinc-50/80">
              <button type="button" onClick={() => { setConfirmModal(null); setConfirmNotes(''); }}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="button"
                onClick={() => {
                  if (confirmModal.action === 'reject' && !confirmNotes.trim()) {
                    setToast('Please enter a rejection reason before rejecting.');
                    setTimeout(() => setToast(''), 2500);
                    return;
                  }
                  updateExpenseStatus(confirmModal.expenseId, confirmModal.action === 'approve' ? 'approved' : 'rejected', confirmNotes, confirmModal.action === 'approve' ? approveAmount : undefined);
                  setConfirmModal(null);
                  setConfirmNotes('');
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors ${
                  confirmModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 border border-emerald-200'
                    : 'bg-red-600 hover:bg-red-700 border border-red-200'
                }`}>
                {confirmModal.action === 'approve' ? <><CheckCircle2 size={14} /> Approve</> : <><XCircle size={14} /> Reject</>}
              </button>
            </div>
          </motion.div>
        </div>);
      })()}
    </div>
  );
}
