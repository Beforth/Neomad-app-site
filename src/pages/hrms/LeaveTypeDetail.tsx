import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar } from 'lucide-react';

interface LeaveTypeFull {
  id: number;
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
  hasExpiry: boolean;
  expiryDays: number;
  allowEncashment: boolean;
  maxEncashableDays: number;
  encashmentRatePercent: number;
  enableEarnedLeave: boolean;
  creditFrequency: string;
  allocateOnDate: string;
  allocateOnCustomDate?: string;
  description: string;
  status: 'active' | 'inactive';
}

function loadTypes(): LeaveTypeFull[] {
  try {
    const stored = localStorage.getItem('leaveTypes');
    if (stored) {
      const parsed = JSON.parse(stored) as LeaveTypeFull[];
      return parsed.map((item) => ({
        ...item,
        leaveCode: item.leaveCode ?? '',
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
        hasExpiry: item.hasExpiry ?? false,
        expiryDays: item.expiryDays ?? 0,
        allowEncashment: item.allowEncashment ?? false,
        maxEncashableDays: item.maxEncashableDays ?? 0,
        encashmentRatePercent: item.encashmentRatePercent ?? 100,
        enableEarnedLeave: item.enableEarnedLeave ?? false,
        creditFrequency: item.creditFrequency ?? '',
        allocateOnDate: item.allocateOnDate ?? '',
        allocateOnCustomDate: item.allocateOnCustomDate ?? '',
      }));
    }
  } catch {}
  return [];
}

function Check({ checked }: { checked: boolean }) {
  return checked
    ? <span className="text-emerald-600 font-bold">&#10003;</span>
    : <span className="text-zinc-300">&#8212;</span>;
}

function FieldsGrid({ fields }: { fields: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {fields.map((f) => (
        <div key={f.label}>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">{f.label}</p>
          <p className="text-sm font-medium text-zinc-900">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function LeaveTypeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const item = useMemo(() => {
    const types = loadTypes();
    return types.find((t) => t.id === Number(id)) || null;
  }, [id]);

  if (!item) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Leave type not found</h3>
          <p className="text-xs text-zinc-400 mb-4">The leave type doesn't exist.</p>
          <button onClick={() => navigate('/hrms/leave/type')}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
            Back to Leave Types
          </button>
        </div>
      </div>
    );
  }

  const settingsCheckboxes = [
    { key: 'carryForward', label: 'Carry Forward' },
    { key: 'isLeaveWithoutPay', label: 'Leave Without Pay' },
    { key: 'isPartiallyPaidLeave', label: 'Partially Paid Leave' },
    { key: 'isOptionalLeave', label: 'Optional Leave' },
    { key: 'allowNegativeBalance', label: 'Allow Negative Balance' },
    { key: 'allowOverAllocating', label: 'Allow Over Allocating' },
    { key: 'includeHolidaysAsLeaves', label: 'Include Holidays Within Leaves as Leaves' },
    { key: 'isCompensatory', label: 'Is Compensatory' },
  ] as const;

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
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{item.name}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Leave type details</p>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${item.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {item.status}
          </span>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Days Per Year', value: `${item.daysPerYear}`, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-zinc-900 leading-none">{stat.value}</p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Description */}
      {item.description && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white border border-zinc-100 rounded-xl p-4 shadow-sm"
        >
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Description</p>
          <p className="text-sm text-zinc-700">{item.description}</p>
        </motion.div>
      )}

      {/* Restrictions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Restrictions</h2>
        </div>
        <div className="p-4">
          <FieldsGrid fields={[
            { label: 'Leave Code', value: item.leaveCode || '—' },
            { label: 'Allow Leave Application After (Days)', value: `${item.allowLeaveAfterDays}` },
            { label: 'Max Consecutive Leaves Allowed', value: `${item.maxConsecutiveLeaves}` },
          ]} />
        </div>
      </motion.div>

      {/* Leave Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Leave Settings</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {settingsCheckboxes.map((cb) => (
              <div key={cb.key} className="flex items-center gap-2">
                <Check checked={(item as any)[cb.key] as boolean} />
                <span className="text-xs text-zinc-600">{cb.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Carry Forward */}
      {item.carryForward && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Carry Forward</h2>
          </div>
          <div className="p-4">
            <FieldsGrid fields={[
              { label: 'Max Carry Forward Leaves', value: `${item.maxCarryForwardLeaves}` },
              { label: 'Expiry of Carry Forwarded Leaves (Days)', value: `${item.carryForwardExpiryDays}` },
            ]} />
          </div>
        </motion.div>
      )}

      {/* Compensatory Off Settings */}
      {item.isCompensatory && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Compensatory Off Settings</h2>
          </div>
          <div className="p-4">
            <FieldsGrid fields={[
              { label: 'Has Expiry', value: item.hasExpiry ? 'Yes' : 'No' },
              { label: 'Expiry Days', value: item.hasExpiry ? `${item.expiryDays}` : '—' },
            ]} />
          </div>
        </motion.div>
      )}

      {/* Encashment */}
      {item.allowEncashment && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Encashment</h2>
          </div>
          <div className="p-4">
            <FieldsGrid fields={[
              { label: 'Max Encashable Days', value: `${item.maxEncashableDays}` },
              { label: 'Encashment Rate', value: `${item.encashmentRatePercent}%` },
            ]} />
          </div>
        </motion.div>
      )}

      {/* Earned Leave */}
      {item.enableEarnedLeave && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Earned Leave</h2>
          </div>
          <div className="p-4">
            <FieldsGrid fields={[
              { label: 'Credit Frequency', value: item.creditFrequency ? item.creditFrequency.charAt(0).toUpperCase() + item.creditFrequency.slice(1) : '—' },
              { label: 'Allocate on Date', value: item.allocateOnDate ? (item.allocateOnDate === 'first_day' ? 'First Day' : item.allocateOnDate === 'last_day' ? 'Last Day' : item.allocateOnDate === 'custom_date' && item.allocateOnCustomDate ? new Date(item.allocateOnCustomDate).toLocaleDateString() : item.allocateOnDate === 'custom_date' ? 'Custom Date (not set)' : '—') : '—' },
            ]} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
