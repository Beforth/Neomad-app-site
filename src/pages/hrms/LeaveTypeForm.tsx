import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Save } from 'lucide-react';

interface FormState {
  name: string;
  daysPerYear: number;
  carryForward: boolean;
  maxCarryForwardLeaves: number;
  carryForwardExpiryDays: number;
  allowLeaveAfterDays: number;
  maxConsecutiveLeaves: number;
  isLeaveWithoutPay: boolean;
  isPartiallyPaidLeave: boolean;
  isOptionalLeave: boolean;
  allowNegativeBalance: boolean;
  allowOverAllocating: boolean;
  includeHolidaysAsLeaves: boolean;
  isCompensatory: boolean;
  description: string;
  status: 'active' | 'inactive';
}

interface StoredItem extends FormState {
  id: number;
}

const initialData: StoredItem[] = [
  { id: 1, name: 'Sick Leave', daysPerYear: 12, carryForward: true, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'For medical reasons and health issues', status: 'active' },
  { id: 2, name: 'Casual Leave', daysPerYear: 12, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'For personal work and short-term needs', status: 'active' },
  { id: 3, name: 'Earned Leave', daysPerYear: 20, carryForward: true, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'Accumulated leave for vacation and long breaks', status: 'active' },
  { id: 4, name: 'Maternity Leave', daysPerYear: 180, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'For expecting and new mothers', status: 'active' },
  { id: 5, name: 'Paternity Leave', daysPerYear: 5, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'For new fathers', status: 'active' },
  { id: 6, name: 'Bereavement Leave', daysPerYear: 5, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'For loss of immediate family member', status: 'active' },
  { id: 7, name: 'Unpaid Leave', daysPerYear: 0, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: true, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'Leave without pay', status: 'active' },
  { id: 8, name: 'Comp Off', daysPerYear: 10, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: true, description: 'Compensatory off for weekend or holiday work', status: 'inactive' },
];

function loadTypes(): StoredItem[] {
  try {
    const stored = localStorage.getItem('leaveTypes');
    if (stored) {
      const parsed = JSON.parse(stored) as StoredItem[];
      return parsed.map((item) => ({
        ...item,
        carryForward: item.carryForward ?? false,
        maxCarryForwardLeaves: item.maxCarryForwardLeaves ?? 0,
        carryForwardExpiryDays: item.carryForwardExpiryDays ?? 0,
        allowLeaveAfterDays: item.allowLeaveAfterDays ?? 0,
        maxConsecutiveLeaves: item.maxConsecutiveLeaves ?? 0,
        isLeaveWithoutPay: item.isLeaveWithoutPay ?? false,
        isPartiallyPaidLeave: item.isPartiallyPaidLeave ?? false,
        isOptionalLeave: item.isOptionalLeave ?? false,
        allowNegativeBalance: item.allowNegativeBalance ?? false,
        allowOverAllocating: item.allowOverAllocating ?? false,
        includeHolidaysAsLeaves: item.includeHolidaysAsLeaves ?? false,
        isCompensatory: item.isCompensatory ?? false,
      }));
    }
  } catch {}
  return initialData;
}

const defaultForm: FormState = {
  name: '', daysPerYear: 0, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0,
  isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false,
  allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false,
  description: '', status: 'active',
};

const inputClass = "w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all";

const checkboxes = [
  { key: 'carryForward', label: 'Carry Forward' },
  { key: 'isLeaveWithoutPay', label: 'Leave Without Pay' },
  { key: 'isPartiallyPaidLeave', label: 'Partially Paid Leave' },
  { key: 'isOptionalLeave', label: 'Optional Leave' },
  { key: 'allowNegativeBalance', label: 'Allow Negative Balance' },
  { key: 'allowOverAllocating', label: 'Allow Over Allocating' },
  { key: 'includeHolidaysAsLeaves', label: 'Include Holidays Within Leaves as Leaves' },
  { key: 'isCompensatory', label: 'Is Compensatory' },
] as const;

export default function LeaveTypeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    const types = loadTypes();
    const item = types.find((t) => t.id === Number(id));
    if (!item) { setNotFound(true); return; }
    setForm({
      name: item.name, daysPerYear: item.daysPerYear,
      carryForward: item.carryForward ?? false,
      maxCarryForwardLeaves: item.maxCarryForwardLeaves ?? 0,
      carryForwardExpiryDays: item.carryForwardExpiryDays ?? 0,
      allowLeaveAfterDays: item.allowLeaveAfterDays ?? 0,
      maxConsecutiveLeaves: item.maxConsecutiveLeaves ?? 0,
      isLeaveWithoutPay: item.isLeaveWithoutPay ?? false,
      isPartiallyPaidLeave: item.isPartiallyPaidLeave ?? false,
      isOptionalLeave: item.isOptionalLeave ?? false,
      allowNegativeBalance: item.allowNegativeBalance ?? false,
      allowOverAllocating: item.allowOverAllocating ?? false,
      includeHolidaysAsLeaves: item.includeHolidaysAsLeaves ?? false,
      isCompensatory: item.isCompensatory ?? false,
      description: item.description, status: item.status,
    });
  }, [id, isEdit]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.daysPerYear < 0) return;
    setSaving(true);

    const types = loadTypes();
    if (isEdit) {
      const idx = types.findIndex((t) => t.id === Number(id));
      if (idx >= 0) types[idx] = { id: types[idx].id, ...form, name: form.name.trim() };
    } else {
      const newId = Math.max(...types.map((t) => t.id), 0) + 1;
      types.push({ id: newId, ...form, name: form.name.trim(), description: '' });
    }
    localStorage.setItem('leaveTypes', JSON.stringify(types));
    setSaving(false);
    navigate('/hrms/leave/type');
  };

  if (notFound) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Leave type not found</h3>
          <p className="text-xs text-zinc-400 mb-4">The leave type you're trying to edit doesn't exist.</p>
          <button onClick={() => navigate('/hrms/leave/type')}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
            Back to Leave Types
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => navigate('/hrms/leave/type')}
          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{isEdit ? 'Edit Leave Type' : 'New Leave Type'}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{isEdit ? 'Update the leave category details' : 'Create a new leave category'}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm">
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Leave Type Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Sick Leave" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Days Per Year *</label>
                  <input type="number" required min={0} value={form.daysPerYear} onChange={(e) => setForm((p) => ({ ...p, daysPerYear: Math.max(0, parseInt(e.target.value) || 0) }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Allow Leave Application After (Working Days)</label>
                  <input type="number" min={0} value={form.allowLeaveAfterDays}
                    onChange={(e) => setForm((p) => ({ ...p, allowLeaveAfterDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Maximum Consecutive Leaves Allowed</label>
                  <input type="number" min={0} value={form.maxConsecutiveLeaves}
                    onChange={(e) => setForm((p) => ({ ...p, maxConsecutiveLeaves: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Status</label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${form.status === 'active' ? 'bg-zinc-900' : 'border-2 border-zinc-400 hover:border-zinc-600'}`}>
                      <input type="checkbox" checked={form.status === 'active'}
                        onChange={() => setForm((p) => ({ ...p, status: p.status === 'active' ? 'inactive' : 'active' }))}
                        className="sr-only" />
                      {form.status === 'active' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                          className="w-3 h-3 pointer-events-none">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-zinc-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="border-t lg:border-t-0 lg:border-l border-zinc-200 pt-4 lg:pt-0 lg:pl-6">
                <h3 className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">Leave Settings</h3>
                <div className="space-y-4">
                  {checkboxes.map((cb) => (
                    <label key={cb.key} className="flex items-center gap-3 cursor-pointer">
                      <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${(form as any)[cb.key] ? 'bg-zinc-900' : 'border-2 border-zinc-400 hover:border-zinc-600'}`}>
                        <input type="checkbox" checked={(form as any)[cb.key]}
                          onChange={() => setForm({ ...form, [cb.key]: !(form as any)[cb.key] })}
                          className="sr-only" />
                        {(form as any)[cb.key] && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                            className="w-3 h-3 pointer-events-none">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm text-zinc-700">{cb.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {form.carryForward && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border-t border-zinc-200 p-5"
              >
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-4">Carry Forward</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Maximum Carry Forward Leaves</label>
                    <input type="number" min={0} value={form.maxCarryForwardLeaves}
                      onChange={(e) => setForm((p) => ({ ...p, maxCarryForwardLeaves: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Expiry Carry Forwarded Leaves (Days)</label>
                    <input type="number" min={0} value={form.carryForwardExpiryDays}
                      onChange={(e) => setForm((p) => ({ ...p, carryForwardExpiryDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className={inputClass} />
                  </div>
                </div>
              </motion.div>
            )}

            <div className="border-t border-zinc-200 p-5 flex gap-3">
              <button type="button" onClick={() => navigate('/hrms/leave/type')}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving || !form.name.trim() || form.daysPerYear < 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Leave Type'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
