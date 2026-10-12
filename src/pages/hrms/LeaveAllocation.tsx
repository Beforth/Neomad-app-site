import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Trash2, Inbox, Plus, Loader2 } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { getUsers } from '../../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Textarea, fieldClass } from '@/components/ui/input';
import {
  listLeaveTypes,
  listLeavePolicies,
  listLeaveAllocations,
  createLeaveAllocation,
  deleteLeaveAllocation,
} from '../../lib/hrmsLeave';

interface Option {
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

const inputClass = fieldClass;

export default function LeaveAllocation() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [policyOptions, setPolicyOptions] = useState<Option[]>([]);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<Option[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<Option[]>([]);

  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [totalDays, setTotalDays] = useState(0);
  const [carryForwardDays, setCarryForwardDays] = useState(0);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const reloadData = async () => {
    if (!token) return;
    try {
      const [uData, tData, pData, aData] = await Promise.all([
        getUsers(token),
        listLeaveTypes(token),
        listLeavePolicies(token),
        listLeaveAllocations(token),
      ]);

      setEmployeeOptions(
        uData.map((u: any) => ({
          value: String(u.id),
          label: (u.full_name || u.email || `User #${u.id}`).trim(),
        }))
      );
      setLeaveTypeOptions(tData.map((t) => ({ value: String(t.id), label: t.name })));
      setPolicyOptions(pData.map((p) => ({ value: String(p.id), label: p.name })));
      setAllocations(
        aData.map((a) => ({
          id: a.id,
          employeeName: a.employee_name || a.employee_email || `User #${a.user_id}`,
          leaveType: a.leave_type_name || `Type #${a.leave_type_id}`,
          policyName: a.policy_name || 'Manual',
          totalDays: a.total_days,
          carryForwardDays: a.carry_forward_days || 0,
          effectiveDate: a.effective_date,
          notes: a.notes || '',
          allocatedAt: a.created_at ? a.created_at.split('T')[0] : a.effective_date,
        }))
      );
    } catch (e) {
      console.error('Failed to load allocation data:', e);
    }
  };

  useEffect(() => { reloadData(); }, [token]);

  const handleAllocate = async () => {
    if (!selectedEmployee || !selectedLeaveType || totalDays <= 0 || !effectiveDate || !token) return;
    setSaving(true);
    try {
      await createLeaveAllocation(token, {
        user_id: Number(selectedEmployee),
        leave_type_id: Number(selectedLeaveType),
        policy_id: selectedPolicy ? Number(selectedPolicy) : undefined,
        total_days: totalDays,
        carry_forward_days: carryForwardDays,
        effective_date: effectiveDate,
        notes: notes || undefined,
      });
      showToast('Leave allocated successfully');
      await reloadData();
      setSelectedEmployee('');
      setSelectedLeaveType('');
      setSelectedPolicy('');
      setTotalDays(0);
      setCarryForwardDays(0);
      setEffectiveDate('');
      setNotes('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to allocate leave');
    } finally {
      setSaving(false);
    }
  };

  const removeAllocation = async (id: number) => {
    if (!token) return;
    try {
      await deleteLeaveAllocation(token, id);
      setAllocations((prev) => prev.filter((a) => a.id !== id));
      showToast('Allocation removed');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove allocation');
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
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Leave Allocation</h1>
            <p className="text-[13px] text-muted-foreground">Allocate leave days to employees</p>
          </div>
        </div>
        <Button variant="dark" size="sm"
          onClick={() => navigate('/hrms/leave/policy/new')}
          
        >
          <Plus size={14} /> Create Policy
        </Button>
      </motion.div>

      {/* Allocation Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-border bg-muted/50">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">New Allocation</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Select Employee *</label>
              <SearchableSelect
                value={selectedEmployee}
                onChange={setSelectedEmployee}
                options={employeeOptions}
                placeholder="Choose an employee"
              />
            </div>
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
          </div>
          <div>
            <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Select Leave Type *</label>
            <SearchableSelect
              value={selectedLeaveType}
              onChange={setSelectedLeaveType}
              options={leaveTypeOptions}
              placeholder="Choose a leave type"
              disabled={leaveTypeOptions.length === 0}
            />
            {leaveTypeOptions.length === 0 && (
              <p className="text-[11px] text-muted-foreground/70 mt-1">No leave types available. Create one first.</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Total Days *</label>
              <Input
                type="number"
                min={0}
                value={totalDays || ''}
                onChange={(e) => setTotalDays(Math.max(0, parseInt(e.target.value) || 0))}
                
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Carry Forward Days</label>
              <Input
                type="number"
                min={0}
                value={carryForwardDays || ''}
                onChange={(e) => setCarryForwardDays(Math.max(0, parseInt(e.target.value) || 0))}
                
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Effective Date *</label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="dark"
              type="button"
              onClick={handleAllocate}
              disabled={saving || !selectedEmployee || !selectedLeaveType || !selectedPolicy || totalDays <= 0 || !effectiveDate}
              
            >
              <Plus size={16} /> {saving ? 'Allocating...' : 'Allocate'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Allocations List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm">Allocated Leaves</h2>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{allocations.length} allocation{allocations.length !== 1 ? 's' : ''}</p>
        </div>

        {allocations.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No allocations yet" description="Allocate leave days to an employee using the form above." className="border-0" />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {['Employee', 'Leave Type', 'Policy', 'Total Days', 'Carry Forward', 'Effective Date', 'Allocated Date', ''].map((label) => (
                      <TableHead key={label || '__del'} className="uppercase whitespace-nowrap">
                        {label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((a, i) => (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b transition-colors hover:bg-muted/70"
                    >
                      <TableCell className="font-semibold text-foreground">{a.employeeName}</TableCell>
                      <TableCell className="text-muted-foreground">{a.leaveType}</TableCell>
                      <TableCell className="text-muted-foreground">{a.policyName}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-secondary text-[11px] font-semibold text-foreground/85">
                          {a.totalDays}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-accent text-[11px] font-semibold text-accent-foreground">
                          {a.carryForwardDays}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.effectiveDate}</TableCell>
                      <TableCell className="text-muted-foreground">{a.allocatedAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeAllocation(a.id)}
                          
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
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
                      <p className="text-xs font-semibold text-foreground">{a.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{a.leaveType} · {a.policyName}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeAllocation(a.id)}
                      
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Total: <span className="font-semibold text-foreground/85">{a.totalDays}</span></span>
                    <span>·</span>
                    <span>CF: <span className="font-semibold text-accent-foreground">{a.carryForwardDays}</span></span>
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
