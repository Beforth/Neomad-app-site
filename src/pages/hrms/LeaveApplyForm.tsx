import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CheckCircle2, Loader2, AlertCircle, Info, ShieldAlert, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/SearchableSelect';
import LeaveBalanceCard from './LeaveBalanceCard';
import { listLeaveTypes, createLeaveRequest, previewLeaveRequest, getMyPolicy, LeaveTypeOut, LeavePreviewOut, MyPolicyOut } from '../../lib/hrmsLeave';

export default function LeaveApplyForm() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    isInformed: true,
    isEmergency: false,
  });
  const [preview, setPreview] = useState<LeavePreviewOut | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOut[]>([]);
  const [myPolicy, setMyPolicy] = useState<MyPolicyOut | null>(null);
  const [loadError, setLoadError] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [types, policyRes] = await Promise.all([
          listLeaveTypes(token),
          getMyPolicy(token).catch(() => null),
        ]);
        setLeaveTypes(types);
        if (policyRes) setMyPolicy(policyRes);
        setLoadError('');
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load leave types');
      }
    })();
  }, [token]);

  // Live breakdown preview calculation
  useEffect(() => {
    if (!token || !form.leaveTypeId || !form.startDate || !form.endDate) {
      setPreview(null);
      setPreviewError('');
      return;
    }
    if (form.endDate < form.startDate) {
      setPreview(null);
      setPreviewError('End date cannot be before the start date.');
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingPreview(true);
      setPreviewError('');
      try {
        const res = await previewLeaveRequest(token, {
          leave_type_id: Number(form.leaveTypeId),
          start_date: form.startDate,
          end_date: form.endDate,
          is_informed: form.isInformed,
          is_emergency: form.isEmergency,
        });
        setPreview(res);
      } catch (e) {
        setPreview(null);
        setPreviewError(e instanceof Error ? e.message : 'Failed to calculate leave breakdown');
      } finally {
        setLoadingPreview(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [form.leaveTypeId, form.startDate, form.endDate, form.isInformed, form.isEmergency, token]);

  const leaveTypeOptions = leaveTypes.map((t) => ({
    value: String(t.id),
    label: t.name,
  }));

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaveTypeId || !form.startDate || !form.endDate || !token) return;
    if (form.endDate < form.startDate) {
      showToast('End date cannot be before the start date');
      return;
    }
    setSubmitting(true);
    try {
      await createLeaveRequest(token, {
        leave_type_id: Number(form.leaveTypeId),
        start_date: form.startDate,
        end_date: form.endDate,
        reason: form.reason || undefined,
        is_informed: form.isInformed,
        is_emergency: form.isEmergency,
      });
      setSubmitted(true);
      setTimeout(() => navigate('/hrms/leave/requests'), 1200);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to apply leave');
    } finally {
      setSubmitting(false);
    }
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
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-rose-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {toast}
        </div>
      )}

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
              <p className="text-sm text-[#6b7280] mt-1">Redirecting to leave requests...</p>
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

                {myPolicy && myPolicy.has_policy ? (
                  <div className="mb-5 p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-950">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        Assigned Policy: {myPolicy.policy_name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-extrabold text-emerald-800 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200">
                        <span>Max Paid: {myPolicy.max_paid_leaves ? `${myPolicy.max_paid_leaves} Days/mo` : 'Not Limited'}</span>
                        <span>·</span>
                        <span>Max Unpaid: {myPolicy.max_unpaid_leaves ? `${myPolicy.max_unpaid_leaves} Days/mo` : 'Not Limited'}</span>
                      </div>
                    </div>
                    {myPolicy.entitlements && myPolicy.entitlements.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-emerald-200/60">
                        {myPolicy.entitlements.map((e) => (
                          <span key={e.id} className="text-[10px] bg-white border border-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md font-bold shadow-2xs">
                            {e.leave_type_name || `Type ${e.leave_type_id}`}: {e.days} Days/yr {e.carry_forward ? '(Carry Forward)' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-5 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-900">
                    <Info size={16} className="text-amber-600 shrink-0" />
                    No specific Leave Policy assigned to your account yet. Standard leave types apply.
                  </div>
                )}

                {loadError && (
                  <div className="mb-5 p-3 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-900">
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    {loadError}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-[#1f2430] mb-1.5">
                      Leave Type <span className="text-[#e15b5b]">*</span>
                    </label>
                    <SearchableSelect
                      value={form.leaveTypeId}
                      onChange={(v) => handleChange('leaveTypeId', v)}
                      options={leaveTypeOptions}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <label className="flex items-center gap-2.5 p-3 border border-[#e7e9ec] rounded-[10px] cursor-pointer hover:bg-zinc-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.isInformed}
                        onChange={(e) => setForm((prev) => ({ ...prev, isInformed: e.target.checked }))}
                        className="w-4 h-4 accent-zinc-900"
                      />
                      <span className="text-[13px] font-semibold text-[#1f2430]">
                        Informed in Advance
                        <span className="block text-[11px] font-normal text-[#6b7280]">Applied before the leave start date</span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 p-3 border border-[#e7e9ec] rounded-[10px] cursor-pointer hover:bg-zinc-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.isEmergency}
                        onChange={(e) => setForm((prev) => ({ ...prev, isEmergency: e.target.checked }))}
                        className="w-4 h-4 accent-rose-600"
                      />
                      <span className="text-[13px] font-semibold text-[#1f2430]">
                        Emergency Leave
                        <span className="block text-[11px] font-normal text-[#6b7280]">Mark this request as an emergency</span>
                      </span>
                    </label>
                  </div>

                  {/* Live Breakdown Preview Banner */}
                  <AnimatePresence>
                    {(preview || loadingPreview || previewError) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-5 bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                            <Info size={14} className="text-blue-600" />
                            Leave Calculation Summary
                          </span>
                          {loadingPreview && <Loader2 size={14} className="animate-spin text-zinc-500" />}
                        </div>

                        {previewError && (
                          <p className="text-[11px] text-rose-700 font-semibold bg-rose-50/80 p-2 rounded-lg border border-rose-200/60 flex items-center gap-1.5">
                            <AlertCircle size={13} className="shrink-0" />
                            {previewError}
                          </p>
                        )}

                        {preview && (
                          <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              <div className="bg-white p-2 rounded-lg border border-zinc-200 text-center">
                                <span className="block text-[10px] text-zinc-400 font-bold uppercase">Total Days</span>
                                <span className="text-sm font-extrabold text-zinc-900">{preview.total_days}</span>
                              </div>
                              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-center">
                                <span className="block text-[10px] text-emerald-600 font-bold uppercase">Paid Portion</span>
                                <span className="text-sm font-extrabold text-emerald-700">{preview.paid_days} d</span>
                              </div>
                              <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-center">
                                <span className="block text-[10px] text-amber-700 font-bold uppercase">LWP Portion</span>
                                <span className="text-sm font-extrabold text-amber-800">{preview.lwp_days} d</span>
                              </div>
                              <div className="bg-blue-50 p-2 rounded-lg border border-blue-200 text-center">
                                <span className="block text-[10px] text-blue-600 font-bold uppercase">Classification</span>
                                <span className="text-xs font-bold text-blue-900">
                                  {preview.planned_days > 0 ? `${preview.planned_days} Planned` : ''}
                                  {preview.planned_days > 0 && preview.unplanned_days > 0 ? ' / ' : ''}
                                  {preview.unplanned_days > 0 ? `${preview.unplanned_days} Unplanned` : ''}
                                </span>
                              </div>
                            </div>

                            {preview.lwp_days > 0 && (
                              <p className="text-[11px] text-amber-700 font-medium bg-amber-50/80 p-2 rounded-lg border border-amber-200/60">
                                💡 Note: Only 2 paid leaves are allowed per month. The remaining {preview.lwp_days} day(s) will be granted as Leave Without Pay (LWP).
                              </p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                      disabled={submitting || !form.leaveTypeId || !form.startDate || !form.endDate || !form.reason.trim() || (!!form.startDate && !!form.endDate && form.endDate < form.startDate)}
                      className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      )}
                      Submit Application
                    </button>
                  </div>
                </form>
              </div>

              {/* Right: Leave Balance */}
              <LeaveBalanceCard />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
