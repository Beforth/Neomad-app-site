import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, Inbox, UserPlus, Plus } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';

interface PolicyOption {
  value: string;
  label: string;
}

interface Assignment {
  id: number;
  policyName: string;
  employeeName: string;
  assignBasis: string;
  startDate: string;
  endDate: string;
  assignedAt: string;
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

function loadAssignments(): Assignment[] {
  try {
    const stored = localStorage.getItem('leavePolicyAssignments');
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

export default function LeavePolicyAssign() {
  const navigate = useNavigate();

  const [policyOptions, setPolicyOptions] = useState<PolicyOption[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignBasis, setAssignBasis] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    setPolicyOptions(loadPolicies());
    setAssignments(loadAssignments());
  }, []);

  useEffect(() => {
    if (assignBasis === 'leave_period') {
      try {
        const stored = localStorage.getItem('leavePeriods');
        if (stored) {
          const periods = JSON.parse(stored) as { startDate: string; endDate: string; isActive: boolean }[];
          const active = periods.find((p) => p.isActive);
          if (active) {
            setStartDate(active.startDate);
            setEndDate(active.endDate);
          } else {
            setStartDate('');
            setEndDate('');
          }
        }
      } catch { setStartDate(''); setEndDate(''); }
    } else if (assignBasis === 'joining_date') {
      setStartDate('');
      setEndDate('');
    } else {
      setStartDate('');
      setEndDate('');
    }
  }, [assignBasis]);

  const handleAssign = () => {
    if (!selectedPolicy || !selectedEmployee || !assignBasis || !startDate || !endDate) return;
    setSaving(true);

    const policy = policyOptions.find((p) => p.value === selectedPolicy);
    const list = loadAssignments();
    const newId = Math.max(...list.map((a) => a.id), 0) + 1;
    list.push({
      id: newId,
      policyName: policy?.label ?? 'Unknown',
      employeeName: selectedEmployee,
      assignBasis,
      startDate,
      endDate,
      assignedAt: new Date().toISOString().split('T')[0],
    });
    localStorage.setItem('leavePolicyAssignments', JSON.stringify(list));
    setAssignments(list);
    setSelectedPolicy('');
    setSelectedEmployee('');
    setAssignBasis('');
    setStartDate('');
    setEndDate('');
    setSaving(false);
  };

  const removeAssignment = (id: number) => {
    const list = assignments.filter((a) => a.id !== id);
    setAssignments(list);
    localStorage.setItem('leavePolicyAssignments', JSON.stringify(list));
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
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Assign Leave Policy</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Assign a leave policy to an employee</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/hrms/leave/policy/new')}
          className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Plus size={14} /> Create Policy
        </button>
      </motion.div>

      {/* Assign Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">New Assignment</h2>
        </div>
        <div className="p-5 space-y-4">
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
            <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Assign Based On *</label>
            <select
              value={assignBasis}
              onChange={(e) => setAssignBasis(e.target.value)}
              className="w-full px-3 py-2.5 text-xs border border-zinc-200 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all"
            >
              <option value="">Select...</option>
              <option value="leave_period">Leave Period</option>
              <option value="joining_date">Joining Date</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={assignBasis !== 'joining_date'}
                className="w-full px-3 py-2.5 text-xs border border-zinc-200 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={assignBasis !== 'joining_date'}
                className="w-full px-3 py-2.5 text-xs border border-zinc-200 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAssign}
              disabled={saving || !selectedPolicy || !selectedEmployee || !assignBasis || !startDate || !endDate}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus size={16} /> {saving ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Assigned List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900 text-sm">Assigned Policies</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</p>
        </div>

        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
              <Inbox size={24} className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">No assignments yet</h3>
            <p className="text-xs text-zinc-400 max-w-xs">Assign a leave policy to an employee above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50/50 border-b border-zinc-100">
                <tr>
                  {['Employee', 'Policy', 'Basis', 'Start Date', 'End Date', 'Assigned Date', ''].map((label) => (
                    <th key={label} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {assignments.map((a, i) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-bold text-zinc-900">{a.employeeName}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{a.policyName}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{a.assignBasis === 'leave_period' ? 'Leave Period' : 'Joining Date'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{a.startDate}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{a.endDate}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{a.assignedAt}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeAssignment(a.id)}
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
        )}
      </motion.div>
    </div>
  );
}
