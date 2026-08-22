import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';
import {
  Receipt, Plus, Search, XCircle, Eye, X, Pen, Trash2, RotateCcw,
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  Inbox, IndianRupee, CheckCircle2, Clock, Banknote, CreditCard,
  Smartphone, Landmark, FileText, Calendar,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import {
  Category, Expense, ExpenseStatus,
  expenseAmount, expenseTotal, primaryPayment, formatINR, paymentsToApi,
  todayStr, timeNowStr,
  CATEGORY_OPTIONS, CATEGORY_LABELS,
  getMyExpenses,
  deleteExpense, resubmitExpense, updateExpense,
} from '../../lib/hrmsExpenses';

type SortKey = 'date' | 'created' | 'amount';

function formatCreatedTime(createdAt?: string) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

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

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'All Payments' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'cheque', label: 'Cheque' },
];

const PAGE_SIZE = 10;

const inputClass = 'w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all';

export default function MyExpenses() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const me = user?.username || '';

  const [myExpenses, setMyExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

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
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resubmitTarget, setResubmitTarget] = useState<Expense | null>(null);
  const [resubmitReceipt, setResubmitReceipt] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  const loadExpenses = useCallback(async () => {
    if (!token) {
      setMyExpenses([]);
      setLoadingExpenses(false);
      return;
    }
    setLoadingExpenses(true);
    try {
      const data = await getMyExpenses(token);
      setMyExpenses(data.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) {
      setMyExpenses([]);
      setToast(e instanceof Error ? e.message : 'Failed to load expenses');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setLoadingExpenses(false);
    }
  }, [token]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, categoryFilter, paymentFilter, searchDebounced]);

  const hasFilters = search || statusFilter !== 'all' || categoryFilter !== 'all' || paymentFilter !== 'all';

  const filtered = useMemo(() => {
    let list = [...myExpenses];
    const q = searchDebounced.toLowerCase().trim();
    if (q) list = list.filter((e) => e.description.toLowerCase().includes(q));
    if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter((e) => e.category === categoryFilter);
    if (paymentFilter !== 'all') list = list.filter((e) => primaryPayment(e)?.paymentMethod === paymentFilter);
    list.sort((a, b) => {
      const va = sortBy === 'amount' ? expenseAmount(a) : sortBy === 'created' ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
      const vb = sortBy === 'amount' ? expenseAmount(b) : sortBy === 'created' ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
      return sortOrder === 'asc' ? va - vb : vb - va;
    });
    return list;
  }, [myExpenses, searchDebounced, statusFilter, categoryFilter, paymentFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortOrder('asc'); }
  }

  const totalApproved = myExpenses
    .filter(e => e.status === 'approved')
    .reduce((acc, e) => acc + (e.approvedAmount ?? expenseTotal(e)), 0);
  const totalPending = myExpenses
    .filter(e => e.status === 'pending')
    .reduce((acc, e) => acc + expenseTotal(e), 0);

  const statCards = [
    { label: 'Total', value: myExpenses.length, icon: Receipt, color: 'bg-blue-50 text-blue-600' },
    { label: 'Approved', value: formatINR(totalApproved), icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending', value: formatINR(totalPending), icon: Clock, color: 'bg-amber-50 text-amber-600' },
  ];

  const sortColumns: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount' },
  ];

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={11} className="opacity-50" />;
    return sortOrder === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  }

  async function handleDelete() {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      await deleteExpense(token, deleteTarget.id);
      setDeleteTarget(null);
      setToast('Expense deleted');
      setTimeout(() => setToast(''), 2500);
      await loadExpenses();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to delete expense');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setDeleting(false);
    }
  }

  async function handleResubmit() {
    if (!resubmitTarget || !token) return;
    setResubmitting(true);
    try {
      if (resubmitReceipt && resubmitTarget.payments[0]) {
        const apiPayments = paymentsToApi(resubmitTarget.payments);
        if (apiPayments.length > 0) {
          apiPayments[0] = { ...apiPayments[0], receipt: resubmitReceipt };
        }
        await updateExpense(token, resubmitTarget.id, { payments: apiPayments });
      }
      await resubmitExpense(token, resubmitTarget.id);
      setResubmitTarget(null);
      setResubmitReceipt('');
      setToast('Expense resubmitted');
      setTimeout(() => setToast(''), 2500);
      await loadExpenses();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to resubmit expense');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setResubmitting(false);
    }
  }

  function handleResubmitReceiptFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setResubmitReceipt(reader.result as string);
    reader.readAsDataURL(file);
  }

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
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">My Expenses</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Track and manage your expense claims</p>
        </div>
        <button onClick={() => navigate('/hrms/expenses/new')} className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
          <Plus size={14} />New Expense
        </button>
      </motion.header>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
        {loadingExpenses || paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
              <Inbox size={24} className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">
              {loadingExpenses ? 'Loading expenses...' : myExpenses.length === 0 ? 'No expenses yet' : 'No results found'}
            </h3>
            {!loadingExpenses && (
              <p className="text-xs text-zinc-400 max-w-xs">
                {myExpenses.length === 0 ? 'Submit your first expense using the button above.' : 'Try adjusting your search or filters'}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                  <tr>
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
                        className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/hrms/expenses/${e.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded ${CATEGORY_BADGE[e.category]?.base || 'bg-zinc-100 text-zinc-600'} text-[10px] font-bold`}>
                              {CATEGORY_BADGE[e.category]?.label || e.category}
                            </span>
                            {(e.date > todayStr() || e.description?.toLowerCase().includes('advance') || primaryPayment(e)?.title?.toLowerCase().includes('advance')) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold">
                                ⚡ Advance Expense
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{e.date}</td>
                        <td className="px-4 py-3 text-xs font-bold text-zinc-900">{formatINR(expenseAmount(e))}</td>
                        <td className="px-4 py-3">
                          {pm && (() => {
                            const Icon = PAYMENT_ICON[pm];
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${PAYMENT_BADGE[pm]?.base || 'bg-zinc-100 text-zinc-600'} text-[10px] font-bold`}>
                                {Icon && <Icon size={10} />}
                                {PAYMENT_BADGE[pm]?.label || pm}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[e.status].base}`}>
                              {STATUS_BADGE[e.status].label}
                            </span>
                            {e.status === 'rejected' && e.approvalNotes && (
                              <span className="text-[10px] text-rose-600 font-medium max-w-[150px] truncate" title={e.approvalNotes}>
                                Reason: {e.approvalNotes}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => navigate(`/hrms/expenses/${e.id}`)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View">
                              <Eye size={14} />
                            </button>
                            {e.status === 'draft' && (
                              <button onClick={() => navigate(`/hrms/expenses/${e.id}/edit`)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                <Pen size={14} />
                              </button>
                            )}
                            {e.status === 'draft' && (
                              <button onClick={() => setDeleteTarget(e)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                <Trash2 size={14} />
                              </button>
                            )}
                            {e.status === 'rejected' && (
                              <button onClick={() => { setResubmitTarget(e); setResubmitReceipt(''); }} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Resubmit">
                                <RotateCcw size={14} />
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

            <div className="md:hidden divide-y divide-zinc-100">
              {paged.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/hrms/expenses/${e.id}`)}
                  className="p-4 space-y-2 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded ${CATEGORY_BADGE[e.category]?.base || 'bg-zinc-100 text-zinc-600'} text-[10px] font-bold`}>
                      {CATEGORY_BADGE[e.category]?.label || e.category}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${STATUS_BADGE[e.status].base}`}>
                      {STATUS_BADGE[e.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{e.date} {formatCreatedTime(e.createdAt)}</p>
                  <p className="text-xs font-extrabold text-zinc-900">{formatINR(expenseAmount(e))}</p>
                  {e.payments[0]?.receipt && (
                    <img src={e.payments[0].receipt} alt="" className="h-10 w-10 rounded-lg border border-zinc-200 object-cover" />
                  )}
                  <div className="flex items-center gap-1 pt-1" onClick={(ev) => ev.stopPropagation()}>
                    <button onClick={() => navigate(`/hrms/expenses/${e.id}`)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View">
                      <Eye size={14} />
                    </button>
                    {e.status === 'draft' && (
                      <button onClick={() => navigate(`/hrms/expenses/${e.id}/edit`)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <Pen size={14} />
                      </button>
                    )}
                    {e.status === 'draft' && (
                      <button onClick={() => setDeleteTarget(e)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                    {e.status === 'rejected' && (
                      <button onClick={() => { setResubmitTarget(e); setResubmitReceipt(''); }} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Resubmit">
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
                <p className="text-[11px] text-zinc-400 font-medium">
                  Showing {startRow}–{endRow} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[11px] font-bold text-zinc-500 px-2">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-zinc-100 relative">
              <button onClick={() => setDeleteTarget(null)}
                className="absolute top-6 right-6 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-zinc-900">Delete draft expense?</h3>
              <p className="text-sm text-zinc-600 mt-2">
                {formatINR(expenseTotal(deleteTarget))} — {deleteTarget.description}
              </p>
              <p className="text-xs text-red-600 font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-zinc-50/80">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60">
                <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {resubmitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => { setResubmitTarget(null); setResubmitReceipt(''); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-zinc-100 relative">
              <button type="button" onClick={() => { setResubmitTarget(null); setResubmitReceipt(''); }}
                className="absolute top-6 right-6 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-zinc-900">Resubmit Expense</h3>
              <p className="text-sm text-zinc-600 mt-2">
                {formatINR(expenseTotal(resubmitTarget))}
                <span className="block text-xs text-zinc-400 mt-0.5">{resubmitTarget.description}</span>
              </p>
            </div>
            <div className="p-5 space-y-4">
              {resubmitTarget.payments[0]?.receipt && !resubmitReceipt && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">Current Receipt</label>
                  <img src={resubmitTarget.payments[0].receipt} alt="Current receipt" className="h-20 rounded-lg border border-zinc-200" />
                </div>
              )}
              {resubmitReceipt && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">New Receipt</label>
                  <img src={resubmitReceipt} alt="New receipt" className="h-20 rounded-lg border border-zinc-200" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  {resubmitTarget.payments[0]?.receipt ? 'Replace Receipt (optional)' : 'Upload Receipt (optional)'}
                </label>
                <input type="file" accept="image/*" onChange={handleResubmitReceiptFile}
                  className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 file:cursor-pointer" />
              </div>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-zinc-50/80">
              <button type="button" onClick={() => { setResubmitTarget(null); setResubmitReceipt(''); }}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleResubmit} disabled={resubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-xs font-bold text-white hover:bg-amber-700 transition-colors disabled:opacity-60">
                {resubmitting ? 'Resubmitting...' : 'Resubmit'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
