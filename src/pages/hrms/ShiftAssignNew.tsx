import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, Users, Clock, AlertTriangle, X } from 'lucide-react';
import type { ShiftType } from '../../lib/api';
import SearchableSelect from '../../components/SearchableSelect';
import { getUsers, mapBackendRoleToFrontend } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  listShiftTypes,
  getShiftAssignment,
  createShiftAssignment,
  updateShiftAssignment,
  workingDaysInRange,
  checkShiftConflicts,
  replaceShiftAssignment,
  type ShiftAssignment,
} from '../../lib/hrmsShifts';

const inputClassName = "w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function ShiftAssignNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser, token } = useAuth();
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const editAllocId = searchParams.get('allocId') ? parseInt(searchParams.get('allocId')!, 10) : null;

  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    staff_id: '', shift_type_id: '', date_from: '', date_to: '',
  });

  // Conflict state
  const [conflicts, setConflicts] = useState<ShiftAssignment[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [replacing, setReplacing] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [staff, types] = await Promise.all([
          getUsers(token),
          listShiftTypes(token),
        ]);
        if (cancelled) return;
        setAllStaff(staff.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.email.split('@')[0],
          email: u.email,
          role: mapBackendRoleToFrontend(u.role_codes),
        })));
        setShiftTypes(types);

        if (editAllocId) {
          const assignment = await getShiftAssignment(token, editAllocId);
          if (cancelled) return;
          setForm({
            staff_id: String(assignment.staff_id),
            shift_type_id: String(assignment.shift_type_id),
            date_from: assignment.effective_from,
            date_to: assignment.effective_to || assignment.effective_from,
          });
        } else {
          const staffIdParam = searchParams.get('staffId');
          const shiftIdParam = searchParams.get('shiftId');
          const dateParam = searchParams.get('date');

          setForm({
            staff_id: staffIdParam || '',
            shift_type_id: shiftIdParam || '',
            date_from: dateParam || '',
            date_to: dateParam || '',
          });
        }
      } catch (e) {
        if (!cancelled) showToast(e instanceof Error ? e.message : 'Failed to load form data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, editAllocId, searchParams]);

  const doSave = async (payload: any, cancelIds?: number[]) => {
    if (!token) return;
    setSubmitting(true);
    try {
      if (editAllocId) {
        await updateShiftAssignment(token, editAllocId, payload);
      } else if (cancelIds && cancelIds.length > 0) {
        await replaceShiftAssignment(token, { ...payload, cancel_ids: cancelIds });
      } else {
        await createShiftAssignment(token, payload);
      }
      navigate('/hrms/shifts/assign');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save assignment');
    } finally {
      setSubmitting(false);
      setShowConflictModal(false);
      setReplacing(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!token || !canManage || submitting) return;

    const staffId = parseInt(form.staff_id, 10);
    const shiftId = parseInt(form.shift_type_id, 10);
    if (!staffId || !shiftId) { showToast('Please select employee and shift'); return; }
    if (!form.date_from) { showToast('Please select a date'); return; }

    const dateFrom = form.date_from;
    const dateTo = form.date_to || dateFrom;
    const working_days = workingDaysInRange(dateFrom, dateTo);

    const payload = {
      staff_id: staffId,
      shift_type_id: shiftId,
      location: 'Office',
      status: 'active',
      schedule_type: 'fixed',
      frequency_weeks: 1,
      working_days,
      effective_from: dateFrom,
      effective_to: dateTo,
      is_active: true,
    };

    // Check for conflicts before creating
    if (!editAllocId) {
      try {
        const result = await checkShiftConflicts(token, {
          staff_id: staffId,
          effective_from: dateFrom,
          effective_to: dateTo,
        });
        if (result.count > 0) {
          setConflicts(result.conflicts.map(c => ({
            id: c.id,
            staff_id: c.staff_id,
            staff_name: c.staff_name || '',
            shift_type_id: c.shift_type_id,
            shift_type_name: c.shift_type_name || '',
            location: c.location,
            status: c.status,
            schedule_type: c.schedule_type,
            frequency_weeks: c.frequency_weeks,
            working_days: c.working_days,
            effective_from: c.effective_from,
            effective_to: c.effective_to || null,
            is_active: c.is_active,
            created_at: c.created_at,
            updated_at: c.updated_at,
          } as ShiftAssignment)));
          setPendingPayload(payload);
          setShowConflictModal(true);
          setSubmitting(false);
          return;
        }
      } catch (err) {
        console.error('Conflict check failed:', err);
        showToast('Conflict check failed — proceeding with assignment');
      }
    }

    await doSave(payload);
  };

  const handleReplace = async () => {
    if (!pendingPayload) return;
    setReplacing(true);
    const cancelIds = conflicts.map(c => c.id);
    await doSave(pendingPayload, cancelIds);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/hrms/shifts/assign')}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{editAllocId ? 'Edit Allocation' : 'Assign Shift'}</h1>
            <p className="text-sm text-zinc-500 mt-1">Loading…</p>
          </div>
        </div>
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-12 text-center text-sm text-zinc-400">
          Loading assignment form…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/hrms/shifts/assign')}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{editAllocId ? 'Edit Allocation' : 'Assign Shift'}</h1>
          <p className="text-sm text-zinc-500 mt-1">{editAllocId ? 'Update an existing shift allocation' : 'Assign a shift type to an employee for specific dates'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-100">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2"><Users size={18} /> Employee & Shift</h3>
            <p className="text-xs text-zinc-400 mt-1">Select the employee and the shift type to assign</p>
          </div>
          <form onSubmit={handleSave}>
            <div className="p-5 space-y-5">
              <Field label="Employee">
                <SearchableSelect
                  value={form.staff_id}
                  onChange={v => setForm(f => ({ ...f, staff_id: v }))}
                  placeholder="Select employee..."
                  options={allStaff.map(s => ({ value: String(s.id), label: `${s.name} (${s.role})` }))}
                />
              </Field>
              <Field label="Shift Type">
                <SearchableSelect
                  value={form.shift_type_id}
                  onChange={v => setForm(f => ({ ...f, shift_type_id: v }))}
                  placeholder="Select shift..."
                  options={shiftTypes.filter(s => s.is_active).map(s => ({ value: String(s.id), label: `${s.name} (${s.start_time} - ${s.end_time})` }))}
                />
              </Field>
            </div>
          </form>
        </div>

        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-100">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2"><Clock size={18} /> Date Range</h3>
            <p className="text-xs text-zinc-400 mt-1">Set the date or date range for this allocation</p>
          </div>
          <form onSubmit={handleSave}>
            <div className="p-5 space-y-5">
              <Field label="Date From">
                <input type="date" required value={form.date_from}
                  onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))}
                  className={inputClassName} />
              </Field>
              <Field label="Date To" hint="Leave empty for single day">
                <input type="date" value={form.date_to}
                  onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))}
                  className={inputClassName} />
              </Field>
            </div>
          </form>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={() => navigate('/hrms/shifts/assign')}
          className="px-6 py-2.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-sm font-medium transition-colors">
          Cancel
        </button>
        <button onClick={() => handleSave()} disabled={!canManage || submitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <Save size={16} /> {submitting ? 'Saving…' : editAllocId ? 'Save Changes' : 'Assign'}
        </button>
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-zinc-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-medium">
          {toast}
        </div>
      )}

      {/* Conflict Warning Modal */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => { if (!replacing) { setShowConflictModal(false); setConflicts([]); setPendingPayload(null); } }}
          role="dialog" aria-modal="true">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-zinc-900">Shift Conflict Detected</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    This employee already has {conflicts.length} active shift assignment{conflicts.length !== 1 ? 's' : ''} overlapping the selected dates.
                  </p>
                </div>
                <button
                  onClick={() => { setShowConflictModal(false); setConflicts([]); setPendingPayload(null); }}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 max-h-60 overflow-y-auto">
              <div className="space-y-3">
                {conflicts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-900">{c.shift_type_name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {c.effective_from} {c.effective_to ? `— ${c.effective_to}` : '(open-ended)'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5 capitalize">{c.schedule_type?.replace('_', ' ')}</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      Will be cancelled
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 border-t border-zinc-100 bg-zinc-50/80 flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-400">
                The existing assignments will end on {pendingPayload?.effective_from || 'the start date'}.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowConflictModal(false); setConflicts([]); setPendingPayload(null); }}
                  disabled={replacing}
                  className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReplace}
                  disabled={replacing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors disabled:opacity-60"
                >
                  {replacing ? 'Replacing…' : `Replace & Assign (${conflicts.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
