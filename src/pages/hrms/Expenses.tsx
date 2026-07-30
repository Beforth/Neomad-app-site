import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Receipt, Plus, Search, XCircle, Eye, X,
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  Inbox, DollarSign, Clock, CheckCircle2,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';

type Status = 'draft' | 'pending' | 'approved' | 'rejected';
type Category = 'travel' | 'food' | 'office' | 'other';
type SortKey = 'date' | 'amount';

interface Expense {
  id: number;
  employeeName: string;
  category: Category;
  amount: number;
  taxAmount: number;
  date: string;
  description: string;
  status: Status;
  vendorName: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  receipt: string;
  approvalNotes: string;
  createdAt: string;
}

const SEED: Expense[] = [
  { id: 1, employeeName: 'Priya Sharma', category: 'travel', amount: 4200, taxAmount: 756, date: '2026-07-20', description: 'Client visit to Mumbai office', status: 'approved', vendorName: 'Indian Railways', paymentMethod: 'card', receipt: '', approvalNotes: 'Approved — valid client meeting', createdAt: '2026-07-20T09:00:00' },
  { id: 2, employeeName: 'Rohan Verma', category: 'food', amount: 1350, taxAmount: 0, date: '2026-07-21', description: 'Team lunch during sprint planning', status: 'pending', vendorName: 'Cafe Mocha', paymentMethod: 'cash', receipt: '', approvalNotes: '', createdAt: '2026-07-21T12:30:00' },
  { id: 3, employeeName: 'Anjali Patel', category: 'office', amount: 8500, taxAmount: 1530, date: '2026-07-18', description: 'Ergonomic keyboard and mouse', status: 'pending', vendorName: 'Amazon Business', paymentMethod: 'card', receipt: '', approvalNotes: '', createdAt: '2026-07-18T10:15:00' },
  { id: 4, employeeName: 'Karan Mehta', category: 'travel', amount: 22000, taxAmount: 3960, date: '2026-07-15', description: 'Flight to Delhi for conference', status: 'approved', vendorName: 'IndiGo Airlines', paymentMethod: 'bank_transfer', receipt: '', approvalNotes: 'Conference attendance confirmed', createdAt: '2026-07-15T08:00:00' },
  { id: 5, employeeName: 'Sneha Iyer', category: 'other', amount: 3000, taxAmount: 0, date: '2026-07-22', description: 'Professional development course', status: 'draft', vendorName: 'Coursera', paymentMethod: 'card', receipt: '', approvalNotes: '', createdAt: '2026-07-22T14:00:00' },
  { id: 6, employeeName: 'Amit Singh', category: 'food', amount: 680, taxAmount: 0, date: '2026-07-23', description: 'Client dinner — project kickoff', status: 'rejected', vendorName: 'Barbeque Nation', paymentMethod: 'card', receipt: '', approvalNotes: 'Missing receipt — please resubmit with proof', createdAt: '2026-07-23T20:00:00' },
  { id: 7, employeeName: 'Neha Gupta', category: 'office', amount: 15000, taxAmount: 2700, date: '2026-07-19', description: 'External monitor for work station', status: 'approved', vendorName: 'Flipkart Business', paymentMethod: 'bank_transfer', receipt: '', approvalNotes: 'Approved for remote setup', createdAt: '2026-07-19T11:30:00' },
  { id: 8, employeeName: 'Vikram Joshi', category: 'travel', amount: 5400, taxAmount: 972, date: '2026-07-24', description: 'Cab to Pune client site', status: 'pending', vendorName: 'Uber for Business', paymentMethod: 'cash', receipt: '', approvalNotes: '', createdAt: '2026-07-24T07:45:00' },
];

const STATUS_BADGE: Record<Status, { base: string; label: string }> = {
  draft: { base: 'bg-zinc-100 text-zinc-500', label: 'Draft' },
  pending: { base: 'bg-amber-50 text-amber-600', label: 'Pending' },
  approved: { base: 'bg-emerald-50 text-emerald-600', label: 'Approved' },
  rejected: { base: 'bg-rose-50 text-rose-600', label: 'Rejected' },
};

const CATEGORY_BADGE: Record<Category, { base: string; label: string }> = {
  travel: { base: 'bg-blue-50 text-blue-600', label: 'Travel' },
  food: { base: 'bg-amber-50 text-amber-600', label: 'Food' },
  office: { base: 'bg-purple-50 text-purple-600', label: 'Office' },
  other: { base: 'bg-zinc-100 text-zinc-600', label: 'Other' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
];

const PAGE_SIZE = 10;

function formatCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

export default function Expenses() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const stored = localStorage.getItem('expenses');
      if (stored) {
        const parsed = JSON.parse(stored) as Expense[];
        if (parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED;
  });
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ expenseId: number; action: 'approve' | 'reject' } | null>(null);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, categoryFilter, searchDebounced]);

  const hasFilters = search || statusFilter !== 'all' || categoryFilter !== 'all';

  const filtered = useMemo(() => {
    let list = [...expenses];
    const q = searchDebounced.toLowerCase().trim();
    if (q) {
      list = list.filter((e) =>
        e.employeeName.toLowerCase().includes(q) ||
        e.vendorName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter((e) => e.category === categoryFilter);
    list.sort((a, b) => {
      const va = sortBy === 'amount' ? a.amount : new Date(a.date).getTime();
      const vb = sortBy === 'amount' ? b.amount : new Date(b.date).getTime();
      return sortOrder === 'asc' ? va - vb : vb - va;
    });
    return list;
  }, [expenses, searchDebounced, statusFilter, categoryFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortOrder('asc'); }
  }

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const pendingCount = expenses.filter((e) => e.status === 'pending').length;
  const approvedCount = expenses.filter((e) => e.status === 'approved').length;

  const statCards = [
    { label: 'Total Expenses', value: expenses.length, icon: Receipt, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending', value: pendingCount, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Approved', value: approvedCount, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Amount', value: formatCurrency(totalAmount), icon: DollarSign, color: 'bg-purple-50 text-purple-600', small: true },
  ];

  const sortColumns: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount' },
  ];

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />;
  }

  function updateExpenseStatus(expenseId: number, newStatus: Status) {
    const updated = expenses.map((e) =>
      e.id === expenseId ? { ...e, status: newStatus } : e
    );
    setExpenses(updated);
    localStorage.setItem('expenses', JSON.stringify(updated));
    setToast(newStatus === 'approved' ? 'Expense approved' : 'Expense rejected');
    setTimeout(() => setToast(''), 2500);
  }

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-50 bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </motion.div>
      )}

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Expenses</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Track and manage team expenses</p>
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
          <SearchableSelect value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_OPTIONS} placeholder="Category" />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); }} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
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
              {expenses.length === 0 ? 'No expenses yet' : 'No results found'}
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
                      onClick={() => navigate(`/hrms/expenses/${e.id}`)}
                      className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-xs font-bold text-zinc-900">{e.employeeName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${CATEGORY_BADGE[e.category].base}`}>
                          {CATEGORY_BADGE[e.category].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{e.date}</td>
                      <td className="px-4 py-3 text-xs font-bold text-zinc-900">{formatCurrency(e.amount)}</td>
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
                          {e.status === 'pending' && (
                            <>
                              <button onClick={() => setConfirmModal({ expenseId: e.id, action: 'approve' })} className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                                <CheckCircle2 size={14} />
                              </button>
                              <button onClick={() => setConfirmModal({ expenseId: e.id, action: 'reject' })} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                                <XCircle size={14} />
                              </button>
                            </>
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
                  onClick={() => navigate(`/hrms/expenses/${e.id}`)}
                  className="p-4 space-y-2 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-bold text-zinc-900">{e.employeeName}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[e.status].base}`}>
                      {STATUS_BADGE[e.status].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span>{e.date}</span>
                    <span>·</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${CATEGORY_BADGE[e.category].base}`}>
                      {CATEGORY_BADGE[e.category].label}
                    </span>
                  </div>
                  <p className="text-xs font-extrabold text-zinc-900">{formatCurrency(e.amount)}</p>
                  {e.status === 'pending' && (
                    <div className="flex items-center gap-1 pt-1" onClick={(ev) => ev.stopPropagation()}>
                      <button onClick={() => setConfirmModal({ expenseId: e.id, action: 'approve' })} className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                        <CheckCircle2 size={14} />
                      </button>
                      <button onClick={() => setConfirmModal({ expenseId: e.id, action: 'reject' })} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                        <XCircle size={14} />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">
                  Showing <span className="font-bold text-zinc-900">{startRow}</span>–
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

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setConfirmModal(null)} role="dialog" aria-modal="true">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 relative">
              <button type="button" onClick={() => setConfirmModal(null)}
                className="absolute top-6 right-6 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-zinc-900">
                {confirmModal.action === 'approve' ? 'Approve expense?' : 'Reject expense?'}
              </h3>
              <p className="text-sm text-zinc-600 mt-2">
                Are you sure you want to {confirmModal.action} this expense?
              </p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-zinc-50/80">
              <button type="button" onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="button"
                onClick={() => {
                  updateExpenseStatus(confirmModal.expenseId, confirmModal.action === 'approve' ? 'approved' : 'rejected');
                  setConfirmModal(null);
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
        </div>
      )}
    </div>
  );
}
