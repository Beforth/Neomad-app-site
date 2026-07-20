import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CheckCircle2, Save } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';

const leaveBalance = [
  { type: 'Sick Leave', used: 2, total: 12 },
  { type: 'Casual Leave', used: 4, total: 12 },
  { type: 'Earned Leave', used: 5, total: 20 },
  { type: 'Maternity Leave', used: 0, total: 180 },
  { type: 'Paternity Leave', used: 0, total: 5 },
];

export default function LeaveApplyForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => navigate('/hrms/leave/apply'), 1200);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Apply for Leave</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Fill in the details to request time off</p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center min-h-[40vh]"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 size={32} className="text-emerald-500" />
              </motion.div>
              <h2 className="text-lg font-bold text-zinc-900">Leave Applied Successfully</h2>
              <p className="text-sm text-zinc-400 mt-1">Redirecting...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-5">
                  <h2 className="text-sm font-bold text-zinc-900 tracking-tight">Leave Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                        Leave Type *
                      </label>
                      <SearchableSelect
                        value={form.leaveType}
                        onChange={(v) => handleChange('leaveType', v)}
                        placeholder="Select leave type"
                        options={[
                          { value: 'Sick Leave', label: 'Sick Leave' },
                          { value: 'Casual Leave', label: 'Casual Leave' },
                          { value: 'Earned Leave', label: 'Earned Leave' },
                          { value: 'Maternity Leave', label: 'Maternity Leave' },
                          { value: 'Paternity Leave', label: 'Paternity Leave' },
                        ]}
                        className="w-full"
                      />
                    </div>
                    <div />
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={form.endDate}
                        onChange={(e) => handleChange('endDate', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                      />
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 pt-5 space-y-4">
                    <h2 className="text-sm font-bold text-zinc-900 tracking-tight">Reason & Notes</h2>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                        Reason *
                      </label>
                      <textarea
                        value={form.reason}
                        onChange={(e) => handleChange('reason', e.target.value)}
                        required
                        rows={3}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all placeholder:text-zinc-300 resize-none"
                        placeholder="Briefly describe the reason for leave..."
                      />
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 pt-4 flex items-center justify-end gap-3">
                    <button
                      type="submit"
                      disabled={!form.leaveType || !form.startDate || !form.endDate || !form.reason.trim()}
                      className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={14} />Submit Application
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>

              <div className="space-y-5 md:sticky md:top-6 md:self-start">
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
                  <h2 className="text-sm font-bold text-zinc-900 tracking-tight">Leave Balance</h2>
                  <div className="space-y-3">
                    {leaveBalance.map((item, i) => {
                      const remaining = item.total - item.used;
                      const pct = item.total > 0 ? (item.used / item.total) * 100 : 0;
                      const barColor = remaining >= 5 ? 'bg-emerald-500' : remaining >= 1 ? 'bg-amber-500' : 'bg-rose-500';
                      const textColor = remaining >= 5 ? 'text-emerald-600' : remaining >= 1 ? 'text-amber-600' : 'text-rose-600';

                      return (
                        <motion.div
                          key={item.type}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-zinc-700">{item.type}</span>
                            <span className={`text-xs font-bold ${textColor}`}>{remaining} left</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-zinc-400">
                            {item.used} used of {item.total}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
