import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Save } from 'lucide-react';

interface FormState {
  name: string;
  leaveCode: string;
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
  allowEncashment: boolean;
  maxEncashableDays: number;
  nonEncashableLeaves: number;
  encashmentRatePercent: number;
  description: string;
  status: 'active' | 'inactive';
  hasExpiry: boolean;
  expiryDays: number;
  enableEarnedLeave: boolean;
  creditFrequency: '' | 'monthly' | 'quarterly' | 'yearly';
  allocateOnDate: '' | 'first_day' | 'last_day' | 'date_of_joining';
  leaveCategory: 'paid' | 'unpaid';
}

interface StoredItem extends FormState {
  id: number;
}

const initialData: StoredItem[] = [
  { id: 1, name: 'Sick Leave', leaveCode: 'SL', daysPerYear: 12, carryForward: true, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, allowEncashment: false, maxEncashableDays: 0, nonEncashableLeaves: 0, encashmentRatePercent: 100, description: 'For medical reasons and health issues', status: 'active', leaveCategory: 'paid', hasExpiry: false, expiryDays: 0, enableEarnedLeave: false, creditFrequency: '', allocateOnDate: '' },
  { id: 2, name: 'Casual Leave', leaveCode: 'CL', daysPerYear: 12, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, allowEncashment: false, maxEncashableDays: 0, nonEncashableLeaves: 0, encashmentRatePercent: 100, description: 'For personal work and short-term needs', status: 'active', leaveCategory: 'paid', hasExpiry: false, expiryDays: 0, enableEarnedLeave: false, creditFrequency: '', allocateOnDate: '' },
  { id: 3, name: 'Earned Leave', leaveCode: 'EL', daysPerYear: 20, carryForward: true, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, allowEncashment: true, maxEncashableDays: 15, nonEncashableLeaves: 5, encashmentRatePercent: 100, description: 'Accumulated leave for vacation and long breaks', status: 'active', leaveCategory: 'paid', hasExpiry: false, expiryDays: 0, enableEarnedLeave: true, creditFrequency: 'monthly', allocateOnDate: 'date_of_joining' },
  { id: 4, name: 'Maternity Leave', leaveCode: 'ML', daysPerYear: 180, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, allowEncashment: false, maxEncashableDays: 0, nonEncashableLeaves: 0, encashmentRatePercent: 100, description: 'For expecting and new mothers', status: 'active', leaveCategory: 'paid', hasExpiry: false, expiryDays: 0, enableEarnedLeave: false, creditFrequency: '', allocateOnDate: '' },
  { id: 5, name: 'Paternity Leave', leaveCode: 'PL', daysPerYear: 5, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, allowEncashment: false, maxEncashableDays: 0, nonEncashableLeaves: 0, encashmentRatePercent: 100, description: 'For new fathers', status: 'active', leaveCategory: 'paid', hasExpiry: false, expiryDays: 0, enableEarnedLeave: false, creditFrequency: '', allocateOnDate: '' },
  { id: 6, name: 'Bereavement Leave', leaveCode: 'BL', daysPerYear: 5, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, allowEncashment: false, maxEncashableDays: 0, nonEncashableLeaves: 0, encashmentRatePercent: 100, description: 'For loss of immediate family member', status: 'active', leaveCategory: 'paid', hasExpiry: false, expiryDays: 0, enableEarnedLeave: false, creditFrequency: '', allocateOnDate: '' },
  { id: 7, name: 'Unpaid Leave', leaveCode: 'UL', daysPerYear: 0, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: true, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, allowEncashment: false, maxEncashableDays: 0, nonEncashableLeaves: 0, encashmentRatePercent: 100, description: 'Leave without pay', status: 'active', leaveCategory: 'unpaid', hasExpiry: false, expiryDays: 0, enableEarnedLeave: false, creditFrequency: '', allocateOnDate: '' },
  { id: 8, name: 'Comp Off', leaveCode: 'CO', daysPerYear: 10, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: true, allowEncashment: false, maxEncashableDays: 0, nonEncashableLeaves: 0, encashmentRatePercent: 100, description: 'Compensatory off for weekend or holiday work', status: 'inactive', leaveCategory: 'paid', hasExpiry: false, expiryDays: 0, enableEarnedLeave: false, creditFrequency: '', allocateOnDate: '' },
];

function loadTypes(): StoredItem[] {
  try {
    const stored = localStorage.getItem('leaveTypes');
    if (stored) {
      const parsed = JSON.parse(stored) as StoredItem[];
      return parsed.map((item) => ({
        ...item,
        leaveCode: item.leaveCode ?? '',
        leaveCategory: item.leaveCategory ?? 'paid',
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
        allowEncashment: item.allowEncashment ?? false,
        maxEncashableDays: item.maxEncashableDays ?? 0,
        nonEncashableLeaves: item.nonEncashableLeaves ?? 0,
        encashmentRatePercent: item.encashmentRatePercent ?? 100,
        hasExpiry: item.hasExpiry ?? false,
        expiryDays: item.expiryDays ?? 0,
        enableEarnedLeave: item.enableEarnedLeave ?? false,
        creditFrequency: item.creditFrequency ?? '',
        allocateOnDate: item.allocateOnDate ?? '',
      }));
    }
  } catch {}
  return initialData;
}

const defaultForm: FormState = {
  name: '', leaveCode: '', daysPerYear: 0, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0,
  isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false,
  allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false,
  allowEncashment: false, maxEncashableDays: 0, nonEncashableLeaves: 0, encashmentRatePercent: 100,
  description: '', status: 'active',
  hasExpiry: false, expiryDays: 0,
  enableEarnedLeave: false, creditFrequency: '', allocateOnDate: '',
  leaveCategory: 'paid',
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
  const codeEdited = useRef(false);

  function generateLeaveCode(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !name.trim()) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return parts.map((w) => w[0]).join('').toUpperCase().slice(0, 4);
  }

  useEffect(() => {
    if (codeEdited.current || !form.name.trim()) return;
    setForm((p) => ({ ...p, leaveCode: generateLeaveCode(p.name) }));
  }, [form.name]);

  useEffect(() => {
    if (!isEdit) return;
    const types = loadTypes();
    const item = types.find((t) => t.id === Number(id));
    if (!item) { setNotFound(true); return; }
    codeEdited.current = true;
    setForm({
      name: item.name, leaveCode: item.leaveCode ?? '', daysPerYear: item.daysPerYear,
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
      allowEncashment: item.allowEncashment ?? false,
      maxEncashableDays: item.maxEncashableDays ?? 0,
      nonEncashableLeaves: item.nonEncashableLeaves ?? 0,
      encashmentRatePercent: item.encashmentRatePercent ?? 100,
      description: item.description, status: item.status,
      hasExpiry: item.hasExpiry ?? false,
      expiryDays: item.expiryDays ?? 0,
      enableEarnedLeave: item.enableEarnedLeave ?? false,
      creditFrequency: item.creditFrequency ?? '',
      allocateOnDate: item.allocateOnDate ?? '',
      leaveCategory: item.leaveCategory ?? 'paid',
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

      <form onSubmit={handleSave} className="space-y-5">
        {/* Card 1: Basic Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Basic Information</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Leave Type Name *</label>
                <input type="text" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Sick Leave" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Leave Code</label>
                <input type="text" value={form.leaveCode}
                  onChange={(e) => { codeEdited.current = true; setForm((p) => ({ ...p, leaveCode: e.target.value })); }}
                  placeholder="e.g. SL"
                  className={`${inputClass} uppercase`} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Days Per Year *</label>
                <input type="number" required min={0} value={form.daysPerYear} onChange={(e) => setForm((p) => ({ ...p, daysPerYear: Math.max(0, parseInt(e.target.value) || 0) }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Leave Category</label>
                <select value={form.leaveCategory} onChange={(e) => setForm((p) => ({ ...p, leaveCategory: e.target.value as 'paid' | 'unpaid' }))} className={inputClass}>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Restrictions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Restrictions</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
            <div>
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
        </motion.div>

        {/* Card 3: Leave Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
          className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Leave Settings</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
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
        </motion.div>

        {/* Card 4: Carry Forward (conditional) */}
        {form.carryForward && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Carry Forward</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Maximum Carry Forward Leaves</label>
                  <input type="number" min={0} value={form.maxCarryForwardLeaves}
                    onChange={(e) => setForm((p) => ({ ...p, maxCarryForwardLeaves: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Expiry of Carry Forwarded Leaves (Days)</label>
                  <input type="number" min={0} value={form.carryForwardExpiryDays}
                    onChange={(e) => setForm((p) => ({ ...p, carryForwardExpiryDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className={inputClass} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Card 5: Compensatory Off Settings (conditional) */}
        {form.isCompensatory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Compensatory Off Settings</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${form.hasExpiry ? 'bg-zinc-900' : 'border-2 border-zinc-400 hover:border-zinc-600'}`}>
                    <input type="checkbox" checked={form.hasExpiry}
                      onChange={() => setForm((p) => ({ ...p, hasExpiry: !p.hasExpiry, expiryDays: p.hasExpiry ? 0 : p.expiryDays }))}
                      className="sr-only" />
                    {form.hasExpiry && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        className="w-3 h-3 pointer-events-none">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm text-zinc-700">Has Expiry</span>
                </label>
              </div>
              {form.hasExpiry && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Expiry Days</label>
                  <input type="number" min={0} value={form.expiryDays}
                    onChange={(e) => setForm((p) => ({ ...p, expiryDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className={`${inputClass} max-w-[200px]`} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Card 6: Encashment */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Encashment</h2>
          </div>
          <div className="p-5">
            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${form.allowEncashment ? 'bg-zinc-900' : 'border-2 border-zinc-400 hover:border-zinc-600'}`}>
                  <input type="checkbox" checked={form.allowEncashment}
                    onChange={() => setForm((p) => ({ ...p, allowEncashment: !p.allowEncashment }))}
                    className="sr-only" />
                  {form.allowEncashment && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      className="w-3 h-3 pointer-events-none">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="text-sm text-zinc-700">Allow Encashment</span>
              </label>
            </div>
            {form.allowEncashment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 border-t border-zinc-100 pt-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Maximum Encashable Days</label>
                    <input type="number" min={0} value={form.maxEncashableDays}
                      onChange={(e) => setForm((p) => ({ ...p, maxEncashableDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Non-Encashable Leaves</label>
                    <input type="number" min={0} value={form.nonEncashableLeaves}
                      onChange={(e) => setForm((p) => ({ ...p, nonEncashableLeaves: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Encashment Rate (%)</label>
                    <input type="number" min={0} max={100} value={form.encashmentRatePercent}
                      onChange={(e) => setForm((p) => ({ ...p, encashmentRatePercent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                      className={inputClass} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Card 7: Earned Leave */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Earned Leave</h2>
          </div>
          <div className="p-5">
            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${form.enableEarnedLeave ? 'bg-zinc-900' : 'border-2 border-zinc-400 hover:border-zinc-600'}`}>
                  <input type="checkbox" checked={form.enableEarnedLeave}
                    onChange={() => setForm((p) => ({ ...p, enableEarnedLeave: !p.enableEarnedLeave }))}
                    className="sr-only" />
                  {form.enableEarnedLeave && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      className="w-3 h-3 pointer-events-none">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="text-sm text-zinc-700">Enable Earned Leave</span>
              </label>
            </div>
            {form.enableEarnedLeave && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 border-t border-zinc-100 pt-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Credit Frequency</label>
                    <select value={form.creditFrequency}
                      onChange={(e) => setForm((p) => ({ ...p, creditFrequency: e.target.value as '' | 'monthly' | 'quarterly' | 'yearly' }))}
                      className={inputClass}>
                      <option value="" disabled>Select</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Allocate on Date</label>
                    <select value={form.allocateOnDate}
                      onChange={(e) => setForm((p) => ({ ...p, allocateOnDate: e.target.value as '' | 'first_day' | 'last_day' | 'date_of_joining' }))}
                      className={inputClass}>
                      <option value="" disabled>Select</option>
                      <option value="first_day">First Day</option>
                      <option value="last_day">Last Day</option>
                      <option value="date_of_joining">Date of Joining</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="flex gap-3"
        >
          <button type="button" onClick={() => navigate('/hrms/leave/type')}
            className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving || !form.name.trim() || form.daysPerYear < 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Leave Type'}
          </button>
        </motion.div>
      </form>
    </div>
  );
}
