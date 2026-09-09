import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Tag, ArrowRightLeft, Clock, User } from 'lucide-react';

interface Assignment {
  id: number;
  policyName: string;
  employeeName: string;
  assignedAt: string;
}

interface SavedPolicy {
  id: number;
  name: string;
  description: string;
  effectiveDate: string;
  status: 'active' | 'inactive';
  entitlements: { leaveTypeName: string; days: number; carryForward: boolean; maxContinuous: number; description: string }[];
}

interface LeaveTypeFull {
  id: number;
  name: string;
  enableEarnedLeave: boolean;
  creditFrequency: string;
  allocateOnDate: string;
  allocateOnCustomDate?: string;
}

function loadAssignment(assignmentId: number): Assignment | null {
  try {
    const stored = localStorage.getItem('leavePolicyAssignments');
    if (!stored) return null;
    const assignments: Assignment[] = JSON.parse(stored);
    return assignments.find((a) => a.id === assignmentId) || null;
  } catch {
    return null;
  }
}

function loadPolicy(policyName: string): SavedPolicy | null {
  try {
    const stored = localStorage.getItem('leavePolicies');
    if (!stored) return null;
    const policies: SavedPolicy[] = JSON.parse(stored);
    return policies.find((p) => p.name === policyName) || null;
  } catch {
    return null;
  }
}

function loadLeaveType(typeName: string): LeaveTypeFull | null {
  try {
    const stored = localStorage.getItem('leaveTypes');
    if (!stored) return null;
    const types: LeaveTypeFull[] = JSON.parse(stored);
    return types.find((t) => t.name === typeName) || null;
  } catch {
    return null;
  }
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

export default function LeaveEntitlementDetail() {
  const navigate = useNavigate();
  const { id, entitlementId } = useParams();

  const data = useMemo(() => {
    const assignment = loadAssignment(Number(id));
    if (!assignment) return null;

    const policy = loadPolicy(assignment.policyName);
    if (!policy) return null;

    const entitlement = policy.entitlements[Number(entitlementId) - 1];
    if (!entitlement) return null;

    const leaveType = loadLeaveType(entitlement.leaveTypeName);

    return { assignment, policy, entitlement, leaveType };
  }, [id, entitlementId]);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Entitlement not found</h3>
          <p className="text-xs text-zinc-400 mb-4">The entitlement or assignment doesn't exist.</p>
          <button onClick={() => navigate('/hrms/leave/policy')}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
            Back to Policies
          </button>
        </div>
      </div>
    );
  }

  const { assignment, entitlement, leaveType } = data;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => navigate(`/hrms/leave/policy/assign/${id}`)}
          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{entitlement.leaveTypeName}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Entitlement details for {assignment.employeeName}</p>
        </div>
      </motion.div>

      {/* Employee Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
            <User size={18} className="text-zinc-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900">{assignment.employeeName}</p>
            <p className="text-xs text-zinc-400">
              {assignment.policyName} · Assigned {assignment.assignedAt}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Days / Year', value: `${entitlement.days}`, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
          { label: 'Carry Forward', value: entitlement.carryForward ? 'Yes' : 'No', icon: ArrowRightLeft, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Max Continuous', value: `${entitlement.maxContinuous} days`, icon: Clock, color: 'bg-amber-50 text-amber-600' },
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
      {entitlement.description && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white border border-zinc-100 rounded-xl p-4 shadow-sm"
        >
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Description</p>
          <p className="text-sm text-zinc-700">{entitlement.description}</p>
        </motion.div>
      )}

      {/* Leave Type Settings */}
      {leaveType && (
        <>
          {/* Restrictions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Leave Type Settings</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { key: 'carryForward', label: 'Carry Forward' },
                  { key: 'isLeaveWithoutPay', label: 'Leave Without Pay' },
                  { key: 'isPartiallyPaidLeave', label: 'Partially Paid Leave' },
                  { key: 'isOptionalLeave', label: 'Optional Leave' },
                  { key: 'allowNegativeBalance', label: 'Allow Negative Balance' },
                  { key: 'allowOverAllocating', label: 'Allow Over Allocating' },
                  { key: 'includeHolidaysAsLeaves', label: 'Include Holidays Within Leaves as Leaves' },
                  { key: 'isCompensatory', label: 'Is Compensatory' },
                ].map((cb) => (
                  <div key={cb.key} className="flex items-center gap-2">
                    <Check checked={(leaveType as any)[cb.key] as boolean} />
                    <span className="text-xs text-zinc-600">{cb.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Restrictions Detail */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Restrictions</h2>
            </div>
            <div className="p-4">
              <FieldsGrid fields={[
                { label: 'Allow Leave Application After (Days)', value: `${(leaveType as any).allowLeaveAfterDays ?? 0}` },
                { label: 'Max Consecutive Leaves Allowed', value: `${(leaveType as any).maxConsecutiveLeaves ?? 0}` },
              ]} />
            </div>
          </motion.div>

          {/* Earned Leave Schedule */}
          {leaveType.enableEarnedLeave && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Earned Leave Schedule</h2>
              </div>
              <div className="p-4">
                <FieldsGrid fields={[
                  { label: 'Credit Frequency', value: leaveType.creditFrequency ? leaveType.creditFrequency.charAt(0).toUpperCase() + leaveType.creditFrequency.slice(1) : '—' },
                  { label: 'Allocate on Date', value: leaveType.allocateOnDate ? (leaveType.allocateOnDate === 'first_day' ? 'First Day' : leaveType.allocateOnDate === 'last_day' ? 'Last Day' : leaveType.allocateOnDate === 'custom_date' && leaveType.allocateOnCustomDate ? new Date(leaveType.allocateOnCustomDate).toLocaleDateString() : leaveType.allocateOnDate === 'custom_date' ? 'Custom Date (not set)' : '—') : '—' },
                  { label: 'Days Per Year', value: `${entitlement.days}` },
                ]} />
              </div>
            </motion.div>
          )}

          {/* Carry Forward Detail */}
          {(leaveType as any).carryForward && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Carry Forward</h2>
              </div>
              <div className="p-4">
                <FieldsGrid fields={[
                  { label: 'Max Carry Forward Leaves', value: `${(leaveType as any).maxCarryForwardLeaves ?? 0}` },
                  { label: 'Expiry of Carry Forwarded Leaves (Days)', value: `${(leaveType as any).carryForwardExpiryDays ?? 0}` },
                ]} />
              </div>
            </motion.div>
          )}

          {/* Encashment */}
          {(leaveType as any).allowEncashment && (
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
                  { label: 'Max Encashable Days', value: `${(leaveType as any).maxEncashableDays ?? 0}` },
                  { label: 'Encashment Rate', value: `${(leaveType as any).encashmentRatePercent ?? 100}%` },
                ]} />
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
