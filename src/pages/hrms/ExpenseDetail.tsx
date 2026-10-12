import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, IndianRupee, Pen, CheckCircle2, XCircle, X, Trash2, RotateCcw,
  Download, Loader2,
  Banknote, CreditCard, Smartphone, Landmark, FileText, Clock, Receipt,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/SearchableSelect';
import {
  Expense, ExpenseStatus, CATEGORY_LABELS, PAYMENT_METHOD_LABELS,
  expenseAmount, expenseTax, expenseTotal, formatINR,
  getExpense, resolveExpense, deleteExpense, resubmitExpense, updateExpense,
} from '../../lib/hrmsExpenses';
import { exportExpensePdf } from '../../lib/hrmsExports';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import KpiStrip from '@/components/KpiStrip';

const STATUS_BADGE: Record<ExpenseStatus, { base: string; label: string }> = {
  draft: { base: 'bg-secondary text-muted-foreground', label: 'Draft' },
  pending: { base: 'bg-warning/10 text-warning', label: 'Pending' },
  approved: { base: 'bg-accent text-primary', label: 'Approved' },
  rejected: { base: 'bg-destructive/10 text-destructive', label: 'Rejected' },
};

const PAYMENT_ICON: Record<string, any> = {
  cash: Banknote,
  card: CreditCard,
  upi: Smartphone,
  net_banking: Landmark,
  cheque: FileText,
};

export default function ExpenseDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, token } = useAuth();
  const isEmployee = user?.role === 'delivery_boy' || user?.role === 'staff';
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const isOwn = isEmployee && !!expense && (
    expense.userId === user?.id || expense.employeeName === user?.username
  );
  const [toast, setToast] = useState('');
  const [notesModal, setNotesModal] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [approveAmount, setApproveAmount] = useState(0);
  const [resubmitTarget, setResubmitTarget] = useState<Expense | null>(null);
  const [resubmitReceipt, setResubmitReceipt] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  // Summary table on page one, then one page per attached receipt. Built on the
  // server because the receipts are stored there as data URLs.
  const handleExportPdf = async () => {
    if (!token || !expense || exporting) return;
    setExporting(true);
    try {
      const { filename } = await exportExpensePdf(token, expense.id);
      showToast(`Downloaded ${filename}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(async () => {
    if (!token || !id) {
      setExpense(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getExpense(token, Number(id));
      setExpense(data);
    } catch {
      setExpense(null);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(newStatus: 'approved' | 'rejected', note: string, approvedAmt?: number) {
    if (!token || !id) return;
    try {
      const updated = await resolveExpense(token, Number(id), {
        status: newStatus,
        approval_notes: note || undefined,
        approved_amount: newStatus === 'approved' ? approvedAmt : undefined,
      });
      setExpense(updated);
      setNotesModal(null);
      setNotes('');
      showToast(newStatus === 'approved' ? 'Expense approved' : 'Expense rejected');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update status');
    }
  }

  async function setStatusDirect(newStatus: ExpenseStatus) {
    if (!token || !id || !expense) return;
    try {
      if (newStatus === 'approved' || newStatus === 'rejected') {
        const updated = await resolveExpense(token, Number(id), {
          status: newStatus,
          approved_amount: newStatus === 'approved' ? expenseTotal(expense) : undefined,
        });
        setExpense(updated);
      } else if (newStatus === 'draft' || newStatus === 'pending') {
        const updated = await updateExpense(token, Number(id), { status: newStatus });
        setExpense(updated);
      }
      showToast(newStatus === 'approved' ? 'Expense approved' : newStatus === 'rejected' ? 'Expense rejected' : 'Status updated');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update status');
    }
  }

  async function handleDelete() {
    if (!token || !id) return;
    try {
      await deleteExpense(token, Number(id));
      setDeleteTarget(false);
      showToast('Expense deleted');
      setTimeout(() => navigate('/hrms/expenses'), 400);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete expense');
    }
  }

  function handleResubmitReceiptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setResubmitReceipt(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleResubmit() {
    if (!token || !resubmitTarget) return;
    setResubmitting(true);
    try {
      // If a new receipt was picked, patch first payment then resubmit.
      if (resubmitReceipt) {
        const payments = resubmitTarget.payments.map((p, i) => ({
          category: (p.category || 'other') as import('../../lib/hrmsExpenses').Category,
          title: p.title,
          amount: p.amount,
          tax_amount: p.taxAmount,
          payment_method: (p.paymentMethod || 'cash') as import('../../lib/hrmsExpenses').PaymentMethod,
          time: p.time || null,
          receipt: i === 0 ? resubmitReceipt : (p.receipt || null),
        }));
        await updateExpense(token, resubmitTarget.id, { payments });
      }
      const created = await resubmitExpense(token, resubmitTarget.id);
      setResubmitTarget(null);
      setResubmitReceipt('');
      showToast('Expense resubmitted');
      setTimeout(() => navigate(`/hrms/expenses/${created.id}`), 400);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to resubmit');
    } finally {
      setResubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground/70 animate-pulse py-16 text-center">Loading expense...</p>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-semibold text-foreground mb-1">Expense not found</h3>
          <p className="text-xs text-muted-foreground/70 mb-4">This expense doesn't exist or has been deleted.</p>
          <Button variant="dark" size="sm" onClick={() => navigate('/hrms/expenses')} >
            Back to Expenses
          </Button>
        </div>
      </div>
    );
  }

  if (isEmployee && !isOwn) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-semibold text-foreground mb-1">Expense not found</h3>
          <p className="text-xs text-muted-foreground/70 mb-4">You can only view your own expenses.</p>
          <Button variant="dark" size="sm" onClick={() => navigate('/hrms/expenses')} >
            Back to My Expenses
          </Button>
        </div>
      </div>
    );
  }

  const requested = expenseAmount(expense);
  const tax = expenseTax(expense);
  const total = expenseTotal(expense);

  const statusOptions = isEmployee
    ? [{ value: 'draft', label: 'Draft' }, { value: 'pending', label: 'Pending' }]
    : [{ value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }];

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={16} className="text-primary" /> {toast}
        </motion.div>
      )}

      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/hrms/expenses')} >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{expense.employeeName}</h1>
            <Badge className={`${STATUS_BADGE[expense.status].base}`}>
              {STATUS_BADGE[expense.status].label}
            </Badge>
            {(expense.date > new Date().toISOString().split('T')[0] || expense.description?.toLowerCase().includes('advance')) && (
              <Badge className="bg-purple-50 text-purple-700 border-purple-200" >
                ⚡ Advance Expense Request
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            {CATEGORY_LABELS[expense.category]} expense on {expense.date}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}
          
          title="Download this claim with its receipts as a PDF">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? 'Preparing…' : 'Export PDF'}
        </Button>
        {!isEmployee && expense.status === 'pending' && (
          <div className="flex items-center gap-1">
            <Button variant="soft" size="sm" className="bg-accent text-accent-foreground border-primary/20 hover:bg-primary/15" onClick={() => { setNotesModal('approve'); setNotes(''); setApproveAmount(total); }}
              >
              <CheckCircle2 size={14} /> Approve
            </Button>
            <Button variant="outline" size="sm" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15" onClick={() => { setNotesModal('reject'); setNotes(''); }}
              >
              <XCircle size={14} /> Reject
            </Button>
          </div>
        )}
        {isEmployee && expense.status === 'rejected' && (
          <Button variant="soft" size="sm" className="bg-warning/10 text-warning border-warning/25 hover:bg-warning/15" onClick={() => { setResubmitTarget(expense); setResubmitReceipt(''); }}
            >
            <RotateCcw size={14} /> Resubmit
          </Button>
        )}
        {!isEmployee && (
          <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(true)}  title="Delete">
            <Trash2 size={18} />
          </Button>
        )}
      </motion.header>

      <KpiStrip items={[
  { label: 'Requested', value: formatINR(requested) },
  { label: 'Tax', value: formatINR(tax) },
  { label: 'Total', value: formatINR(total) },
  { label: 'Payments', value: String(expense.payments.length) },
  { label: 'Approved', value: formatINR(expense.approvedAmount) },
  { label: 'Remaining', value: formatINR(Math.max(0, total - expense.approvedAmount)) },
]} />

      {expense.status === 'draft' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden">
          <div className="p-4 flex flex-wrap gap-3">
            <Button variant="soft" size="sm" className="bg-info/10 text-info border-info/25 hover:bg-info/15" onClick={() => navigate(`/hrms/expenses/edit/${expense.id}`)}
              >
              <Pen size={14} />Edit
            </Button>
            {isEmployee && (
              <Button variant="soft" size="sm" className="bg-accent text-accent-foreground border-primary/20 hover:bg-primary/15" onClick={() => setStatusDirect('pending')}
                >
                <CheckCircle2 size={14} />Submit for Approval
              </Button>
            )}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/50">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Expense Info</h2>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground/70 font-medium mb-1">Date</p>
            <p className="text-sm font-medium text-foreground">{expense.date}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground/70 font-medium mb-1">Status</p>
            <div className="flex items-center gap-2">
              <Badge className={`${STATUS_BADGE[expense.status].base}`}>
                {STATUS_BADGE[expense.status].label}
              </Badge>
              <div className="w-[140px]">
                <SearchableSelect
                  value={expense.status}
                  onChange={(v) => setStatusDirect(v as ExpenseStatus)}
                  options={statusOptions}
                  placeholder="Change status"
                />
              </div>
            </div>
            {!isEmployee && expense.status === 'pending' && (
              <p className="text-[11px] text-muted-foreground/70 mt-1">Use Approve / Reject above to review this claim.</p>
            )}
          </div>
          <div className="sm:col-span-1">
            <p className="text-xs text-muted-foreground/70 font-medium mb-1">Description</p>
            <p className="text-sm font-medium text-foreground">{expense.description || '—'}</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/50">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Payments</h2>
        </div>
        {expense.payments.length === 0 ? (
          <div className="p-4">
            <p className="text-xs text-muted-foreground/70">No payment details attached.</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {expense.payments.map((pay, i) => {
              const Icon = PAYMENT_ICON[pay.paymentMethod];
              return (
                <div key={pay.id ?? i} className="rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {Icon && <Icon size={15} className="text-muted-foreground/70 shrink-0" />}
                      <p className="text-xs font-semibold text-foreground truncate">{pay.title || 'Payment'}</p>
                    </div>
                    <Badge className="shrink-0" >
                      {PAYMENT_METHOD_LABELS[pay.paymentMethod] || pay.paymentMethod || '—'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pay.category && (
                      <Badge>
                        {CATEGORY_LABELS[pay.category] || pay.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="font-semibold text-foreground">{formatINR(Number(pay.amount) || 0)}</span>
                    {Number(pay.taxAmount) > 0 && <span className="text-warning">+ tax {formatINR(Number(pay.taxAmount) || 0)}</span>}
                    {pay.time && (
                      <span className="flex items-center gap-1 text-muted-foreground/70">
                        <Clock size={11} /> {pay.time}
                      </span>
                    )}
                  </div>
                  {pay.receipt ? (
                    <div className="relative inline-block">
                      <img src={pay.receipt} alt="Receipt" className="h-20 rounded-lg border border-border" />
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
                      <Receipt size={11} /> No receipt attached
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {expense.approvalNotes && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/50">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Approval Notes</h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-foreground/85">{expense.approvalNotes}</p>
          </div>
        </motion.div>
      )}

      {notesModal && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => { setNotesModal(null); setNotes(''); })(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{notesModal === 'approve' ? 'Approve Expense' : 'Reject Expense'}</h3>
              <button onClick={() => { setNotesModal(null); setNotes(''); }} className="text-muted-foreground/70 hover:text-foreground/70 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-3 space-y-2 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</span>
                <span className="text-sm font-semibold text-foreground">{expense.employeeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requested</span>
                <span className="text-sm font-semibold text-foreground">{formatINR(total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
                <span className="text-sm text-foreground/85 text-right max-w-[200px] truncate" title={expense.description}>{expense.description}</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {notesModal === 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-foreground/85 mb-1">Approved Amount (₹)</label>
                  <div className="flex items-center gap-2">
                    <Input className="flex-1" type="number" min={0} value={approveAmount} onChange={(e) => setApproveAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                       />
                    <span className="text-xs text-muted-foreground/70 whitespace-nowrap">/ ₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground/85 mb-1">Notes (optional)</label>
                <Textarea className="w-full" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  
                  placeholder={notesModal === 'approve' ? 'Reason for partial amount...' : 'Reason for rejection...'} />
              </div>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-muted/80">
              <Button variant="outline" size="sm" onClick={() => { setNotesModal(null); setNotes(''); }}
                >
                Cancel
              </Button>
              <button onClick={() => updateStatus(notesModal === 'approve' ? 'approved' : 'rejected', notes, notesModal === 'approve' ? approveAmount : undefined)}
                className={`px-4 py-2 rounded-md text-xs font-semibold text-white transition-colors ${notesModal === 'approve' ? 'bg-primary hover:bg-primary' : 'bg-destructive hover:bg-destructive'}`}>
                {notesModal === 'approve' ? 'Approve' : 'Reject'}
              </button>
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

      {deleteTarget && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setDeleteTarget(false))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-6 border-b border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-6 right-6" onClick={() => setDeleteTarget(false)}
                >
                <X size={18} />
              </Button>
              <h3 className="text-lg font-semibold text-foreground">Delete expense?</h3>
              <p className="text-sm text-foreground/70 mt-2">
                <span className="font-semibold text-foreground">{expense.employeeName}</span> — {formatINR(total)}
              </p>
              <p className="text-xs text-destructive font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-muted/80">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(false)}
                >
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15" onClick={handleDelete}
                >
                <Trash2 size={16} /> Delete
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}
    </div>
  );
}
