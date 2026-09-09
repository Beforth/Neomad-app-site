import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLeaveType, LeaveTypeOut } from '../../lib/hrmsLeave';

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
  const { token } = useAuth();
  const [item, setItem] = useState<LeaveTypeOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      setLoading(true);
      try {
        const res = await getLeaveType(token, Number(id));
        setItem(res);
      } catch (e) {
        console.error('Failed to get leave type detail:', e);
        setItem(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-zinc-400" size={24} />
      </div>
    );
  }

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
    { key: 'carry_forward', label: 'Carry Forward' },
    { key: 'is_leave_without_pay', label: 'Leave Without Pay' },
    { key: 'is_partially_paid_leave', label: 'Partially Paid Leave' },
    { key: 'is_optional_leave', label: 'Optional Leave' },
    { key: 'allow_negative_balance', label: 'Allow Negative Balance' },
    { key: 'allow_over_allocating', label: 'Allow Over Allocating' },
    { key: 'include_holidays_as_leaves', label: 'Include Holidays Within Leaves as Leaves' },
    { key: 'is_compensatory', label: 'Is Compensatory' },
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
          { label: 'Days Per Year', value: `${item.days_per_year}`, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
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
            { label: 'Leave Code', value: item.leave_code || '—' },
            { label: 'Allow Leave Application After (Days)', value: `${item.allow_leave_after_days || 0}` },
            { label: 'Max Consecutive Leaves Allowed', value: `${item.max_consecutive_leaves || 0}` },
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
      {item.carry_forward && (
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
              { label: 'Max Carry Forward Leaves', value: `${item.max_carry_forward_leaves || 0}` },
              { label: 'Expiry of Carry Forwarded Leaves (Days)', value: `${item.carry_forward_expiry_days || 0}` },
            ]} />
          </div>
        </motion.div>
      )}

      {/* Encashment */}
      {item.allow_encashment && (
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
              { label: 'Max Encashable Days', value: `${item.max_encashable_days || 0}` },
              { label: 'Encashment Rate', value: `${item.encashment_rate_percent || 100}%` },
            ]} />
          </div>
        </motion.div>
      )}

      {/* Earned Leave */}
      {item.enable_earned_leave && (
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
              { label: 'Credit Frequency', value: item.earned_leave_frequency ? item.earned_leave_frequency.charAt(0).toUpperCase() + item.earned_leave_frequency.slice(1) : '—' },
              { label: 'Allocate on Date', value: item.allocate_on_date ? (item.allocate_on_date === 'first_day' ? 'First Day' : item.allocate_on_date === 'last_day' ? 'Last Day' : item.allocate_on_date === 'custom_date' && item.allocate_on_custom_date ? new Date(item.allocate_on_custom_date).toLocaleDateString() : item.allocate_on_date === 'custom_date' ? 'Custom Date (not set)' : '—') : '—' },
            ]} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
