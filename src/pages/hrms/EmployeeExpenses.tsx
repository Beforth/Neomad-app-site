import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, Receipt, CheckCircle2, XCircle, Clock, X,
  Banknote, CreditCard, Smartphone, Landmark, FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  Category, Expense, ExpenseStatus,
  expenseTotal, primaryPayment, formatINR, paymentsToApi,
  listExpenses, resubmitExpense, updateExpense,
} from '../../lib/hrmsExpenses';
import SearchableSelect from '../../components/SearchableSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const STATUS_BADGE: Record<ExpenseStatus, { base: string; label: string }> = {
  draft: { base: 'bg-secondary text-muted-foreground', label: 'Draft' },
  pending: { base: 'bg-warning/10 text-warning', label: 'Pending' },
  approved: { base: 'bg-accent text-primary', label: 'Approved' },
  rejected: { base: 'bg-destructive/10 text-destructive', label: 'Rejected' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

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

export default function EmployeeExpenses() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { employeeName } = useParams<{ employeeName: string }>();
  const decodedName = decodeURIComponent(employeeName || '');
  const [receiptTarget, setReceiptTarget] = useState<string | null>(null);
  const [resubmitTarget, setResubmitTarget] = useState<Expense | null>(null);
  const [resubmitReceipt, setResubmitReceipt] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadExpenses = useCallback(async () => {
    if (!token || !decodedName) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listExpenses(token, { search: decodedName });
      const mine = data
        .filter((e) => e.employeeName === decodedName)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExpenses(mine);
    } catch (e) {
      setExpenses([]);
      setToast(e instanceof Error ? e.message : 'Failed to load expenses');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setLoading(false);
    }
  }, [token, decodedName]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const employeeExpenses = expenses;

  const visibleExpenses = useMemo(
    () => statusFilter === 'all' ? employeeExpenses : employeeExpenses.filter((e) => e.status === statusFilter),
    [employeeExpenses, statusFilter]
  );

  async function handleResubmit() {
    if (!resubmitTarget || !token) return;
    setResubmitting(true);
    try {
      if (resubmitReceipt) {
        const payments = resubmitTarget.payments.map((p, i) =>
          i === 0 ? { ...p, receipt: resubmitReceipt } : p,
        );
        await updateExpense(token, resubmitTarget.id, { payments: paymentsToApi(payments) });
      }
      await resubmitExpense(token, resubmitTarget.id);
      setResubmitTarget(null);
      setResubmitReceipt('');
      await loadExpenses();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to resubmit expense');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setResubmitting(false);
    }
  }

  function handleResubmitReceiptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setResubmitReceipt(reader.result as string);
    reader.readAsDataURL(file);
  }

  function openResubmitModal(expense: Expense) {
    setResubmitTarget(expense);
    setResubmitReceipt('');
  }

  const totalApproved = useMemo(
    () => employeeExpenses.filter((e) => e.status === 'approved').reduce((s, e) => s + (e.approvedAmount ?? expenseTotal(e)), 0),
    [employeeExpenses]
  );
  const totalRejected = useMemo(
    () => employeeExpenses.filter((e) => e.status === 'rejected').reduce((s, e) => s + expenseTotal(e), 0),
    [employeeExpenses]
  );
  const totalPending = useMemo(
    () => employeeExpenses.filter((e) => e.status === 'pending').reduce((s, e) => s + expenseTotal(e), 0),
    [employeeExpenses]
  );

  const statCards = [
    { label: 'Total Requests', value: employeeExpenses.length, icon: Receipt, color: 'bg-info/10 text-info' },
    { label: 'Approved', value: formatINR(totalApproved), icon: CheckCircle2, color: 'bg-accent text-primary' },
    { label: 'Rejected', value: formatINR(totalRejected), icon: XCircle, color: 'bg-destructive/10 text-destructive' },
    { label: 'Pending', value: formatINR(totalPending), icon: Clock, color: 'bg-warning/10 text-warning' },
  ];

  if (!decodedName) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-semibold text-foreground mb-1">Employee not specified</h3>
          <Button variant="dark" size="sm" onClick={() => navigate('/hrms/expenses')} >
            Back to Expenses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <XCircle size={16} className="text-destructive" /> {toast}
        </motion.div>
      )}

      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/hrms/expenses')} >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{decodedName}</h1>
          <p className="text-[13px] text-muted-foreground">Expense history and details</p>
        </div>
      </motion.header>

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
              <p className="text-lg font-semibold text-foreground leading-none truncate">{card.value}</p>
              <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] p-3 flex flex-wrap gap-3 items-center">
        <div className="w-[150px]">
          <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
        </div>
        {statusFilter !== 'all' && (
          <button onClick={() => setStatusFilter('all')} className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors">
            <XCircle size={12} />Clear
          </button>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden">
        {loading || visibleExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt size={32} className="text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {loading ? 'Loading expenses...' : employeeExpenses.length === 0 ? 'No expenses found' : 'No results found'}
            </h3>
            {!loading && (
              <>
                <p className="text-xs text-muted-foreground/70 mb-4">
                  {employeeExpenses.length === 0
                    ? `${decodedName} hasn't submitted any expenses yet.`
                    : 'No expenses match the selected status.'}
                </p>
                {employeeExpenses.length === 0 ? (
                  <Button variant="dark" size="sm" onClick={() => navigate('/hrms/expenses/new')} >
                    Add Expense
                  </Button>
                ) : (
                  <Button variant="dark" size="sm" onClick={() => setStatusFilter('all')} >
                    Clear Filter
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left uppercase">#</TableHead>
                  <TableHead className="text-left uppercase">Date</TableHead>
                  <TableHead className="text-left uppercase">Category</TableHead>
                  <TableHead className="text-left uppercase">Requested</TableHead>
                  <TableHead className="text-left uppercase">Approved</TableHead>
                  <TableHead className="text-left uppercase">Remaining</TableHead>
                  <TableHead className="text-left uppercase">Payment</TableHead>
                  <TableHead className="text-left uppercase">Status</TableHead>
                  <TableHead className="text-left uppercase">Receipt</TableHead>
                  <TableHead className="text-left uppercase">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleExpenses.map((e, i) => {
                  const pm = primaryPayment(e)?.paymentMethod || '';
                  const receipt = primaryPayment(e)?.receipt || '';
                  return (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b transition-colors hover:bg-muted/70"
                    >
                      <TableCell className="text-muted-foreground/70 font-mono">{e.id}</TableCell>
                      <TableCell className="text-foreground/85 whitespace-nowrap">{e.date}</TableCell>
                      <TableCell>
                        <Badge className={`${CATEGORY_BADGE[e.category]?.base || 'bg-secondary text-foreground/70'}`}>
                          {CATEGORY_BADGE[e.category]?.label || e.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">{formatINR(expenseTotal(e))}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {e.status === 'approved' && e.approvedAmount !== undefined ? formatINR(e.approvedAmount) : '—'}
                      </TableCell>
                      <TableCell className="font-semibold text-destructive">
                        {e.status === 'approved' && e.approvedAmount !== undefined ? formatINR(Math.max(0, expenseTotal(e) - e.approvedAmount)) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${PAYMENT_BADGE[pm]?.base || 'bg-secondary text-foreground/70'}`}>
                          {(() => {
                            const Icon = PAYMENT_ICON[pm];
                            return Icon && <Icon size={10} />;
                          })()}
                          {PAYMENT_BADGE[pm]?.label || pm}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_BADGE[e.status].base}`}>
                          {STATUS_BADGE[e.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {receipt ? (
                          <Button variant="outline" size="xs" onClick={() => setReceiptTarget(receipt)}
                            >
                            <Receipt size={12} />
                            <span className="text-[11px] font-semibold">View</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/70">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {e.status === 'rejected' && (
                          <div className="flex flex-col gap-1">
                            {e.approvalNotes && (
                              <p className="text-[11px] text-destructive max-w-[200px] leading-tight" title={e.approvalNotes}>
                                {e.approvalNotes}
                              </p>
                            )}
                            <Button variant="soft" size="xs" className="self-start bg-warning/10 border-warning/25 text-warning hover:bg-warning/15" onClick={() => openResubmitModal(e)}
                              >
                              Resubmit
                            </Button>
                          </div>
                        )}
                        {e.status === 'approved' && e.approvalNotes && (
                          <p className="text-[11px] text-primary max-w-[200px] leading-tight" title={e.approvalNotes}>
                            {e.approvalNotes}
                          </p>
                        )}
                        {e.status === 'pending' && (
                          <span className="text-[11px] text-warning">Awaiting review</span>
                        )}
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

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
                {resubmitTarget.employeeName} — {formatINR(expenseTotal(resubmitTarget))}
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

      {receiptTarget && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setReceiptTarget(null))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-lg overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Receipt</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setReceiptTarget(null)} >
                <X size={16} />
              </Button>
            </div>
            <div className="p-4">
              <img src={receiptTarget} alt="Receipt" className="w-full rounded-lg border border-border" />
            </div>
          </DialogContent>
</Dialog>
      )}
    </div>
  );
}
