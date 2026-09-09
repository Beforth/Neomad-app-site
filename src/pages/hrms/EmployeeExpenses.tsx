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

const STATUS_BADGE: Record<ExpenseStatus, { base: string; label: string }> = {
  draft: { base: 'bg-zinc-100 text-zinc-500', label: 'Draft' },
  pending: { base: 'bg-amber-50 text-amber-600', label: 'Pending' },
  approved: { base: 'bg-emerald-50 text-emerald-600', label: 'Approved' },
  rejected: { base: 'bg-rose-50 text-rose-600', label: 'Rejected' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

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
    { label: 'Total Requests', value: employeeExpenses.length, icon: Receipt, color: 'bg-blue-50 text-blue-600' },
    { label: 'Approved', value: formatINR(totalApproved), icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Rejected', value: formatINR(totalRejected), icon: XCircle, color: 'bg-rose-50 text-rose-600' },
    { label: 'Pending', value: formatINR(totalPending), icon: Clock, color: 'bg-amber-50 text-amber-600' },
  ];

  if (!decodedName) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Employee not specified</h3>
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
          className="fixed top-5 right-5 z-[9999] bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <XCircle size={16} className="text-rose-400" /> {toast}
        </motion.div>
      )}

      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={() => navigate('/hrms/expenses')} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{decodedName}</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Expense history and details</p>
        </div>
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
              <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">{card.value}</p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="w-[150px]">
          <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
        </div>
        {statusFilter !== 'all' && (
          <button onClick={() => setStatusFilter('all')} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
            <XCircle size={12} />Clear
          </button>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
        {loading || visibleExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt size={32} className="text-zinc-300 mb-3" />
            <h3 className="text-sm font-bold text-zinc-900 mb-1">
              {loading ? 'Loading expenses...' : employeeExpenses.length === 0 ? 'No expenses found' : 'No results found'}
            </h3>
            {!loading && (
              <>
                <p className="text-xs text-zinc-400 mb-4">
                  {employeeExpenses.length === 0
                    ? `${decodedName} hasn't submitted any expenses yet.`
                    : 'No expenses match the selected status.'}
                </p>
                {employeeExpenses.length === 0 ? (
                  <button onClick={() => navigate('/hrms/expenses/new')} className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
                    Add Expense
                  </button>
                ) : (
                  <button onClick={() => setStatusFilter('all')} className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
                    Clear Filter
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-400 font-bold">#</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Category</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Requested</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Approved</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Remaining</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Payment</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Receipt</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {visibleExpenses.map((e, i) => {
                  const pm = primaryPayment(e)?.paymentMethod || '';
                  const receipt = primaryPayment(e)?.receipt || '';
                  return (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{e.id}</td>
                      <td className="px-4 py-3 text-xs text-zinc-700 whitespace-nowrap">{e.date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${CATEGORY_BADGE[e.category]?.base || 'bg-zinc-100 text-zinc-600'}`}>
                          {CATEGORY_BADGE[e.category]?.label || e.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-zinc-900">{formatINR(expenseTotal(e))}</td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-600">
                        {e.status === 'approved' && e.approvedAmount !== undefined ? formatINR(e.approvedAmount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-rose-600">
                        {e.status === 'approved' && e.approvedAmount !== undefined ? formatINR(Math.max(0, expenseTotal(e) - e.approvedAmount)) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${PAYMENT_BADGE[pm]?.base || 'bg-zinc-100 text-zinc-600'}`}>
                          {(() => {
                            const Icon = PAYMENT_ICON[pm];
                            return Icon && <Icon size={10} />;
                          })()}
                          {PAYMENT_BADGE[pm]?.label || pm}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[e.status].base}`}>
                          {STATUS_BADGE[e.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {receipt ? (
                          <button onClick={() => setReceiptTarget(receipt)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
                            <Receipt size={12} />
                            <span className="text-[10px] font-bold">View</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {e.status === 'rejected' && (
                          <div className="flex flex-col gap-1">
                            {e.approvalNotes && (
                              <p className="text-[10px] text-red-600 max-w-[200px] leading-tight" title={e.approvalNotes}>
                                {e.approvalNotes}
                              </p>
                            )}
                            <button onClick={() => openResubmitModal(e)}
                              className="self-start flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold hover:bg-amber-100 transition-colors">
                              Resubmit
                            </button>
                          </div>
                        )}
                        {e.status === 'approved' && e.approvalNotes && (
                          <p className="text-[10px] text-emerald-600 max-w-[200px] leading-tight" title={e.approvalNotes}>
                            {e.approvalNotes}
                          </p>
                        )}
                        {e.status === 'pending' && (
                          <span className="text-[10px] text-amber-600">Awaiting review</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

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
                {resubmitTarget.employeeName} — {formatINR(expenseTotal(resubmitTarget))}
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

      {receiptTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setReceiptTarget(null)} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Receipt</h3>
              <button onClick={() => setReceiptTarget(null)} className="p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <img src={receiptTarget} alt="Receipt" className="w-full rounded-lg border border-zinc-200" />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
