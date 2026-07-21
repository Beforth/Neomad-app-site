import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/SearchableSelect';

const LEAVE_TYPE_OPTIONS = [
  { value: 'Sick Leave', label: 'Sick Leave' },
  { value: 'Casual Leave', label: 'Casual Leave' },
  { value: 'Earned Leave', label: 'Earned Leave' },
  { value: 'Maternity Leave', label: 'Maternity Leave' },
  { value: 'Paternity Leave', label: 'Paternity Leave' },
];

const leaveBalance = [
  { type: 'Sick Leave', used: 2, total: 12, icon: 'sick' },
  { type: 'Casual Leave', used: 4, total: 12, icon: 'casual' },
  { type: 'Earned Leave', used: 5, total: 20, icon: 'earned' },
  { type: 'Maternity Leave', used: 0, total: 180, icon: 'maternity' },
  { type: 'Paternity Leave', used: 0, total: 5, icon: 'paternity' },
];

const BALANCE_ICONS: Record<string, { bg: string; color: string }> = {
  sick: { bg: 'bg-[#e9f7ef]', color: 'text-[#22a55a]' },
  casual: { bg: 'bg-[#e8f2fd]', color: 'text-[#3d8bf0]' },
  earned: { bg: 'bg-[#efeafc]', color: 'text-[#7c5cf0]' },
  maternity: { bg: 'bg-[#fdeaf1]', color: 'text-[#ef4f8b]' },
  paternity: { bg: 'bg-[#fdf3e3]', color: 'text-[#f0a730]' },
};

function BalSvg({ icon }: { icon: string }) {
  const cls = "w-[19px] h-[19px]";
  if (icon === 'sick')
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>;
  if (icon === 'casual')
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12a10 10 0 0 0-20 0z" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M8 17a4 4 0 0 0 8 0" /></svg>;
  if (icon === 'earned')
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
  if (icon === 'maternity')
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M12 12v9" /><path d="M9 18h6" /></svg>;
  return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>;
}

export default function LeaveApplyForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const newRequest = {
      id: Date.now(),
      employee: user?.username || 'You',
      department: '--',
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      days,
      reason: form.reason,
      status: 'pending' as const,
      appliedOn: new Date().toISOString().split('T')[0],
    };

    const stored = localStorage.getItem('leaveRequests');
    const existing = stored ? JSON.parse(stored) : [];
    existing.push(newRequest);
    localStorage.setItem('leaveRequests', JSON.stringify(existing));

    setTimeout(() => navigate('/hrms/leave/requests'), 1200);
  };

  const handleDateFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.type = 'date';
    e.target.showPicker?.();
  };

  const handleDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!e.target.value) e.target.type = 'text';
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-[#1f2430] tracking-tight">Apply for Leave</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Fill in the details to request time off</p>
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
                className="w-16 h-16 bg-[#eaf7ef] rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 size={32} className="text-[#1f8a4c]" />
              </motion.div>
              <h2 className="text-lg font-bold text-[#1f2430]">Leave Applied Successfully</h2>
              <p className="text-sm text-[#6b7280] mt-1">Redirecting...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-6">
              {/* Left: Apply for Leave */}
              <div className="bg-white border border-[#e7e9ec] rounded-[16px] p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-zinc-100 text-[#1f2430] flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M9 16l2 2 4-4" /></svg>
                    </div>
                    <div>
                      <p className="text-[16px] font-bold text-[#1f2430] m-0 leading-tight">Apply for Leave</p>
                      <p className="text-[13px] text-[#6b7280] mt-0.5">Fill in the details to request time off</p>
                    </div>
                  </div>
                </div>

                <p className="text-[12.5px] font-bold text-[#1f2430] tracking-[0.2px] m-0 pb-3 border-b border-[#e7e9ec] mb-[14px]">
                  Leave Details
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-[#1f2430] mb-1.5">
                      Leave Type <span className="text-[#e15b5b]">*</span>
                    </label>
                    <SearchableSelect
                      value={form.leaveType}
                      onChange={(v) => handleChange('leaveType', v)}
                      options={LEAVE_TYPE_OPTIONS}
                      placeholder="Select leave type"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="mb-4">
                      <label className="block text-[13px] font-semibold text-[#1f2430] mb-1.5">
                        Start Date <span className="text-[#e15b5b]">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="dd-mm-yyyy"
                          value={form.startDate}
                          onChange={(e) => handleChange('startDate', e.target.value)}
                          onFocus={handleDateFocus}
                          onBlur={handleDateBlur}
                          required
                          className="w-full border border-[#e7e9ec] rounded-[10px] px-[14px] py-[11px] text-[14px] text-[#1f2430] bg-white outline-none focus:border-[#1f2430] transition-colors pr-[38px] [color-scheme:light]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none flex">
                          <Calendar size={16} />
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-[13px] font-semibold text-[#1f2430] mb-1.5">
                        End Date <span className="text-[#e15b5b]">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="dd-mm-yyyy"
                          value={form.endDate}
                          onChange={(e) => handleChange('endDate', e.target.value)}
                          onFocus={handleDateFocus}
                          onBlur={handleDateBlur}
                          required
                          className="w-full border border-[#e7e9ec] rounded-[10px] px-[14px] py-[11px] text-[14px] text-[#1f2430] bg-white outline-none focus:border-[#1f2430] transition-colors pr-[38px] [color-scheme:light]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none flex">
                          <Calendar size={16} />
                        </span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-none border-t border-[#e7e9ec] my-5" />

                  <p className="text-[12.5px] font-bold text-[#1f2430] tracking-[0.2px] m-0 pb-0 mb-[14px]">
                    Reason &amp; Notes
                  </p>

                  <div className="mb-1.5">
                    <label className="block text-[13px] font-semibold text-[#1f2430] mb-1.5">
                      Reason <span className="text-[#e15b5b]">*</span>
                    </label>
                    <textarea
                      value={form.reason}
                      onChange={(e) => handleChange('reason', e.target.value)}
                      maxLength={500}
                      required
                      rows={4}
                      placeholder="Briefly describe the reason for leave..."
                      className="w-full border border-[#e7e9ec] rounded-[10px] px-[14px] py-[11px] text-[14px] text-[#1f2430] bg-white outline-none focus:border-[#1f2430] transition-colors resize-vertical min-h-[110px] font-inherit placeholder:text-[#9aa0a8]"
                    />
                    <div className="text-right text-[12px] text-[#6b7280] mt-1.5">
                      <span>{form.reason.length}</span>/500
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 mt-[22px]">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!form.leaveType || !form.startDate || !form.endDate || !form.reason.trim()}
                      className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      Submit Application
                    </button>
                  </div>
                </form>
              </div>

              {/* Right: Leave Balance */}
              <div className="bg-white border border-[#e7e9ec] rounded-[16px] p-6 shadow-sm h-fit">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#eaf7ef] text-[#1f8a4c] flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
                    </div>
                    <p className="text-[16px] font-bold text-[#1f2430] self-center m-0">Leave Balance</p>
                  </div>
                  <span className="text-[12px] text-[#6b7280] bg-[#f4f5f7] border border-[#e7e9ec] rounded-full px-3 py-1.5 whitespace-nowrap shrink-0">As of today</span>
                </div>

                <div>
                  {leaveBalance.map((item) => {
                    const remaining = item.total - item.used;
                    const pct = item.total > 0 ? (item.used / item.total) * 100 : 0;
                    const icon = BALANCE_ICONS[item.icon];

                    return (
                      <div key={item.type} className="flex items-center gap-[14px] py-4 border-b border-[#e7e9ec] last-of-type:border-b-0">
                        <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${icon.bg} ${icon.color}`}>
                          <BalSvg icon={item.icon} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="text-[14px] font-bold text-[#1f2430]">{item.type}</span>
                          </div>
                          <p className="text-[12.5px] text-[#6b7280] mt-0.5">{item.used} used of {item.total}</p>
                          <div className="h-1.5 bg-[#e6e8eb] rounded-full mt-[9px] overflow-hidden">
                            <div className="h-full bg-[#1f8a4c] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className="text-[20px] font-extrabold text-[#1f8a4c] leading-none">{remaining}</div>
                          <div className="text-[11.5px] text-[#6b7280] mt-0.5">left</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2.5 bg-[#eaf7ef] rounded-[10px] px-[14px] py-3 mt-[18px] text-[13px] text-[#166a3a]">
                  <Shield size={16} className="text-[#1f8a4c] shrink-0" />
                  Leave balances are updated in real time.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
