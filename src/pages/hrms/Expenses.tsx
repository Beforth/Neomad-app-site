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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Category, Expense, ExpenseStatus, AdvanceExpense,
  expenseAmount, expenseTotal, primaryPayment, formatINR, todayStr,
  listExpenses, resolveExpense, listAdvances, createAdvance, resolveAdvance,
} from '../../lib/hrmsExpenses';

type SortKey = 'date' | 'created' | 'amount';

const STATUS_BADGE: Record<ExpenseStatus, { base: string; label: string }> = {
  draft: { base: 'bg-secondary text-muted-foreground', label: 'Draft' },
  pending: { base: 'bg-warning/10 text-warning', label: 'Pending' },
  approved: { base: 'bg-accent text-primary', label: 'Approved' },
  rejected: { base: 'bg-destructive/10 text-destructive', label: 'Rejected' },
};

const CATEGORY_BADGE: Record<Category, { base: string; label: string }> = {
  travel: { base: 'bg-info/10 text-info', label: 'Travel' },
  food: { base: 'bg-warning/10 text-warning', label: 'Food' },
  office: { base: 'bg-purple-50 text-purple-600', label: 'Office' },
  accommodation: { base: 'bg-accent text-primary', label: 'Accommodation' },
  utilities: { base: 'bg-orange-50 text-orange-600', label: 'Utilities' },
  software: { base: 'bg-indigo-50 text-indigo-600', label: 'Software' },
  subscriptions: { base: 'bg-cyan-50 text-cyan-600', label: 'Subscriptions' },
  supplies: { base: 'bg-lime-50 text-lime-600', label: 'Supplies / Stationery' },
  maintenance: { base: 'bg-warning/10 text-warning', label: 'Maintenance' },
  training: { base: 'bg-pink-50 text-pink-600', label: 'Training' },
  communication: { base: 'bg-info/10 text-info', label: 'Communication' },
  other: { base: 'bg-secondary text-foreground/70', label: 'Other' },
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
  cash: { base: 'bg-accent text-primary', label: 'Cash' },
  card: { base: 'bg-info/10 text-info', label: 'Card' },
  upi: { base: 'bg-purple-50 text-purple-600', label: 'UPI' },
  net_banking: { base: 'bg-indigo-50 text-indigo-600', label: 'Net Banking' },
  cheque: { base: 'bg-warning/10 text-warning', label: 'Cheque' },
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
    else { setSortBy(key); setSortOrder('desc'); }
  }

  const totalAmount = expenses.reduce((s, e) => s + expenseTotal(e), 0);
  const pendingCount = expenses.filter((e) => e.status === 'pending').length;
  const approvedCount = expenses.filter((e) => e.status === 'approved').length;

  const statCards = [
    { label: 'Total Expenses', value: expenses.length, icon: Receipt, color: 'bg-info/10 text-info' },
    { label: 'Pending', value: pendingCount, icon: Clock, color: 'bg-warning/10 text-warning' },
    { label: 'Approved', value: approvedCount, icon: CheckCircle2, color: 'bg-accent text-primary' },
    { label: 'Total Amount', value: formatINR(totalAmount), icon: IndianRupee, color: 'bg-purple-50 text-purple-600', small: true },
  ];

  const sortColumns: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount' },
  ];

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
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
          className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={16} className="text-primary" /> {toast}
        </motion.div>
      )}

      {/* Top Header Buttons (Business Claims vs Salary Advances) */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button variant="dark" size="sm"
          onClick={() => navigate('/hrms/expenses')}
          
        >
          Business Claims
        </Button>
        <Button variant="secondary" size="sm"
          onClick={() => navigate('/hrms/advances')}
          
        >
          Salary Advances
        </Button>
      </div>

      <PageHeader title="Expenses" description="Company expense reimbursement claims" actions={<>
<Button variant="dark" size="sm" className="self-start sm:self-auto" onClick={() => navigate('/hrms/expenses/new')} >
          <Plus size={14} />Add Expense
        </Button>
</>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className={`${card.small ? 'text-sm' : 'text-lg'} font-semibold text-foreground leading-none truncate`}>
                {card.value}
              </p>
              <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">
                {card.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
          <Input data-search="" className="w-full pl-9 pr-4"
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            
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
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setPaymentFilter('all'); }} className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors">
            <XCircle size={12} />Clear
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        {paged.length === 0 ? (
          <EmptyState icon={<Inbox />} title={loading ? 'Loading expenses...' : expenses.length === 0 ? 'No expenses yet' : 'No results found'} description={expenses.length === 0 ? 'Click "Add Expense" to log your first expense.' : 'Try adjusting your search or filters'} className="border-0" />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="uppercase whitespace-nowrap">Employee</TableHead>
                    <TableHead className="uppercase whitespace-nowrap">Category</TableHead>
                    {sortColumns.map((col) => (
                      <TableHead
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className="uppercase whitespace-nowrap cursor-pointer hover:text-foreground/70 select-none"
                      >
                        <span className="flex items-center gap-1">{col.label}<SortIcon col={col.key} /></span>
                      </TableHead>
                    ))}
                    <TableHead className="uppercase whitespace-nowrap">Payment</TableHead>
                    <TableHead className="uppercase whitespace-nowrap">Status</TableHead>
                    <TableHead className="uppercase whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((e, i) => {
                    const pm = primaryPayment(e)?.paymentMethod || '';
                    return (
                      <motion.tr
                        key={e.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => navigate(`/hrms/expenses/${e.id}`)}
                        className="border-b transition-colors hover:bg-muted/70 cursor-pointer"
                      >
                        <TableCell>
                          <button onClick={(ev) => { ev.stopPropagation(); navigate(`/hrms/expenses/employee/${encodeURIComponent(e.employeeName)}`); }}
                            className="text-xs font-semibold text-foreground hover:text-primary transition-colors text-left">
                            {e.employeeName}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge className={`${CATEGORY_BADGE[e.category]?.base || 'bg-secondary text-foreground/70'}`}>
                              {CATEGORY_BADGE[e.category]?.label || e.category}
                            </Badge>
                            {(e.date > todayStr() || e.description?.toLowerCase().includes('advance') || primaryPayment(e)?.title?.toLowerCase().includes('advance')) && (
                              <Badge className="bg-purple-50 text-purple-700 border-purple-200" >
                                ⚡ Advance Expense
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <p className="text-xs text-muted-foreground">{e.date}</p>
                          {formatCreatedTime(e.createdAt) && (
                            <p className="text-[11px] text-muted-foreground/70">{formatCreatedTime(e.createdAt)}</p>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{formatINR(expenseAmount(e))}</TableCell>
                        <TableCell>
                          <Badge className={`${PAYMENT_BADGE[pm]?.base}`}>
                            {(() => {
                              const Icon = PAYMENT_ICON[pm];
                              return Icon && <Icon size={10} />;
                            })()}
                            {PAYMENT_BADGE[pm]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_BADGE[e.status].base}`}>
                            {STATUS_BADGE[e.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(ev) => ev.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/hrms/expenses/${e.id}`)}  title="View">
                              <Eye size={14} />
                            </Button>
                            {e.status === 'draft' && (
                              <Button variant="ghost" size="xs" className="text-info hover:text-info hover:bg-info/10" onClick={() => navigate(`/hrms/expenses/edit/${e.id}`)}  title="Edit draft">
                                <Pen size={12} /> Edit
                              </Button>
                            )}
                            {e.status === 'pending' && (
                              <>
                                <Button variant="ghost" size="icon-sm" className="hover:text-primary hover:bg-accent" onClick={() => { setConfirmModal({ expenseId: e.id, action: 'approve' }); setConfirmNotes(''); setApproveAmount(expenseTotal(e)); }}  title="Approve">
                                  <CheckCircle2 size={14} />
                                </Button>
                                <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={() => { setConfirmModal({ expenseId: e.id, action: 'reject' }); setConfirmNotes(''); }}  title="Reject">
                                  <XCircle size={14} />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border">
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
                        className="text-xs font-semibold text-foreground hover:text-primary transition-colors text-left">
                        {e.employeeName}
                      </button>
                      <Badge className={`${STATUS_BADGE[e.status].base}`}>
                        {STATUS_BADGE[e.status].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex flex-col">
                        <span>{e.date}</span>
                        {formatCreatedTime(e.createdAt) && (
                          <span className="text-muted-foreground/70">{formatCreatedTime(e.createdAt)}</span>
                        )}
                      </span>
                      <span>Â·</span>
                      <Badge className={`${CATEGORY_BADGE[e.category].base}`}>
                        {CATEGORY_BADGE[e.category].label}
                      </Badge>
                      <span>Â·</span>
                      <Badge className={`${PAYMENT_BADGE[pm]?.base}`}>
                        {(() => {
                          const Icon = PAYMENT_ICON[pm];
                          return Icon && <Icon size={9} />;
                        })()}
                        {PAYMENT_BADGE[pm]?.label}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{formatINR(expenseAmount(e))}</p>
                    {e.status === 'draft' && (
                      <div onClick={(ev) => ev.stopPropagation()}>
                        <Button variant="ghost" size="xs" className="text-info hover:text-info hover:bg-info/10" onClick={() => navigate(`/hrms/expenses/edit/${e.id}`)}  title="Edit draft">
                          <Pen size={12} /> Edit Draft
                        </Button>
                      </div>
                    )}
                    {e.status === 'pending' && (
                      <div className="flex items-center gap-1 pt-1" onClick={(ev) => ev.stopPropagation()}>
                        <Button variant="ghost" size="icon-sm" className="hover:text-primary hover:bg-accent" onClick={() => { setConfirmModal({ expenseId: e.id, action: 'approve' }); setConfirmNotes(''); setApproveAmount(expenseTotal(e)); }}  title="Approve">
                          <CheckCircle2 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={() => { setConfirmModal({ expenseId: e.id, action: 'reject' }); setConfirmNotes(''); }}  title="Reject">
                          <XCircle size={14} />
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{startRow}</span>â€“
                  <span className="font-semibold text-foreground">{endRow}</span> of{' '}
                  <span className="font-semibold text-foreground">{filtered.length}</span> expenses
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} >
                    <ChevronLeft size={16} className="text-foreground/70" />
                  </Button>
                  <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} >
                    <ChevronRight size={16} className="text-foreground/70" />
                  </Button>
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
        <Dialog open onOpenChange={(open) => { if (!open) (() => { setConfirmModal(null); setConfirmNotes(''); })(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-6 border-b border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-6 right-6" type="button" onClick={() => { setConfirmModal(null); setConfirmNotes(''); }}
                >
                <X size={18} />
              </Button>
              <h3 className="text-lg font-semibold text-foreground">
                {confirmModal.action === 'approve' ? 'Approve Expense' : 'Reject Expense'}
              </h3>
            </div>
            <div className="p-5 space-y-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</span>
                <span className="text-sm font-semibold text-foreground">{target.employeeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requested</span>
                <span className="text-sm font-semibold text-foreground">{formatINR(expenseTotal(target))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
                <span className="text-sm text-foreground/85 text-right max-w-[200px] truncate" title={target.description}>{target.description}</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {confirmModal.action === 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-foreground/85 mb-1">Approved Amount (â‚¹)</label>
                  <div className="flex items-center gap-2">
                    <Input className="flex-1" type="number" min={0} value={approveAmount} onChange={(e) => setApproveAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                       />
                    <span className="text-xs text-muted-foreground/70 whitespace-nowrap">/ â‚¹{expenseTotal(target).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground/85 mb-1">
                  {confirmModal.action === 'reject' ? 'Rejection Reason (Required) *' : 'Approval Notes (Optional)'}
                </label>
                <Textarea className="w-full" value={confirmNotes} onChange={(e) => setConfirmNotes(e.target.value)} rows={2}
                  
                  placeholder={confirmModal.action === 'approve' ? 'Reason for partial amount...' : 'State the reason for rejecting this claim...'} />
              </div>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-muted/80">
              <Button variant="outline" size="sm" type="button" onClick={() => { setConfirmModal(null); setConfirmNotes(''); }}
                >
                Cancel
              </Button>
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
                    ? 'bg-primary hover:bg-primary border border-primary/20'
                    : 'bg-destructive hover:bg-destructive border border-destructive/20'
                }`}>
                {confirmModal.action === 'approve' ? <><CheckCircle2 size={14} /> Approve</> : <><XCircle size={14} /> Reject</>}
              </button>
            </div>
          </DialogContent>
</Dialog>);
      })()}
    </div>
  );
}
