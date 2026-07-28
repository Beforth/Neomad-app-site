import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Receipt } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';

type Status = 'draft' | 'pending';
type Category = 'travel' | 'food' | 'office' | 'other';
type PaymentMethod = 'cash' | 'card' | 'bank_transfer';

interface FormState {
  employeeName: string;
  category: Category | '';
  amount: number;
  taxAmount: number;
  date: string;
  description: string;
  status: Status;
  vendorName: string;
  paymentMethod: PaymentMethod | '';
  receipt: string;
  approvalNotes: string;
}

const CATEGORY_OPTIONS = [
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
];

const defaultForm: FormState = {
  employeeName: '',
  category: '',
  amount: 0,
  taxAmount: 0,
  date: new Date().toISOString().split('T')[0],
  description: '',
  status: 'draft',
  vendorName: '',
  paymentMethod: '',
  receipt: '',
  approvalNotes: '',
};

const inputClass = 'w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all';

export default function ExpenseForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function handleReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((p) => ({ ...p, receipt: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.employeeName.trim() || !form.category || !form.paymentMethod || form.amount <= 0) return;
    setSaving(true);
    setTimeout(() => {
      try {
        const stored = localStorage.getItem('expenses');
        const list = stored ? JSON.parse(stored) : [];
        const nextId = list.length > 0 ? Math.max(...list.map((e: any) => e.id)) + 1 : 1;
        list.push({ ...form, id: nextId, createdAt: new Date().toISOString() });
        localStorage.setItem('expenses', JSON.stringify(list));
        setToast('Expense added');
        setTimeout(() => navigate('/hrms/expenses'), 400);
      } catch {
        setSaving(false);
      }
    }, 300);
  }

  const required = !form.employeeName.trim() || !form.category || !form.paymentMethod || form.amount <= 0;

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-50 bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          {toast}
        </motion.div>
      )}

      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={() => navigate('/hrms/expenses')} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Add Expense</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Log a new team expense</p>
        </div>
      </motion.header>

      <form onSubmit={handleSave} className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Expense Details</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Employee Name *</label>
                <input type="text" value={form.employeeName} onChange={(e) => setForm((p) => ({ ...p, employeeName: e.target.value }))} className={inputClass} placeholder="Enter employee name" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Category *</label>
                <SearchableSelect value={form.category} onChange={(v) => setForm((p) => ({ ...p, category: v as Category }))} options={CATEGORY_OPTIONS} placeholder="Select category" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Date *</label>
                <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Vendor Name</label>
                <input type="text" value={form.vendorName} onChange={(e) => setForm((p) => ({ ...p, vendorName: e.target.value }))} className={inputClass} placeholder="Enter vendor name" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className={inputClass} placeholder="What was this expense for?" />
            </div>
          </div>
        </motion.div>

        {form.category && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Amount & Payment</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Amount (₹) *</label>
                <input type="number" min={0} value={form.amount || ''} onChange={(e) => setForm((p) => ({ ...p, amount: Math.max(0, parseFloat(e.target.value) || 0) }))} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Tax Amount (₹)</label>
                <input type="number" min={0} value={form.taxAmount || ''} onChange={(e) => setForm((p) => ({ ...p, taxAmount: Math.max(0, parseFloat(e.target.value) || 0) }))} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Payment Method *</label>
                <SearchableSelect value={form.paymentMethod} onChange={(v) => setForm((p) => ({ ...p, paymentMethod: v as PaymentMethod }))} options={PAYMENT_OPTIONS} placeholder="Select method" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Receipt</label>
                <input type="file" accept="image/*" onChange={handleReceipt} className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 file:cursor-pointer" />
                {form.receipt && (
                  <div className="mt-2 relative inline-block">
                    <img src={form.receipt} alt="Receipt preview" className="h-16 rounded-lg border border-zinc-200" />
                    <button type="button" onClick={() => setForm((p) => ({ ...p, receipt: '' }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-900 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-zinc-700">✕</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Status *</label>
                <SearchableSelect value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v as Status }))} options={STATUS_OPTIONS} placeholder="Select status" />
              </div>
            </div>
          </div>
        </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4">
            <button type="submit" disabled={saving || required}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-xs">
              <Save size={16} />{saving ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
