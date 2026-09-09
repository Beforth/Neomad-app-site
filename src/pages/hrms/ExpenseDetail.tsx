import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, IndianRupee, Pen, CheckCircle2, XCircle, X, Trash2, RotateCcw,
  Banknote, CreditCard, Smartphone, Landmark, FileText, Clock, Receipt,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/SearchableSelect';
import {
  Expense, ExpenseStatus, CATEGORY_LABELS, PAYMENT_METHOD_LABELS,
  expenseAmount, expenseTax, expenseTotal, formatINR,
  getExpense, resolveExpense, deleteExpense, resubmitExpense, updateExpense,
} from '../../lib/hrmsExpenses';

const STATUS_BADGE: Record<ExpenseStatus, { base: string; label: string }> = {
  draft: { base: 'bg-zinc-100 text-zinc-500', label: 'Draft' },
  pending: { base: 'bg-amber-50 text-amber-600', label: 'Pending' },
  approved: { base: 'bg-emerald-50 text-emerald-600', label: 'Approved' },
  rejected: { base: 'bg-rose-50 text-rose-600', label: 'Rejected' },
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

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
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
        <p className="text-sm text-zinc-400 animate-pulse py-16 text-center">Loading expense...</p>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Expense not found</h3>
          <p className="text-xs text-zinc-400 mb-4">This expense doesn't exist or has been deleted.</p>
          <button onClick={() => navigate('/hrms/expenses')} className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
            Back to Expenses
          </button>
        </div>
      </div>
    );
  }

  if (isEmployee && !isOwn) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Expense not found</h3>
          <p className="text-xs text-zinc-400 mb-4">You can only view your own expenses.</p>
          <button onClick={() => navigate('/hrms/expenses')} className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
            Back to My Expenses
          </button>
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
          className="fixed top-5 right-5 z-[9999] bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </motion.div>
      )}

      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={() => navigate('/hrms/expenses')} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{expense.employeeName}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[expense.status].base}`}>
              {STATUS_BADGE[expense.status].label}
            </span>
            {(expense.date > new Date().toISOString().split('T')[0] || expense.description?.toLowerCase().includes('advance')) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                ⚡ Advance Expense Request
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            {CATEGORY_LABELS[expense.category]} expense on {expense.date}
          </p>
        </div>
        {!isEmployee && expense.status === 'pending' && (
          <div className="flex items-center gap-1">
            <button onClick={() => { setNotesModal('approve'); setNotes(''); setApproveAmount(total); }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors">
              <CheckCircle2 size={14} /> Approve
            </button>
            <button onClick={() => { setNotesModal('reject'); setNotes(''); }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors">
              <XCircle size={14} /> Reject
            </button>
          </div>
        )}
        {isEmployee && expense.status === 'rejected' && (
          <button onClick={() => { setResubmitTarget(expense); setResubmitReceipt(''); }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors">
            <RotateCcw size={14} /> Resubmit
          </button>
        )}
        {!isEmployee && (
          <button onClick={() => setDeleteTarget(true)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
            <Trash2 size={18} />
          </button>
        )}
      </motion.header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Requested', value: formatINR(requested), icon: IndianRupee, color: 'bg-blue-50 text-blue-600' },
          { label: 'Tax', value: formatINR(tax), icon: IndianRupee, color: 'bg-amber-50 text-amber-600' },
          { label: 'Total', value: formatINR(total), icon: IndianRupee, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Payments', value: String(expense.payments.length), icon: CreditCard, color: 'bg-purple-50 text-purple-600' },
          ...(expense.status === 'approved' && expense.approvedAmount !== undefined ? [
            { label: 'Approved', value: formatINR(expense.approvedAmount), icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Remaining', value: formatINR(Math.max(0, total - expense.approvedAmount)), icon: XCircle, color: expense.approvedAmount >= total ? 'bg-zinc-50 text-zinc-400' : 'bg-rose-50 text-rose-600' },
          ] : []),
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
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

      {expense.status === 'draft' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 flex flex-wrap gap-3">
            <button onClick={() => navigate(`/hrms/expenses/edit/${expense.id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors">
              <Pen size={14} />Edit
            </button>
            {isEmployee && (
              <button onClick={() => setStatusDirect('pending')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors">
                <CheckCircle2 size={14} />Submit for Approval
              </button>
            )}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Expense Info</h2>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Date</p>
            <p className="text-sm font-medium text-zinc-900">{expense.date}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Status</p>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[expense.status].base}`}>
                {STATUS_BADGE[expense.status].label}
              </span>
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
              <p className="text-[11px] text-zinc-400 mt-1">Use Approve / Reject above to review this claim.</p>
            )}
          </div>
          <div className="sm:col-span-1">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Description</p>
            <p className="text-sm font-medium text-zinc-900">{expense.description || '—'}</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Payments</h2>
        </div>
        {expense.payments.length === 0 ? (
          <div className="p-4">
            <p className="text-xs text-zinc-400">No payment details attached.</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {expense.payments.map((pay, i) => {
              const Icon = PAYMENT_ICON[pay.paymentMethod];
              return (
                <div key={pay.id ?? i} className="rounded-xl border border-zinc-200 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {Icon && <Icon size={15} className="text-zinc-400 shrink-0" />}
                      <p className="text-xs font-bold text-zinc-900 truncate">{pay.title || 'Payment'}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-50 text-zinc-600 shrink-0">
                      {PAYMENT_METHOD_LABELS[pay.paymentMethod] || pay.paymentMethod || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pay.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-900 text-white text-[10px] font-bold">
                        {CATEGORY_LABELS[pay.category] || pay.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                    <span className="font-extrabold text-zinc-900">{formatINR(Number(pay.amount) || 0)}</span>
                    {Number(pay.taxAmount) > 0 && <span className="text-amber-600">+ tax {formatINR(Number(pay.taxAmount) || 0)}</span>}
                    {pay.time && (
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Clock size={11} /> {pay.time}
                      </span>
                    )}
                  </div>
                  {pay.receipt ? (
                    <div className="relative inline-block">
                      <img src={pay.receipt} alt="Receipt" className="h-20 rounded-lg border border-zinc-200" />
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-300 flex items-center gap-1">
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
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Approval Notes</h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-zinc-700">{expense.approvalNotes}</p>
          </div>
        </motion.div>
      )}

      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => { setNotesModal(null); setNotes(''); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-zinc-900">{notesModal === 'approve' ? 'Approve Expense' : 'Reject Expense'}</h3>
              <button onClick={() => { setNotesModal(null); setNotes(''); }} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-3 space-y-2 border-b border-zinc-100 bg-zinc-50/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee</span>
                <span className="text-sm font-bold text-zinc-900">{expense.employeeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Requested</span>
                <span className="text-sm font-bold text-zinc-900">{formatINR(total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</span>
                <span className="text-sm text-zinc-700 text-right max-w-[200px] truncate" title={expense.description}>{expense.description}</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {notesModal === 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Approved Amount (₹)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} value={approveAmount} onChange={(e) => setApproveAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all" />
                    <span className="text-xs text-zinc-400 whitespace-nowrap">/ ₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all"
                  placeholder={notesModal === 'approve' ? 'Reason for partial amount...' : 'Reason for rejection...'} />
              </div>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-zinc-50/80">
              <button onClick={() => { setNotesModal(null); setNotes(''); }}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => updateStatus(notesModal === 'approve' ? 'approved' : 'rejected', notes, notesModal === 'approve' ? approveAmount : undefined)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors ${notesModal === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {notesModal === 'approve' ? 'Approve' : 'Reject'}
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setDeleteTarget(false)} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-zinc-100 relative">
              <button onClick={() => setDeleteTarget(false)}
                className="absolute top-6 right-6 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-zinc-900">Delete expense?</h3>
              <p className="text-sm text-zinc-600 mt-2">
                <span className="font-semibold text-zinc-800">{expense.employeeName}</span> — {formatINR(total)}
              </p>
              <p className="text-xs text-red-600 font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-zinc-50/80">
              <button onClick={() => setDeleteTarget(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
