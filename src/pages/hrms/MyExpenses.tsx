import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';
import {
  Receipt, Plus, Search, XCircle, Eye, X, Pen, Trash2, RotateCcw,
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  Inbox, IndianRupee, CheckCircle2, Clock, Banknote, CreditCard,
  Smartphone, Landmark, FileText, Calendar, MoreHorizontal } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, fieldClass } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

const inputClass = fieldClass;

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
    { label: 'Total', value: myExpenses.length, icon: Receipt, color: 'bg-info/10 text-info' },
    { label: 'Approved', value: formatINR(totalApproved), icon: CheckCircle2, color: 'bg-accent text-primary' },
    { label: 'Pending', value: formatINR(totalPending), icon: Clock, color: 'bg-warning/10 text-warning' },
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

      <PageHeader title="My Expenses" description="Track and manage your expense claims" actions={<>
<Button variant="dark" size="sm" className="self-start sm:self-auto" onClick={() => navigate('/hrms/expenses/new')} >
          <Plus size={14} />New Expense
        </Button>
</>} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
              <p className="text-lg font-semibold text-foreground leading-none truncate">{card.value}</p>
              <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">{card.label}</p>
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
        {loadingExpenses || paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-3">
              <Inbox size={24} className="text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {loadingExpenses ? 'Loading expenses...' : myExpenses.length === 0 ? 'No expenses yet' : 'No results found'}
            </h3>
            {!loadingExpenses && (
              <p className="text-xs text-muted-foreground/70 max-w-xs">
                {myExpenses.length === 0 ? 'Submit your first expense using the button above.' : 'Try adjusting your search or filters'}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
                        className="border-b transition-colors hover:bg-muted/70 cursor-pointer"
                        onClick={() => navigate(`/hrms/expenses/${e.id}`)}
                      >
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
                        <TableCell className="text-muted-foreground whitespace-nowrap">{e.date}</TableCell>
                        <TableCell className="font-semibold text-foreground">{formatINR(expenseAmount(e))}</TableCell>
                        <TableCell>
                          {pm && (() => {
                            const Icon = PAYMENT_ICON[pm];
                            return (
                              <Badge className={`${PAYMENT_BADGE[pm]?.base || 'bg-secondary text-foreground/70'}`}>
                                {Icon && <Icon size={10} />}
                                {PAYMENT_BADGE[pm]?.label || pm}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge className={`${STATUS_BADGE[e.status].base}`}>
                              {STATUS_BADGE[e.status].label}
                            </Badge>
                            {e.status === 'rejected' && e.approvalNotes && (
                              <span className="text-[11px] text-destructive font-medium max-w-[150px] truncate" title={e.approvalNotes}>
                                Reason: {e.approvalNotes}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-10 pl-0" onClick={(e) => e.stopPropagation()}>
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon-sm" data-row-menu="" aria-label="Row actions"><MoreHorizontal /></Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-52">
<DropdownMenuItem onSelect={() => navigate(`/hrms/expenses/${e.id}`)}><Eye /> View</DropdownMenuItem>
                            {e.status === 'draft' && (
                              <DropdownMenuItem onSelect={() => navigate(`/hrms/expenses/${e.id}/edit`)}><Pen /> Edit</DropdownMenuItem>
                            )}
                            {e.status === 'draft' && (
                              <DropdownMenuItem destructive onSelect={() => setDeleteTarget(e)}><Trash2 /> Delete</DropdownMenuItem>
                            )}
                            {e.status === 'rejected' && (
                              <DropdownMenuItem onSelect={() => { setResubmitTarget(e); setResubmitReceipt(''); }}><RotateCcw /> Resubmit</DropdownMenuItem>
                            )}
</DropdownMenuContent>
</DropdownMenu>
</TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border">
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
                    <Badge className={`${CATEGORY_BADGE[e.category]?.base || 'bg-secondary text-foreground/70'}`}>
                      {CATEGORY_BADGE[e.category]?.label || e.category}
                    </Badge>
                    <Badge className={`shrink-0 ${STATUS_BADGE[e.status].base}`}>
                      {STATUS_BADGE[e.status].label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{e.date} {formatCreatedTime(e.createdAt)}</p>
                  <p className="text-xs font-semibold text-foreground">{formatINR(expenseAmount(e))}</p>
                  {e.payments[0]?.receipt && (
                    <img src={e.payments[0].receipt} alt="" className="h-10 w-10 rounded-lg border border-border object-cover" />
                  )}
                  <div className="flex items-center gap-1 pt-1" onClick={(ev) => ev.stopPropagation()}>
                    <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/hrms/expenses/${e.id}`)}  title="View">
                      <Eye size={14} />
                    </Button>
                    {e.status === 'draft' && (
                      <Button variant="ghost" size="icon-sm" className="hover:text-info hover:bg-info/10" onClick={() => navigate(`/hrms/expenses/${e.id}/edit`)}  title="Edit">
                        <Pen size={14} />
                      </Button>
                    )}
                    {e.status === 'draft' && (
                      <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(e)}  title="Delete">
                        <Trash2 size={14} />
                      </Button>
                    )}
                    {e.status === 'rejected' && (
                      <Button variant="ghost" size="icon-sm" className="hover:text-warning hover:bg-warning/10" onClick={() => { setResubmitTarget(e); setResubmitReceipt(''); }}  title="Resubmit">
                        <RotateCcw size={14} />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-[11px] text-muted-foreground/70 font-medium">
                  Showing {startRow}–{endRow} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    >
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="text-[11px] font-semibold text-muted-foreground px-2">{page} / {totalPages}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {deleteTarget && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setDeleteTarget(null))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-6 border-b border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-6 right-6" onClick={() => setDeleteTarget(null)}
                >
                <X size={18} />
              </Button>
              <h3 className="text-lg font-semibold text-foreground">Delete draft expense?</h3>
              <p className="text-sm text-foreground/70 mt-2">
                {formatINR(expenseTotal(deleteTarget))} — {deleteTarget.description}
              </p>
              <p className="text-xs text-destructive font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-muted/80">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}
                >
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15" onClick={handleDelete} disabled={deleting}
                >
                <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}

      {resubmitTarget && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => { setResubmitTarget(null); setResubmitReceipt(''); })(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-6 border-b border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-6 right-6" type="button" onClick={() => { setResubmitTarget(null); setResubmitReceipt(''); }}
                >
                <X size={18} />
              </Button>
              <h3 className="text-lg font-semibold text-foreground">Resubmit Expense</h3>
              <p className="text-sm text-foreground/70 mt-2">
                {formatINR(expenseTotal(resubmitTarget))}
                <span className="block text-xs text-muted-foreground/70 mt-0.5">{resubmitTarget.description}</span>
              </p>
            </div>
            <div className="p-5 space-y-4">
              {resubmitTarget.payments[0]?.receipt && !resubmitReceipt && (
                <div>
                  <label className="block text-xs font-medium text-foreground/85 mb-1.5">Current Receipt</label>
                  <img src={resubmitTarget.payments[0].receipt} alt="Current receipt" className="h-20 rounded-lg border border-border" />
                </div>
              )}
              {resubmitReceipt && (
                <div>
                  <label className="block text-xs font-medium text-foreground/85 mb-1.5">New Receipt</label>
                  <img src={resubmitReceipt} alt="New receipt" className="h-20 rounded-lg border border-border" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-foreground/85 mb-1.5">
                  {resubmitTarget.payments[0]?.receipt ? 'Replace Receipt (optional)' : 'Upload Receipt (optional)'}
                </label>
                <input type="file" accept="image/*" onChange={handleResubmitReceiptFile}
                  className="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-[13px] file:font-medium hover:file:bg-accent" />
              </div>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-muted/80">
              <Button variant="outline" size="sm" type="button" onClick={() => { setResubmitTarget(null); setResubmitReceipt(''); }}
                >
                Cancel
              </Button>
              <Button size="sm" className="bg-warning text-white hover:bg-warning hover:text-white bg-warning text-white hover:bg-warning" type="button" onClick={handleResubmit} disabled={resubmitting}
                >
                {resubmitting ? 'Resubmitting...' : 'Resubmit'}
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}
    </div>
  );
}
