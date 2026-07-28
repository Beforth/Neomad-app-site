import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Trash2, Inbox, Plus } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';

interface PolicyOption {
  value: string;
  label: string;
}

interface LeaveTypeOption {
  value: string;
  label: string;
}

interface AllocationItem {
  id: number;
  employeeName: string;
  leaveType: string;
  policyName: string;
  totalDays: number;
  carryForwardDays: number;
  effectiveDate: string;
  notes: string;
  allocatedAt: string;
}

function loadPolicies(): PolicyOption[] {
  try {
    const stored = localStorage.getItem('leavePolicies');
    if (!stored) return [];
    const policies = JSON.parse(stored) as { id: number; name: string }[];
    return policies.map((p) => ({ value: String(p.id), label: p.name }));
  } catch {
    return [];
  }
}

function loadLeaveTypes(): LeaveTypeOption[] {
  try {
    const stored = localStorage.getItem('leaveTypes');
    if (!stored) return [];
    const types = JSON.parse(stored) as { id: number; name: string }[];
    return types.map((t) => ({ value: String(t.id), label: t.name }));
  } catch {
    return [];
  }
}

function loadAllocations(): AllocationItem[] {
  try {
    const stored = localStorage.getItem('leaveAllocations');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

const mockEmployees = [
  { value: 'Alice Johnson', label: 'Alice Johnson' },
  { value: 'Bob Smith', label: 'Bob Smith' },
  { value: 'Carol Davis', label: 'Carol Davis' },
  { value: 'David Wilson', label: 'David Wilson' },
  { value: 'Eva Martinez', label: 'Eva Martinez' },
];

const inputClass = "w-full px-3 py-2.5 text-xs border border-zinc-200 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all";

export default function LeaveAllocation() {
  const navigate = useNavigate();

  const [policyOptions, setPolicyOptions] = useState<PolicyOption[]>([]);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<LeaveTypeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [totalDays, setTotalDays] = useState(0);
  const [carryForwardDays, setCarryForwardDays] = useState(0);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);

  useEffect(() => {
    setPolicyOptions(loadPolicies());
    setLeaveTypeOptions(loadLeaveTypes());
    setAllocations(loadAllocations());
  }, []);

  const handleAllocate = () => {
    if (!selectedEmployee || !selectedLeaveType || !selectedPolicy || totalDays <= 0 || !effectiveDate) return;
    setSaving(true);

    const policy = policyOptions.find((p) => p.value === selectedPolicy);
    const leaveType = leaveTypeOptions.find((t) => t.value === selectedLeaveType);
    const list = loadAllocations();
    const newId = Math.max(...list.map((a) => a.id), 0) + 1;
    list.push({
      id: newId,
      employeeName: selectedEmployee,
      leaveType: leaveType?.label ?? 'Unknown',
      policyName: policy?.label ?? 'Unknown',
      totalDays,
      carryForwardDays,
      effectiveDate,
      notes,
      allocatedAt: new Date().toISOString().split('T')[0],
    });
    localStorage.setItem('leaveAllocations', JSON.stringify(list));
    setAllocations(list);
    setSelectedEmployee('');
    setSelectedLeaveType('');
    setSelectedPolicy('');
    setTotalDays(0);
    setCarryForwardDays(0);
    setEffectiveDate('');
    setNotes('');
    setSaving(false);
  };

  const removeAllocation = (id: number) => {
    const list = allocations.filter((a) => a.id !== id);
    setAllocations(list);
    localStorage.setItem('leaveAllocations', JSON.stringify(list));
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hrms/leave/policy')}
            className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Leave Allocation</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Allocate leave days to employees</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/hrms/leave/policy/new')}
          className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Plus size={14} /> Create Policy
        </button>
      </motion.div>

      {/* Allocation Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">New Allocation</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Select Employee *</label>
              <SearchableSelect
                value={selectedEmployee}
                onChange={setSelectedEmployee}
                options={mockEmployees}
                placeholder="Choose an employee"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Select Policy *</label>
              <SearchableSelect
                value={selectedPolicy}
                onChange={setSelectedPolicy}
                options={policyOptions}
                placeholder="Choose a policy"
                disabled={policyOptions.length === 0}
              />
              {policyOptions.length === 0 && (
                <p className="text-[10px] text-zinc-400 mt-1">No policies available. Create one first.</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Select Leave Type *</label>
            <SearchableSelect
              value={selectedLeaveType}
              onChange={setSelectedLeaveType}
              options={leaveTypeOptions}
              placeholder="Choose a leave type"
              disabled={leaveTypeOptions.length === 0}
            />
            {leaveTypeOptions.length === 0 && (
              <p className="text-[10px] text-zinc-400 mt-1">No leave types available. Create one first.</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Total Days *</label>
              <input
                type="number"
                min={0}
                value={totalDays || ''}
                onChange={(e) => setTotalDays(Math.max(0, parseInt(e.target.value) || 0))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Carry Forward Days</label>
              <input
                type="number"
                min={0}
                value={carryForwardDays || ''}
                onChange={(e) => setCarryForwardDays(Math.max(0, parseInt(e.target.value) || 0))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Effective Date *</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAllocate}
              disabled={saving || !selectedEmployee || !selectedLeaveType || !selectedPolicy || totalDays <= 0 || !effectiveDate}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> {saving ? 'Allocating...' : 'Allocate'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Allocations List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900 text-sm">Allocated Leaves</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{allocations.length} allocation{allocations.length !== 1 ? 's' : ''}</p>
        </div>

        {allocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
              <Inbox size={24} className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">No allocations yet</h3>
            <p className="text-xs text-zinc-400 max-w-xs">Allocate leave days to an employee using the form above.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                  <tr>
                    {['Employee', 'Leave Type', 'Policy', 'Total Days', 'Carry Forward', 'Effective Date', 'Allocated Date', ''].map((label) => (
                      <th key={label || '__del'} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {allocations.map((a, i) => (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs font-bold text-zinc-900">{a.employeeName}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{a.leaveType}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{a.policyName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-[11px] font-bold text-zinc-700">
                          {a.totalDays}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-700">
                          {a.carryForwardDays}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{a.effectiveDate}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{a.allocatedAt}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeAllocation(a.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-zinc-100">
              {allocations.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-900">{a.employeeName}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{a.leaveType} · {a.policyName}</p>
                    </div>
                    <button
                      onClick={() => removeAllocation(a.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <span>Total: <span className="font-bold text-zinc-700">{a.totalDays}</span></span>
                    <span>·</span>
                    <span>CF: <span className="font-bold text-emerald-700">{a.carryForwardDays}</span></span>
                    <span>·</span>
                    <span>Eff: {a.effectiveDate}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
