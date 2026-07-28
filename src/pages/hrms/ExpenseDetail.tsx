import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, DollarSign, Calendar, User, Tag,
  Building2, CreditCard, FileText, CheckCircle2, XCircle, X, Trash2,
} from 'lucide-react';

type Status = 'draft' | 'pending' | 'approved' | 'rejected';
type Category = 'travel' | 'food' | 'office' | 'other';

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

const STATUS_BADGE: Record<Status, { base: string; label: string }> = {
  draft: { base: 'bg-zinc-100 text-zinc-500', label: 'Draft' },
  pending: { base: 'bg-amber-50 text-amber-600', label: 'Pending' },
  approved: { base: 'bg-emerald-50 text-emerald-600', label: 'Approved' },
  rejected: { base: 'bg-rose-50 text-rose-600', label: 'Rejected' },
};

const CATEGORY_LABEL: Record<Category, string> = {
  travel: 'Travel',
  food: 'Food',
  office: 'Office',
  other: 'Other',
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
};

function formatCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function FieldsGrid({ fields }: { fields: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {fields.map((f) => (
        <div key={f.label}>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">{f.label}</p>
          <p className="text-sm font-medium text-zinc-900">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function ExpenseDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const stored = localStorage.getItem('expenses');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const expense = useMemo(() => expenses.find((e) => e.id === Number(id)), [expenses, id]);
  const [toast, setToast] = useState('');
  const [notesModal, setNotesModal] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(false);

  function updateStatus(newStatus: Status, note: string) {
    const updated = expenses.map((e) =>
      e.id === Number(id) ? { ...e, status: newStatus, approvalNotes: note } : e
    );
    setExpenses(updated);
    localStorage.setItem('expenses', JSON.stringify(updated));
    setNotesModal(null);
    setNotes('');
    setToast(newStatus === 'approved' ? 'Expense approved' : 'Expense rejected');
    setTimeout(() => setToast(''), 2500);
  }

  function handleDelete() {
    const updated = expenses.filter((e) => e.id !== Number(id));
    setExpenses(updated);
    localStorage.setItem('expenses', JSON.stringify(updated));
    setDeleteTarget(false);
    setToast('Expense deleted');
    setTimeout(() => navigate('/hrms/expenses'), 400);
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

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-50 bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
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
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Expense on {expense.date}</p>
        </div>
        <button onClick={() => setDeleteTarget(true)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
          <Trash2 size={18} />
        </button>
      </motion.header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Amount', value: formatCurrency(expense.amount), icon: DollarSign, color: 'bg-blue-50 text-blue-600' },
          { label: 'Tax', value: formatCurrency(expense.taxAmount), icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
          { label: 'Total', value: formatCurrency(expense.amount + expense.taxAmount), icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Payment', value: PAYMENT_LABEL[expense.paymentMethod] || '—', icon: CreditCard, color: 'bg-purple-50 text-purple-600' },
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

      {expense.status === 'pending' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 flex flex-wrap gap-3">
            <button onClick={() => setNotesModal('approve')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors">
              <CheckCircle2 size={14} />Approve
            </button>
            <button onClick={() => setNotesModal('reject')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors">
              <XCircle size={14} />Reject
            </button>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Expense Info</h2>
        </div>
        <div className="p-4">
          <FieldsGrid fields={[
            { label: 'Employee', value: expense.employeeName },
            { label: 'Category', value: CATEGORY_LABEL[expense.category] },
            { label: 'Date', value: expense.date },
            { label: 'Vendor', value: expense.vendorName || '—' },
            { label: 'Payment Method', value: PAYMENT_LABEL[expense.paymentMethod] || '—' },
            { label: 'Created At', value: new Date(expense.createdAt).toLocaleString() },
          ]} />
        </div>
      </motion.div>

      {expense.description && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Description</h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-zinc-700">{expense.description}</p>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Receipt</h2>
        </div>
        <div className="p-4">
          {expense.receipt ? (
            <img src={expense.receipt} alt="Receipt" className="max-h-48 rounded-lg border border-zinc-200" />
          ) : (
            <p className="text-xs text-zinc-400">No receipt attached</p>
          )}
        </div>
      </motion.div>

      {expense.approvalNotes && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
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
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all"
                  placeholder={notesModal === 'approve' ? 'Any approval notes...' : 'Reason for rejection...'} />
              </div>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-zinc-50/80">
              <button onClick={() => { setNotesModal(null); setNotes(''); }}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => updateStatus(notesModal === 'approve' ? 'approved' : 'rejected', notes)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors ${notesModal === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {notesModal === 'approve' ? 'Approve' : 'Reject'}
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
                <span className="font-semibold text-zinc-800">{expense.employeeName}</span> — {formatCurrency(expense.amount)}
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
