import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createShiftType,
  getHrmsSettings,
  getShiftType,
  updateShiftType,
} from '../../lib/hrmsShifts';

const inputClass =
  'w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all';

function formatTimeDiff(start: string, end: string): string {
  if (!start || !end) return '—';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function ToggleSwitch({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? 'bg-zinc-900' : 'bg-zinc-200'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

interface FormState {
  name: string;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
  is_active: boolean;
  late_grace_enabled: boolean;
  late_grace_minutes: number;
  late_penalty_amount: number;
  half_day_after_minutes: number;
  overtime_enabled: boolean;
  overtime_after_minutes: number;
  overtime_rate: number;
}

const defaultForm: FormState = {
  name: '',
  start_time: '10:00',
  end_time: '20:00',
  break_start: '13:00',
  break_end: '13:30',
  is_active: true,
  late_grace_enabled: true,
  late_grace_minutes: 15,
  late_penalty_amount: 100,
  half_day_after_minutes: 30,
  overtime_enabled: true,
  overtime_after_minutes: 15,
  overtime_rate: 50,
};

export default function ShiftTypeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [globalOtEnabled, setGlobalOtEnabled] = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const settings = await getHrmsSettings(token);
        if (cancelled) return;
        setGlobalOtEnabled(settings.overtimeCalculation);
        if (!isEdit) {
          setForm((p) => ({
            ...p,
            late_grace_minutes: settings.lateEntryGraceMinutes || 15,
            overtime_enabled: settings.overtimeCalculation,
          }));
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isEdit]);

  useEffect(() => {
    if (!token || !isEdit || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const s = await getShiftType(token, Number(id));
        if (cancelled) return;
        const otRate = s.overtime_rate ?? s.overtime_rate_per_hour ?? 50;
        setForm({
          name: s.name,
          start_time: s.start_time,
          end_time: s.end_time,
          break_start: s.break_start || '',
          break_end: s.break_end || '',
          is_active: s.is_active,
          late_grace_enabled: s.late_grace_enabled ?? true,
          late_grace_minutes: s.late_grace_minutes ?? 15,
          late_penalty_amount: s.late_penalty_amount ?? 100,
          half_day_after_minutes: s.half_day_after_minutes ?? 30,
          overtime_enabled: s.overtime_enabled ?? false,
          overtime_after_minutes: s.overtime_after_minutes ?? 15,
          overtime_rate: otRate,
        });
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isEdit, id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canManage) return;
    if (!form.name.trim()) {
      showToast('Shift name is required');
      return;
    }
    setSaving(true);
    try {
      const otRate = Math.max(0, Number(form.overtime_rate) || 0);
      const body = {
        name: form.name.trim(),
        start_time: form.start_time,
        end_time: form.end_time,
        break_start: form.break_start || null,
        break_end: form.break_end || null,
        is_active: form.is_active,
        late_grace_enabled: form.late_grace_enabled,
        late_grace_minutes: Math.max(0, form.late_grace_minutes || 0),
        late_penalty_amount: Math.max(0, Number(form.late_penalty_amount) || 0),
        half_day_after_minutes: Math.max(0, form.half_day_after_minutes || 0),
        overtime_enabled: form.overtime_enabled,
        overtime_after_minutes: Math.max(0, form.overtime_after_minutes || 0),
        overtime_rate: otRate,
        overtime_rate_per_hour: otRate,
      };
      if (isEdit && id) {
        await updateShiftType(token, Number(id), body);
        showToast('Shift type updated');
      } else {
        await createShiftType(token, body);
        showToast('Shift type created');
      }
      window.setTimeout(() => navigate('/hrms/shifts'), 400);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save shift type');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-400 gap-2 text-sm">
        <Loader2 size={18} className="animate-spin" /> Loading shift…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/hrms/shifts')}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft size={16} /> Back to Shifts
        </button>
        <p className="text-sm text-zinc-500">Shift type not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-zinc-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-medium">
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate('/hrms/shifts')}
          className="mt-1 p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            {isEdit ? 'Edit Shift Type' : 'New Shift Type'}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isEdit
              ? 'Update timings, grace, late penalty, and overtime for this shift'
              : 'Define shift timings, grace, late penalty, and overtime rate'}
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Basic Information</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                Shift Name *
              </label>
              <input
                type="text"
                required
                disabled={!canManage}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Office, Morning, Evening"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  disabled={!canManage}
                  value={form.start_time}
                  onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  disabled={!canManage}
                  value={form.end_time}
                  onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                  Break Start
                </label>
                <input
                  type="time"
                  disabled={!canManage}
                  value={form.break_start}
                  onChange={(e) => setForm((p) => ({ ...p, break_start: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                  Break End
                </label>
                <input
                  type="time"
                  disabled={!canManage}
                  value={form.break_end}
                  onChange={(e) => setForm((p) => ({ ...p, break_end: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-zinc-700 font-medium">Total Working Hours</span>
              <span className="text-sm font-bold text-zinc-900">
                {formatTimeDiff(form.start_time, form.end_time)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-zinc-900">Active</p>
                <p className="text-xs text-zinc-400">Inactive shifts cannot be newly assigned</p>
              </div>
              <ToggleSwitch
                enabled={form.is_active}
                disabled={!canManage}
                onToggle={() => canManage && setForm((p) => ({ ...p, is_active: !p.is_active }))}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Late Grace & Penalty</h2>
          </div>
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900">Late Grace Period</p>
                <p className="text-xs text-zinc-400">
                  Allowed minutes after shift start without marking late (e.g. 15 → on time until 10:15)
                </p>
              </div>
              <ToggleSwitch
                enabled={form.late_grace_enabled}
                disabled={!canManage}
                onToggle={() =>
                  canManage && setForm((p) => ({ ...p, late_grace_enabled: !p.late_grace_enabled }))
                }
              />
            </div>
            {form.late_grace_enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                    Late Grace (minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    disabled={!canManage}
                    value={form.late_grace_minutes}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        late_grace_minutes: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                    Late Penalty (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    disabled={!canManage}
                    value={form.late_penalty_amount}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        late_penalty_amount: Math.max(0, parseFloat(e.target.value) || 0),
                      }))
                    }
                    className={inputClass}
                    placeholder="100"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                Half Day After (minutes from start)
              </label>
              <input
                type="number"
                min={0}
                max={480}
                disabled={!canManage}
                value={form.half_day_after_minutes}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    half_day_after_minutes: Math.max(0, parseInt(e.target.value, 10) || 0),
                  }))
                }
                className={inputClass}
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Check-in after this many minutes is half day. No money deduction yet.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Overtime</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-900">Enable Overtime</p>
                <p className="text-xs text-zinc-400">
                  Flat overtime amount when checkout is past end + grace
                </p>
              </div>
              <ToggleSwitch
                enabled={form.overtime_enabled}
                disabled={!canManage || !globalOtEnabled}
                onToggle={() =>
                  canManage &&
                  globalOtEnabled &&
                  setForm((p) => ({ ...p, overtime_enabled: !p.overtime_enabled }))
                }
              />
            </div>
            {form.overtime_enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                    Overtime After (minutes past end)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    disabled={!canManage}
                    value={form.overtime_after_minutes}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        overtime_after_minutes: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                    Overtime Rate (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    disabled={!canManage}
                    value={form.overtime_rate}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        overtime_rate: Math.max(0, parseFloat(e.target.value) || 0),
                      }))
                    }
                    className={inputClass}
                    placeholder="50"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">Flat amount per day when OT applies (not per hour).</p>
                </div>
              </div>
            )}
            {!globalOtEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700">
                  Overtime is disabled globally. Enable it under Shifts → Settings first.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {canManage && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/hrms/shifts')}
              className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? 'Save Changes' : 'Create Shift'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
