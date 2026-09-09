import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Banknote, Smartphone, Landmark, FileText, CreditCard, Plus, X } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import {
  Category, Payment, PaymentMethod,
  CATEGORY_OPTIONS, PAYMENT_METHOD_OPTIONS,
  newPayment, todayStr, paymentsToApi,
  getExpense, createExpense, updateExpense,
} from '../../lib/hrmsExpenses';

interface FormState {
  employeeName: string;
  date: string;
  description: string;
  status: 'draft' | 'pending';
  payments: Payment[];
}

const PAYMENT_ICON: Record<string, { icon: any; color: string }> = {
  cash: { icon: Banknote, color: 'text-emerald-600' },
  card: { icon: CreditCard, color: 'text-blue-600' },
  upi: { icon: Smartphone, color: 'text-purple-600' },
  net_banking: { icon: Landmark, color: 'text-indigo-600' },
  cheque: { icon: FileText, color: 'text-amber-600' },
};

const defaultForm: FormState = {
  employeeName: '',
  date: todayStr(),
  description: '',
  status: 'draft',
  payments: [newPayment()],
};

const inputClass = 'w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all';

export default function ExpenseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, token } = useAuth();
  const isEmployee = user?.role === 'delivery_boy' || user?.role === 'staff';
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormState>(() => {
    const next = { ...defaultForm, payments: [newPayment()] };
    if (isEmployee) next.status = 'pending';
    next.employeeName = user?.username || '';
    return next;
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isEdit || !token || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const existing = await getExpense(token, Number(id));
        if (cancelled) return;
        setForm({
          employeeName: existing.employeeName,
          date: existing.date,
          description: existing.description,
          status: existing.status === 'pending' ? 'pending' : 'draft',
          payments: existing.payments.length ? existing.payments : [newPayment()],
        });
      } catch (e) {
        if (!cancelled) {
          setToast(e instanceof Error ? e.message : 'Failed to load expense');
          setTimeout(() => navigate('/hrms/expenses'), 800);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEdit, token, id, navigate]);

  function updatePayment(index: number, patch: Partial<Payment>) {
    setForm((p) => ({
      ...p,
      payments: p.payments.map((pay, i) => (i === index ? { ...pay, ...patch } : pay)),
    }));
  }

  function handlePaymentReceipt(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updatePayment(index, { receipt: reader.result as string });
    reader.readAsDataURL(file);
  }

  function addPayment() {
    setForm((p) => ({ ...p, payments: [...p.payments, newPayment()] }));
  }

  function removePayment(index: number) {
    setForm((p) => ({
      ...p,
      payments: p.payments.length > 1 ? p.payments.filter((_, i) => i !== index) : p.payments,
    }));
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!token) return;
    if (form.payments.some((pay) => !pay.category || !pay.title.trim() || !pay.paymentMethod || pay.amount <= 0)) return;
    setSaving(true);
    try {
      const isFutureDate = form.date > todayStr();
      const updatedPayments = form.payments.map((p) => {
        let title = p.title.trim();
        if (isFutureDate && !title.toLowerCase().includes('advance')) {
          title = `[Advance Expense] ${title}`;
        }
        return { ...p, title };
      });

      let desc = form.description.trim();
      if (isFutureDate && !desc.toLowerCase().includes('advance')) {
        desc = desc ? `[Advance Expense] ${desc}` : '[Advance Expense] Requested for future date';
      }

      const body = {
        date: form.date,
        description: desc,
        status: (isEmployee ? 'pending' : form.status) as 'draft' | 'pending',
        payments: paymentsToApi(updatedPayments),
      };
      if (isEdit) {
        await updateExpense(token, Number(id), body);
        setToast(isFutureDate ? 'Advance expense updated' : 'Expense updated');
      } else {
        await createExpense(token, body);
        setToast(isFutureDate ? 'Advance expense request submitted' : 'Expense added');
      }
      setTimeout(() => navigate('/hrms/expenses'), 400);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to save expense');
      setSaving(false);
    }
  }

  const required =
    form.payments.some((pay) => !pay.category || !pay.title.trim() || !pay.paymentMethod || pay.amount <= 0);

  const totalAmount = form.payments.reduce((s, pay) => s + (Number(pay.amount) || 0) + (Number(pay.taxAmount) || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-zinc-400 animate-pulse">Loading expense...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          {toast}
        </motion.div>
      )}

      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={() => navigate('/hrms/expenses')} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{isEdit ? 'Edit Expense' : 'Add Expense'}</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">{isEdit ? 'Update draft expense' : isEmployee ? 'Submit a new expense claim' : 'Log a new team expense'}</p>
        </div>
      </motion.header>

      <form onSubmit={handleSave} className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Expense Details</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className={inputClass} />
              {form.date > todayStr() && (
                <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 text-xs text-purple-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span><strong>Advance Expense Request:</strong> Since the selected date ({form.date}) is in the future, this claim will be submitted as an <strong>Advance Expense</strong> for Admin approval.</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className={inputClass} placeholder="What was this expense for?" />
            </div>
            {!isEmployee && (
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Status *</label>
                <SearchableSelect
                  value={form.status}
                  onChange={(v) => setForm((p) => ({ ...p, status: v as 'draft' | 'pending' }))}
                  options={[{ value: 'draft', label: 'Draft' }, { value: 'pending', label: 'Pending' }]}
                  placeholder="Select status"
                />
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Amount & Payment</h2>
            <span className="text-xs font-bold text-zinc-900">{'₹' + totalAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-4 space-y-4">
            {form.payments.map((pay, index) => {
              const pi = pay.paymentMethod ? PAYMENT_ICON[pay.paymentMethod] : null;
              const Icon = pi?.icon;
              return (
                <div key={pay.id} className="rounded-xl border border-zinc-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Payment {index + 1}</p>
                    {form.payments.length > 1 && (
                      <button type="button" onClick={() => removePayment(index)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <X size={12} /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Title *</label>
                      <input type="text" value={pay.title} onChange={(e) => updatePayment(index, { title: e.target.value })} className={inputClass} placeholder="e.g. Client dinner" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Payment Method *</label>
                      <SearchableSelect value={pay.paymentMethod} onChange={(v) => updatePayment(index, { paymentMethod: v as PaymentMethod })} options={PAYMENT_METHOD_OPTIONS} placeholder="Select method" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Category *</label>
                      <SearchableSelect value={pay.category} onChange={(v) => updatePayment(index, { category: v as Category })} options={CATEGORY_OPTIONS} placeholder="Select category" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Amount (₹) *</label>
                      <input type="number" min={0} value={pay.amount || ''} onChange={(e) => updatePayment(index, { amount: Math.max(0, parseFloat(e.target.value) || 0) })} className={inputClass} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Tax (₹)</label>
                      <input type="number" min={0} value={pay.taxAmount || ''} onChange={(e) => updatePayment(index, { taxAmount: Math.max(0, parseFloat(e.target.value) || 0) })} className={inputClass} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Time *</label>
                      <input type="time" value={pay.time} onChange={(e) => updatePayment(index, { time: e.target.value })} className={inputClass} />
                    </div>
                    <div className="flex items-end">
                      {Icon && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-xl w-full">
                          <Icon size={16} className={pi?.color} />
                          <span className="text-xs font-bold text-zinc-700 truncate">
                            {PAYMENT_METHOD_OPTIONS.find((o) => o.value === pay.paymentMethod)?.label || '—'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Receipt</label>
                    <input type="file" accept="image/*" onChange={(e) => handlePaymentReceipt(index, e)} className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 file:cursor-pointer" />
                    {pay.receipt && (
                      <div className="mt-2 relative inline-block">
                        <img src={pay.receipt} alt="Receipt preview" className="h-16 rounded-lg border border-zinc-200" />
                        <button type="button" onClick={() => updatePayment(index, { receipt: '' })} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-900 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-zinc-700">✕</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <button type="button" onClick={addPayment}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-zinc-200 hover:border-zinc-900 text-zinc-500 hover:text-zinc-900 rounded-xl text-xs font-bold transition-colors">
              <Plus size={14} /> Add Another Payment
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4">
            <button type="submit" disabled={saving || required}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-xs">
              <Save size={16} />{saving ? 'Saving...' : (isEdit ? 'Update Expense' : 'Save Expense')}
            </button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
