import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLeaveType, createLeaveType, updateLeaveType } from '../../lib/hrmsLeave';
import { Button } from '@/components/ui/button';
import { Textarea, Input, fieldClass, selectClass } from '@/components/ui/input';

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
  encashmentRatePercent: number;
  description: string;
  status: 'active' | 'inactive';
  hasExpiry: boolean;
  expiryDays: number;
  enableEarnedLeave: boolean;
  creditFrequency: '' | 'monthly' | 'quarterly' | 'yearly';
  allocateOnDate: '' | 'first_day' | 'last_day' | 'custom_date';
  allocateOnCustomDate: string;
}

const defaultForm: FormState = {
  name: '', leaveCode: '', daysPerYear: 0, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0,
  isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false,
  allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false,
  allowEncashment: false, maxEncashableDays: 0, encashmentRatePercent: 100,
  description: '', status: 'active',
  hasExpiry: false, expiryDays: 0,
  enableEarnedLeave: false, creditFrequency: '', allocateOnDate: '', allocateOnCustomDate: '',
};

const inputClass = fieldClass;

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
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { token } = useAuth();

  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState('');
  const codeEdited = useRef(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  function generateLeaveCode(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return '';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return parts.map((w) => w[0]).join('').toUpperCase().slice(0, 4);
  }

  useEffect(() => {
    if (codeEdited.current || !form.name.trim()) return;
    setForm((p) => ({ ...p, leaveCode: generateLeaveCode(p.name) }));
  }, [form.name]);

  useEffect(() => {
    if (!isEdit || !token || !id) return;
    (async () => {
      try {
        const item = await getLeaveType(token, Number(id));
        codeEdited.current = true;
        setForm({
          name: item.name,
          leaveCode: item.leave_code ?? '',
          daysPerYear: item.days_per_year,
          carryForward: item.carry_forward ?? false,
          maxCarryForwardLeaves: item.max_carry_forward_leaves ?? 0,
          carryForwardExpiryDays: item.carry_forward_expiry_days ?? 0,
          allowLeaveAfterDays: item.allow_leave_after_days ?? 0,
          maxConsecutiveLeaves: item.max_consecutive_leaves ?? 0,
          isLeaveWithoutPay: item.is_leave_without_pay ?? false,
          isPartiallyPaidLeave: item.is_partially_paid_leave ?? false,
          isOptionalLeave: item.is_optional_leave ?? false,
          allowNegativeBalance: item.allow_negative_balance ?? false,
          allowOverAllocating: item.allow_over_allocating ?? false,
          includeHolidaysAsLeaves: item.include_holidays_as_leaves ?? false,
          isCompensatory: item.is_compensatory ?? false,
          allowEncashment: item.allow_encashment ?? false,
          maxEncashableDays: item.max_encashable_days ?? 0,
          encashmentRatePercent: item.encashment_rate_percent ?? 100,
          description: item.description || '',
          status: item.status || 'active',
          hasExpiry: false,
          expiryDays: 0,
          enableEarnedLeave: item.enable_earned_leave ?? false,
          creditFrequency: (item.earned_leave_frequency as any) || '',
          allocateOnDate: (item.allocate_on_date as any) || '',
          allocateOnCustomDate: item.allocate_on_custom_date || '',
        });
      } catch (e) {
        setNotFound(true);
      }
    })();
  }, [id, isEdit, token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim() || 'Unnamed Leave Type',
        leave_code: form.leaveCode ? form.leaveCode.trim() : '',
        days_per_year: form.daysPerYear || 0,
        carry_forward: form.carryForward,
        max_carry_forward_leaves: form.maxCarryForwardLeaves || 0,
        carry_forward_expiry_days: form.carryForwardExpiryDays || 0,
        allow_leave_after_days: form.allowLeaveAfterDays || 0,
        max_consecutive_leaves: form.maxConsecutiveLeaves || 0,
        is_leave_without_pay: form.isLeaveWithoutPay,
        is_partially_paid_leave: form.isPartiallyPaidLeave,
        is_optional_leave: form.isOptionalLeave,
        allow_negative_balance: form.allowNegativeBalance,
        allow_over_allocating: form.allowOverAllocating,
        include_holidays_as_leaves: form.includeHolidaysAsLeaves,
        is_compensatory: form.isCompensatory,
        enable_earned_leave: form.enableEarnedLeave,
        earned_leave_frequency: form.enableEarnedLeave && form.creditFrequency ? form.creditFrequency : '',
        allocate_on_date: form.enableEarnedLeave && form.allocateOnDate ? form.allocateOnDate : '',
        allocate_on_custom_date: form.enableEarnedLeave && form.allocateOnDate === 'custom_date' && form.allocateOnCustomDate ? form.allocateOnCustomDate : '',
        allow_encashment: form.allowEncashment,
        max_encashable_days: form.maxEncashableDays || 0,
        encashment_rate_percent: form.encashmentRatePercent || 100,
        description: form.description ? form.description.trim() : '',
        status: form.status || 'active',
      };

      if (isEdit) {
        await updateLeaveType(token, Number(id), payload);
      } else {
        await createLeaveType(token, payload);
      }
      navigate('/hrms/leave/type');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save leave type');
    } finally {
      setSaving(false);
    }
  };

  if (notFound) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-semibold text-foreground mb-1">Leave type not found</h3>
          <p className="text-xs text-muted-foreground/70 mb-4">The leave type you're trying to edit doesn't exist.</p>
          <Button variant="dark" size="sm" onClick={() => navigate('/hrms/leave/type')}
            >
            Back to Leave Types
          </Button>
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
        <Button variant="ghost" size="icon-sm"
          onClick={() => navigate('/hrms/leave/type')}
          
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{isEdit ? 'Edit Leave Type' : 'New Leave Type'}</h1>
          <p className="text-[13px] text-muted-foreground">{isEdit ? 'Update the leave category details' : 'Create a new leave category'}</p>
        </div>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Card 1: Basic Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-border bg-muted/50">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Basic Information</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Leave Type Name</label>
                <Input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Medical Leave"  />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Leave Code</label>
                <Input type="text" value={form.leaveCode}
                  onChange={(e) => { codeEdited.current = true; setForm((p) => ({ ...p, leaveCode: e.target.value })); }}
                  placeholder="e.g. ML"
                  className={`${inputClass} uppercase`} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Days Per Year</label>
              <Input type="number" min={0} value={form.daysPerYear} onChange={(e) => setForm((p) => ({ ...p, daysPerYear: Math.max(0, parseInt(e.target.value) || 0) }))}  />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Description</label>
              <Textarea className="w-full"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Enter a description for this leave category..."
                rows={3}
                
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Status</label>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, status: 'active' }))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.status === 'active' ? 'bg-primary text-white shadow-sm' : 'bg-secondary text-foreground/70 hover:bg-border'}`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, status: 'inactive' }))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.status === 'inactive' ? 'bg-destructive text-white shadow-sm' : 'bg-secondary text-foreground/70 hover:bg-border'}`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Restrictions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-border bg-muted/50">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Restrictions</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Allow Leave Application After (Working Days)</label>
                <Input type="number" min={0} value={form.allowLeaveAfterDays}
                  onChange={(e) => setForm((p) => ({ ...p, allowLeaveAfterDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                   />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Maximum Consecutive Leaves Allowed</label>
                <Input type="number" min={0} value={form.maxConsecutiveLeaves}
                  onChange={(e) => setForm((p) => ({ ...p, maxConsecutiveLeaves: Math.max(0, parseInt(e.target.value) || 0) }))}
                   />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Leave Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-border bg-muted/50">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Leave Settings</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {checkboxes.map((cb) => (
                <label key={cb.key} className="flex items-center gap-3 cursor-pointer">
                  <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${(form as any)[cb.key] ? 'bg-foreground' : 'border-2 border-input hover:border-muted-foreground'}`}>
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
                  <span className="text-sm text-foreground/85">{cb.label}</span>
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
            className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-border bg-muted/50">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Carry Forward</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Maximum Carry Forward Leaves</label>
                  <Input type="number" min={0} value={form.maxCarryForwardLeaves}
                    onChange={(e) => setForm((p) => ({ ...p, maxCarryForwardLeaves: Math.max(0, parseInt(e.target.value) || 0) }))}
                     />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Expiry of Carry Forwarded Leaves (Days)</label>
                  <Input type="number" min={0} value={form.carryForwardExpiryDays}
                    onChange={(e) => setForm((p) => ({ ...p, carryForwardExpiryDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                     />
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
            className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-border bg-muted/50">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Compensatory Off Settings</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${form.hasExpiry ? 'bg-foreground' : 'border-2 border-input hover:border-muted-foreground'}`}>
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
                  <span className="text-sm text-foreground/85">Has Expiry</span>
                </label>
              </div>
              {form.hasExpiry && (
                <div>
                  <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Expiry Days</label>
                  <Input type="number" min={0} value={form.expiryDays}
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
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-border bg-muted/50">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Encashment</h2>
          </div>
          <div className="p-5">
            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${form.allowEncashment ? 'bg-foreground' : 'border-2 border-input hover:border-muted-foreground'}`}>
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
                <span className="text-sm text-foreground/85">Allow Encashment</span>
              </label>
            </div>
            {form.allowEncashment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 border-t border-border pt-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Maximum Encashable Days</label>
                    <Input type="number" min={0} value={form.maxEncashableDays}
                      onChange={(e) => setForm((p) => ({ ...p, maxEncashableDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                       />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Encashment Rate (%)</label>
                    <Input type="number" min={0} max={100} value={form.encashmentRatePercent}
                      onChange={(e) => setForm((p) => ({ ...p, encashmentRatePercent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                       />
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
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-border bg-muted/50">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Earned Leave</h2>
          </div>
          <div className="p-5">
            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${form.enableEarnedLeave ? 'bg-foreground' : 'border-2 border-input hover:border-muted-foreground'}`}>
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
                <span className="text-sm text-foreground/85">Enable Earned Leave</span>
              </label>
            </div>
            {form.enableEarnedLeave && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 border-t border-border pt-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Credit Frequency</label>
                    <select value={form.creditFrequency}
                      onChange={(e) => setForm((p) => ({ ...p, creditFrequency: e.target.value as '' | 'monthly' | 'quarterly' | 'yearly' }))}
                      className={selectClass}>
                      <option value="" disabled>Select</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Allocate on Date</label>
                    <select value={form.allocateOnDate}
                      onChange={(e) => setForm((p) => ({ ...p, allocateOnDate: e.target.value as '' | 'first_day' | 'last_day' | 'custom_date' }))}
                      className={selectClass}>
                      <option value="" disabled>Select</option>
                      <option value="first_day">First Day</option>
                      <option value="last_day">Last Day</option>
                      <option value="custom_date">Custom Date</option>
                    </select>
                  </div>
                  {form.allocateOnDate === 'custom_date' && (
                    <div>
                      <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Select Date</label>
                      <Input
                        type="date"
                        value={form.allocateOnCustomDate}
                        onChange={(e) => setForm((p) => ({ ...p, allocateOnCustomDate: e.target.value }))}
                        
                      />
                    </div>
                  )}
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
          <Button variant="secondary" className="flex-1" type="button" onClick={() => navigate('/hrms/leave/type')}
            >
            Cancel
          </Button>
          <Button variant="dark" className="flex-1" type="submit" disabled={saving}
            >
            <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Leave Type'}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
