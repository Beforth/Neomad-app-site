import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, Inbox, UserPlus, Plus, Loader2, Users, Search, X, Eye } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { getUsers } from '../../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, selectClass } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
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
  maxPaidLeaves?: number;
  maxUnpaidLeaves?: number;
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
        aData.map((a) => {
          const pol = pData.find((p) => p.id === a.policy_id);
          return {
            id: a.id,
            policyName: a.policy_name || `Policy #${a.policy_id}`,
            employeeName: a.employee_name || a.employee_email || `User #${a.user_id}`,
            assignBasis: a.assign_basis || 'user',
            startDate: a.start_date,
            endDate: a.end_date,
            assignedAt: a.created_at ? a.created_at.split('T')[0] : a.start_date,
            maxPaidLeaves: pol?.max_paid_leaves,
            maxUnpaidLeaves: pol?.max_unpaid_leaves,
            entitlements: (a.entitlements || []).map((e) => ({
              leaveTypeName: e.leave_type_name || `Type #${e.leave_type_id}`,
              days: e.days,
            })),
          };
        })
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
          <Button variant="ghost" size="icon-sm"
            onClick={() => navigate('/hrms/leave/policy')}
            
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Assign Leave Policy</h1>
            <p className="text-[13px] text-muted-foreground">Assign a leave policy to an employee</p>
          </div>
        </div>
        <Button variant="dark" size="sm"
          onClick={() => navigate('/hrms/leave/policy/new')}
          
        >
          <Plus size={14} /> Create Policy
        </Button>
      </motion.div>

      {/* Assign Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-border bg-muted/50">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">New Assignment</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Select Policy *</label>
            <SearchableSelect
              value={selectedPolicy}
              onChange={setSelectedPolicy}
              options={policyOptions}
              placeholder="Choose a policy"
              disabled={policyOptions.length === 0}
            />
            {policyOptions.length === 0 && (
              <p className="text-[11px] text-muted-foreground/70 mt-1">No policies available. Create one first.</p>
            )}
          </div>
          {/* Bulk Employee Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-muted-foreground/70 font-medium flex items-center gap-1">
                <Users size={12} className="text-muted-foreground" /> Select Employees (Bulk Assign) *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmployees(employeeOptions.map((e) => e.value))}
                  className="text-[11px] font-semibold text-primary hover:text-accent-foreground hover:underline"
                >
                  Select All ({employeeOptions.length})
                </button>
                <span className="text-muted-foreground/50">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedEmployees([])}
                  className="text-[11px] font-semibold text-muted-foreground/70 hover:text-foreground/70 hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Card className="w-full px-3 py-2.5 text-xs text-foreground cursor-pointer flex items-center justify-between hover:border-input transition-all"
                onClick={() => setShowEmpDropdown((v) => !v)}
                
              >
                <span className="font-semibold text-foreground/85">
                  {selectedEmployees.length === 0
                    ? 'Choose employees...'
                    : `${selectedEmployees.length} of ${employeeOptions.length} Employee${selectedEmployees.length > 1 ? 's' : ''} Selected`}
                </span>
                <Badge>
                  {showEmpDropdown ? 'Close ▲' : 'Select ▼'}
                </Badge>
              </Card>

              {showEmpDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 border border-border rounded-xl bg-card shadow-lg space-y-2 max-h-60 overflow-y-auto"
                >
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground/70" />
                    <Input className="w-full pl-8 pr-3"
                      type="text"
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      placeholder="Search employee by name..."
                      
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
                              isSelected ? 'bg-accent text-accent-foreground font-bold' : 'hover:bg-muted text-foreground/85'
                            }`}
                          >
                            <Checkbox
                              checked={!!(isSelected)}
                              onCheckedChange={() => {
                                setSelectedEmployees((prev) =>
                                  isSelected ? prev.filter((x) => x !== emp.value) : [...prev, emp.value]
                                );
                              }}
                              
                            />
                            <span>{emp.label}</span>
                          </label>
                        );
                      })}
                  </div>
                </motion.div>
              )}

              {selectedEmployees.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 bg-accent/70 border border-primary/20 rounded-md text-xs font-semibold text-accent-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    {selectedEmployees.length === employeeOptions.length
                      ? `All Employees Selected (${employeeOptions.length} Employees)`
                      : `${selectedEmployees.length} Employee${selectedEmployees.length > 1 ? 's' : ''} Selected for Assignment`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployees([])}
                    className="text-[11px] text-accent-foreground hover:text-primary font-semibold underline"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Assign Based On *</label>
            <select
              value={assignBasis}
              onChange={(e) => setAssignBasis(e.target.value)}
              className={`${selectClass.replace("w-full", "")} w-full`}
            >
              <option value="">Select...</option>
              <option value="leave_period">Leave Period</option>
              <option value="joining_date">Joining Date</option>
            </select>
          </div>
          {assignBasis === 'leave_period' && (
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Select Leave Period *</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className={`${selectClass.replace("w-full", "")} w-full`}
              >
                <option value="">Select a leave period...</option>
                {periodOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {periodOptions.length === 0 && (
                <p className="text-[11px] text-muted-foreground/70 mt-1">No leave periods available. Create one first.</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Start Date *</label>
              <Input className="w-full"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={assignBasis !== 'joining_date'}
                
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">End Date *</label>
              <Input className="w-full"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={assignBasis !== 'joining_date'}
                
              />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${carryOverUnused ? 'bg-foreground' : 'border-2 border-input hover:border-muted-foreground'}`}>
              <input type="checkbox" checked={carryOverUnused}
                onChange={() => setCarryOverUnused((p) => !p)}
                className="sr-only" />
              {carryOverUnused && (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 pointer-events-none">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className="text-sm text-foreground/85">Add unused leaves from previous allocations</span>
          </label>
          <div className="flex justify-end">
            <Button variant="dark"
              type="button"
              onClick={handleAssign}
              disabled={saving || !selectedPolicy || selectedEmployees.length === 0}
              
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              <span>{saving ? 'Assigning...' : `Assign Policy to ${selectedEmployees.length > 0 ? selectedEmployees.length : ''} Employee${selectedEmployees.length > 1 ? 's' : ''}`}</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Assigned List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm">Assigned Policies</h2>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</p>
        </div>

        {assignments.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No assignments yet" description="Assign a leave policy to an employee above." className="border-0" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {['Employee', 'Policy', 'Allocated Leave', 'Basis', 'Start Date', 'End Date', 'Assigned Date', ''].map((label) => (
                    <TableHead key={label} className="uppercase whitespace-nowrap">
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a, i) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/70"
                  >
                    <TableCell className="font-semibold text-foreground">{a.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground">{a.policyName}</TableCell>
                    <TableCell>
                      {a.entitlements && a.entitlements.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {a.entitlements.map((ent, idx) => (
                            <Badge variant="success"
                              key={idx}
                              
                            >
                              {ent.leaveTypeName} {ent.days ? `(${ent.days}d)` : ''}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="success" >
                          {a.maxPaidLeaves || a.maxUnpaidLeaves
                            ? `${a.maxPaidLeaves || 0} Paid / ${a.maxUnpaidLeaves || 0} LWP Monthly`
                            : 'Policy monthly caps'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.assignBasis === 'leave_period' ? 'Leave Period' : 'Joining Date'}</TableCell>
                    <TableCell className="text-muted-foreground">{a.startDate}</TableCell>
                    <TableCell className="text-muted-foreground">{a.endDate}</TableCell>
                    <TableCell className="text-muted-foreground">{a.assignedAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon-sm"
                          onClick={() => navigate(`/hrms/leave/policy/assign/${a.id}`)}
                          
                          title="View Assignment Details"
                        >
                          <Eye size={15} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeAssignment(a.id)}
                          
                          title="Remove Assignment"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
