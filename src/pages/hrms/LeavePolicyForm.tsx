import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Save, Plus, Trash2, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { listLeaveTypes, createLeavePolicy, getLeavePolicy, updateLeavePolicy, LeaveTypeOut } from '../../lib/hrmsLeave';
import { Button } from '@/components/ui/button';
import { Input, Textarea, fieldClass, selectClass } from '@/components/ui/input';

interface EntitlementItem {
  leaveTypeId: number;
  leaveTypeName: string;
  days: number;
  carryForward: boolean;
  maxContinuous: number;
  description: string;
}

const inputClass = fieldClass;

export default function LeavePolicyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useAuth();

  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [maxPaidLeaves, setMaxPaidLeaves] = useState<number | ''>('');
  const [maxUnpaidLeaves, setMaxUnpaidLeaves] = useState<number | ''>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [entitlements, setEntitlements] = useState<EntitlementItem[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [allTypes, setAllTypes] = useState<LeaveTypeOut[]>([]);
  const [expandedEntitlements, setExpandedEntitlements] = useState<Set<number>>(new Set());

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const toggleEntitlement = (index: number) => {
    setExpandedEntitlements((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const types = await listLeaveTypes(token);
        setAllTypes(types);

        if (id) {
          const pol = await getLeavePolicy(token, Number(id));
          setName(pol.name || '');
          setDescription(pol.description || '');
          setEffectiveDate(pol.effective_date || '');
          setMaxPaidLeaves(pol.max_paid_leaves ?? '');
          setMaxUnpaidLeaves(pol.max_unpaid_leaves ?? '');
          setStatus(pol.status as any || 'active');
          if (pol.entitlements) {
            setEntitlements(
              pol.entitlements.map((e) => ({
                leaveTypeId: e.leave_type_id,
                leaveTypeName: e.leave_type_name || `Type ${e.leave_type_id}`,
                days: e.days,
                carryForward: e.carry_forward,
                maxContinuous: e.max_continuous,
                description: e.description || '',
              }))
            );
          }
        }
      } catch (e) {
        console.error('Failed to load leave policy data:', e);
      }
    })();
  }, [token, id]);

  const leaveTypeOptions = allTypes.map((t) => ({ value: String(t.id), label: t.name }));

  const availableTypeOptions = leaveTypeOptions.filter(
    (o) => !entitlements.some((e) => String(e.leaveTypeId) === o.value)
  );

  const paidDaysCount = entitlements.reduce((sum, e) => {
    const t = allTypes.find((lt) => lt.id === e.leaveTypeId);
    return !t?.is_leave_without_pay ? sum + Number(e.days || 0) : sum;
  }, 0);

  const unpaidDaysCount = entitlements.reduce((sum, e) => {
    const t = allTypes.find((lt) => lt.id === e.leaveTypeId);
    return t?.is_leave_without_pay ? sum + Number(e.days || 0) : sum;
  }, 0);

  const handleAddEntitlement = () => {
    if (!selectedTypeId) return;
    const matched = allTypes.find((t) => String(t.id) === selectedTypeId);
    if (!matched) return;
    const newIndex = entitlements.length;
    setEntitlements((prev) => [
      ...prev,
      { leaveTypeId: matched.id, leaveTypeName: matched.name, days: matched.days_per_year || 0, carryForward: matched.carry_forward || false, maxContinuous: matched.max_consecutive_leaves || 0, description: '' },
    ]);
    setExpandedEntitlements((prev) => new Set(prev).add(newIndex));
    setSelectedTypeId('');
  };

  const updateEntitlement = (index: number, field: keyof EntitlementItem, value: any) => {
    setEntitlements((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeEntitlement = (index: number) => {
    setEntitlements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !effectiveDate || !token) return;
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        description: description || undefined,
        effective_date: effectiveDate,
        max_paid_leaves: maxPaidLeaves === '' ? 2 : Number(maxPaidLeaves),
        max_unpaid_leaves: maxUnpaidLeaves === '' ? 3 : Number(maxUnpaidLeaves),
        status,
        entitlements: entitlements.map((e) => ({
          leave_type_id: e.leaveTypeId,
          days: e.days,
          carry_forward: e.carryForward,
          max_continuous: e.maxContinuous,
          description: e.description,
        })),
      };

      if (id) {
        await updateLeavePolicy(token, Number(id), payload as any);
        navigate(`/hrms/leave/policy/${id}`);
      } else {
        const created = await createLeavePolicy(token, payload);
        navigate(`/hrms/leave/policy/${created.id}`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save leave policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Button variant="ghost" size="icon-sm"
          onClick={() => navigate('/hrms/leave/policy')}
          
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{isEdit ? 'Edit Leave Policy' : 'New Leave Policy'}</h1>
          <p className="text-[13px] text-muted-foreground">{isEdit ? 'Update company leave policy rules' : 'Create a new company leave policy'}</p>
        </div>
      </motion.div>

      <form onSubmit={handleSave}>
        {/* Card 1: Basic Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden mb-6"
        >
          <div className="px-5 py-3.5 border-b border-border bg-muted/50">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Basic Information</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Policy Name *</label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Leave Policy"
                
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this policy"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Effective Date</label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className={selectClass}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Max Paid Leaves Allowed (per month)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 2"
                  value={maxPaidLeaves}
                  onChange={(e) => setMaxPaidLeaves(e.target.value === '' ? '' : Number(e.target.value))}
                  
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Max Unpaid (LWP) Leaves Allowed (per month)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 3"
                  value={maxUnpaidLeaves}
                  onChange={(e) => setMaxUnpaidLeaves(e.target.value === '' ? '' : Number(e.target.value))}
                  
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Leave Entitlements */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden mb-6"
        >
          <div className="px-5 py-3.5 border-b border-border bg-muted/50 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Leave Entitlements</h2>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-semibold border border-primary/20">
                Paid: {paidDaysCount} Days
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground/85 text-xs font-semibold border border-border">
                Unpaid: {unpaidDaysCount} Days
              </span>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Add Leave Type</label>
                <SearchableSelect
                  value={selectedTypeId}
                  onChange={setSelectedTypeId}
                  options={availableTypeOptions}
                  placeholder="Select leave type"
                  disabled={availableTypeOptions.length === 0}
                />
              </div>
              <Button variant="dark" size="sm"
                type="button"
                onClick={handleAddEntitlement}
                disabled={!selectedTypeId}
                
              >
                <Plus size={14} /> Add
              </Button>
            </div>

            {entitlements.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground/70">
                No leave types added yet. Select a leave type and click Add.
              </div>
            ) : (
              <div className="space-y-3">
                {entitlements.map((ent, i) => (
                  <div
                    key={i}
                    className="border border-border rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => toggleEntitlement(i)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {expandedEntitlements.has(i) ? (
                          <ChevronDown size={14} className="text-muted-foreground/70 shrink-0" />
                        ) : (
                          <ChevronRight size={14} className="text-muted-foreground/70 shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-foreground truncate">{ent.leaveTypeName}</span>
                      </div>
                      <Button variant="ghost" size="icon-sm" className="shrink-0 hover:text-destructive hover:bg-destructive/10"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeEntitlement(i); }}
                        
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    {expandedEntitlements.has(i) && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-muted-foreground/70 font-medium mb-1">Days</label>
                            <Input
                              type="number"
                              min={0}
                              value={ent.days}
                              onChange={(e) => updateEntitlement(i, 'days', Math.max(0, parseInt(e.target.value) || 0))}
                              
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground/70 font-medium mb-1">Max Continuous</label>
                            <Input
                              type="number"
                              min={0}
                              value={ent.maxContinuous}
                              onChange={(e) => updateEntitlement(i, 'maxContinuous', Math.max(0, parseInt(e.target.value) || 0))}
                              
                            />
                          </div>
                          <div className="flex items-end pb-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${ent.carryForward ? 'bg-foreground' : 'border-2 border-input hover:border-muted-foreground'}`}>
                                <input
                                  type="checkbox"
                                  checked={ent.carryForward}
                                  onChange={() => updateEntitlement(i, 'carryForward', !ent.carryForward)}
                                  className="sr-only"
                                />
                                {ent.carryForward && (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 pointer-events-none">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </span>
                              <span className="text-sm text-foreground/85">Carry Forward</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground/70 font-medium mb-1">Description</label>
                          <Input
                            type="text"
                            value={ent.description}
                            onChange={(e) => updateEntitlement(i, 'description', e.target.value)}
                            placeholder="e.g. For medical reasons"
                            
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
          <Button variant="secondary" className="flex-1"
            type="button"
            onClick={() => navigate('/hrms/leave/policy')}
            
          >
            Cancel
          </Button>
          <Button variant="dark" className="flex-1"
            type="submit"
            disabled={saving || !name.trim()}
            
          >
            <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Update Policy' : 'Create Policy'}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
