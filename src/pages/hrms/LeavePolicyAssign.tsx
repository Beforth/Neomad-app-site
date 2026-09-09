import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, Inbox, UserPlus, Plus, Loader2, Users, Search, X, Eye } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { getUsers } from '../../lib/api';
import {
  listLeavePolicies,
  listLeavePeriods,
  listLeavePolicyAssignments,
  createLeavePolicyAssignment,
  deleteLeavePolicyAssignment,
} from '../../lib/hrmsLeave';

interface Option {
  value: string;
  label: string;
}

interface PeriodOption {
  value: string;
  label: string;
  startDate: string;
  endDate: string;
}

interface Assignment {
  id: number;
  policyName: string;
  employeeName: string;
  assignBasis: string;
  startDate: string;
  endDate: string;
  assignedAt: string;
  entitlements: { leaveTypeName: string; days?: number }[];
}

export default function LeavePolicyAssign() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [policyOptions, setPolicyOptions] = useState<Option[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<Option[]>([]);
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);

  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [empSearch, setEmpSearch] = useState('');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  const [assignBasis, setAssignBasis] = useState('user');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [carryOverUnused, setCarryOverUnused] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const reloadData = async () => {
    if (!token) return;
    try {
      const [uData, pData, prData, aData] = await Promise.all([
        getUsers(token),
        listLeavePolicies(token),
        listLeavePeriods(token),
        listLeavePolicyAssignments(token),
      ]);

      setEmployeeOptions(
        uData.map((u: any) => ({
          value: String(u.id),
          label: (u.full_name || u.email || `User #${u.id}`).trim(),
        }))
      );
      setPolicyOptions(pData.map((p) => ({ value: String(p.id), label: p.name })));
      setPeriodOptions(
        prData.map((pr) => ({
          value: String(pr.id),
          label: pr.label,
          startDate: pr.start_date,
          endDate: pr.end_date,
        }))
      );
      if (prData.length > 0 && !selectedPeriod) {
        setSelectedPeriod(String(prData[0].id));
        setStartDate(prData[0].start_date);
        setEndDate(prData[0].end_date);
      }
      setAssignments(
        aData.map((a) => ({
          id: a.id,
          policyName: a.policy_name || `Policy #${a.policy_id}`,
          employeeName: a.employee_name || a.employee_email || `User #${a.user_id}`,
          assignBasis: a.assign_basis || 'user',
          startDate: a.start_date,
          endDate: a.end_date,
          assignedAt: a.created_at ? a.created_at.split('T')[0] : a.start_date,
          entitlements: (a.entitlements || []).map((e) => ({
            leaveTypeName: e.leave_type_name || `Type #${e.leave_type_id}`,
            days: e.days,
          })),
        }))
      );
    } catch (e) {
      console.error('Failed to load assign options:', e);
    }
  };

  useEffect(() => { reloadData(); }, [token]);

  useEffect(() => {
    if (!selectedPeriod) {
      setStartDate('');
      setEndDate('');
      return;
    }
    const period = periodOptions.find((p) => p.value === selectedPeriod);
    if (period) {
      setStartDate(period.startDate);
      setEndDate(period.endDate);
    }
  }, [selectedPeriod, periodOptions]);

  const handleAssign = async () => {
    const periodObj = periodOptions.find((p) => p.value === selectedPeriod);
    const sDate = startDate || (periodObj ? periodObj.startDate : '') || `${new Date().getFullYear()}-01-01`;
    const eDate = endDate || (periodObj ? periodObj.endDate : '') || `${new Date().getFullYear()}-12-31`;

    if (!selectedPolicy || selectedEmployees.length === 0 || !token) {
      showToast('Please select a policy and at least one employee');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        selectedEmployees.map((empId) =>
          createLeavePolicyAssignment(token, {
            policy_id: Number(selectedPolicy),
            user_id: Number(empId),
            assign_basis: assignBasis || 'leave_period',
            period_id: selectedPeriod ? Number(selectedPeriod) : undefined,
            start_date: sDate,
            end_date: eDate,
            carry_over_unused: carryOverUnused,
          })
        )
      );
      showToast(`Policy assigned to ${selectedEmployees.length} employee${selectedEmployees.length > 1 ? 's' : ''} successfully!`);
      await reloadData();
      setSelectedPolicy('');
      setSelectedEmployees([]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to assign policy');
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (id: number) => {
    if (!token) return;
    try {
      await deleteLeavePolicyAssignment(token, id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      showToast('Assignment removed');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove assignment');
    }
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
          {/* Bulk Employee Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1">
                <Users size={12} className="text-zinc-500" /> Select Employees (Bulk Assign) *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmployees(employeeOptions.map((e) => e.value))}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Select All ({employeeOptions.length})
                </button>
                <span className="text-zinc-300">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedEmployees([])}
                  className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div
                onClick={() => setShowEmpDropdown((v) => !v)}
                className="w-full px-3 py-2.5 text-xs border border-zinc-200 rounded-xl bg-white text-zinc-900 cursor-pointer flex items-center justify-between hover:border-zinc-300 transition-all"
              >
                <span className="font-semibold text-zinc-700">
                  {selectedEmployees.length === 0
                    ? 'Choose employees...'
                    : `${selectedEmployees.length} of ${employeeOptions.length} Employee${selectedEmployees.length > 1 ? 's' : ''} Selected`}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-100 px-2 py-0.5 rounded-md">
                  {showEmpDropdown ? 'Close ▲' : 'Select ▼'}
                </span>
              </div>

              {showEmpDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 border border-zinc-200 rounded-xl bg-white shadow-lg space-y-2 max-h-60 overflow-y-auto"
                >
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
                    <input
                      type="text"
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      placeholder="Search employee by name..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg outline-none focus:border-zinc-400"
                    />
                  </div>

                  <div className="space-y-1">
                    {employeeOptions
                      .filter((e) => e.label.toLowerCase().includes(empSearch.toLowerCase()))
                      .map((emp) => {
                        const isSelected = selectedEmployees.includes(emp.value);
                        return (
                          <label
                            key={emp.value}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-zinc-50 text-zinc-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedEmployees((prev) =>
                                  isSelected ? prev.filter((x) => x !== emp.value) : [...prev, emp.value]
                                );
                              }}
                              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                            />
                            <span>{emp.label}</span>
                          </label>
                        );
                      })}
                  </div>
                </motion.div>
              )}

              {selectedEmployees.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    {selectedEmployees.length === employeeOptions.length
                      ? `All Employees Selected (${employeeOptions.length} Employees)`
                      : `${selectedEmployees.length} Employee${selectedEmployees.length > 1 ? 's' : ''} Selected for Assignment`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployees([])}
                    className="text-[11px] text-emerald-700 hover:text-emerald-950 font-bold underline"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
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
          {assignBasis === 'leave_period' && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Select Leave Period *</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-zinc-200 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all"
              >
                <option value="">Select a leave period...</option>
                {periodOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {periodOptions.length === 0 && (
                <p className="text-[10px] text-zinc-400 mt-1">No leave periods available. Create one first.</p>
              )}
            </div>
          )}
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
          <label className="flex items-center gap-3 cursor-pointer">
            <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${carryOverUnused ? 'bg-zinc-900' : 'border-2 border-zinc-400 hover:border-zinc-600'}`}>
              <input type="checkbox" checked={carryOverUnused}
                onChange={() => setCarryOverUnused((p) => !p)}
                className="sr-only" />
              {carryOverUnused && (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 pointer-events-none">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className="text-sm text-zinc-700">Add unused leaves from previous allocations</span>
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAssign}
              disabled={saving || !selectedPolicy || selectedEmployees.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              <span>{saving ? 'Assigning...' : `Assign Policy to ${selectedEmployees.length > 0 ? selectedEmployees.length : ''} Employee${selectedEmployees.length > 1 ? 's' : ''}`}</span>
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
                  {['Employee', 'Policy', 'Allocated Leave', 'Basis', 'Start Date', 'End Date', 'Assigned Date', ''].map((label) => (
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
                    <td className="px-4 py-3 text-xs">
                      {a.entitlements && a.entitlements.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {a.entitlements.map((ent, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                            >
                              {ent.leaveTypeName} {ent.days ? `(${ent.days}d)` : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          2 Paid / 3 LWP Monthly
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{a.assignBasis === 'leave_period' ? 'Leave Period' : 'Joining Date'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{a.startDate}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{a.endDate}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{a.assignedAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/hrms/leave/policy/assign/${a.id}`)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                          title="View Assignment Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => removeAssignment(a.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove Assignment"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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
