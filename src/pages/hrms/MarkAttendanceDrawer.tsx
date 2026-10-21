import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { deleteAttendanceRecord, markAttendanceRecord } from '@/lib/hrmsApi';
import { approveLeaveRequest, createLeaveRequest, listLeaveTypes, type LeaveTypeOut } from '@/lib/hrmsLeave';

/** One row of the daily attendance report, as the server describes it. */
export interface MarkTarget {
  userId: number;
  name: string;
  date: string;
  recordId: number | null;
  recordStatus: string | null;
  checkIn: string | null;
  checkOut: string | null;
}

type Choice = 'present' | 'late' | 'half_day' | 'overtime' | 'absent' | 'leave';

const CHOICES: { value: Choice; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half day' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'On leave' },
];

const label = 'mb-1 block text-xs font-medium text-muted-foreground';

/** Right-hand panel to set one person's attendance for one day. */
export default function MarkAttendanceDrawer({
  target,
  token,
  onClose,
  onSaved,
}: {
  target: MarkTarget;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [choice, setChoice] = useState<Choice>(
    (['present', 'late', 'half_day', 'overtime', 'absent'] as const).find((c) => c === target.recordStatus) ?? 'present',
  );
  const [checkIn, setCheckIn] = useState(target.checkIn ?? '');
  const [checkOut, setCheckOut] = useState(target.checkOut ?? '');
  const [otHours, setOtHours] = useState('');
  const [paid, setPaid] = useState(true);
  const [typeId, setTypeId] = useState('');
  const [reason, setReason] = useState('');
  const [types, setTypes] = useState<LeaveTypeOut[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listLeaveTypes(token, 'active').then(setTypes).catch(() => setTypes([]));
  }, [token]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const paidTypes = types.filter((t) => !t.is_leave_without_pay);
  const unpaidType = types.find((t) => t.is_leave_without_pay);
  const leaveTypeId = paid ? Number(typeId || paidTypes[0]?.id || 0) : unpaidType?.id ?? 0;
  const showTimes = choice !== 'absent' && choice !== 'leave';

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      if (choice === 'leave') {
        if (!leaveTypeId) throw new Error(paid ? 'No paid leave type is set up.' : 'No unpaid leave type is set up.');
        // A leftover "absent" row would count as a loss-of-pay day on top of the leave.
        if (target.recordId && target.recordStatus === 'absent') await deleteAttendanceRecord(token, target.recordId);
        const req = await createLeaveRequest(token, {
          user_id: target.userId,
          leave_type_id: leaveTypeId,
          start_date: target.date,
          end_date: target.date,
          reason: reason.trim() || 'Marked from the daily attendance report',
          is_informed: true,
          is_emergency: paid, // admin's choice, so the monthly paid cap does not turn it unpaid
        });
        const done = await approveLeaveRequest(token, req.id, 'Marked from the daily attendance report', paid);
        toast.success(`${target.name} marked on leave`, `${done.paid_days ?? 0} paid, ${done.lwp_days ?? 0} unpaid`);
      } else {
        await markAttendanceRecord(token, target.userId, target.date, {
          status: choice,
          check_in: showTimes ? checkIn || null : null,
          check_out: showTimes ? checkOut || null : null,
          overtime_hours: choice === 'overtime' && otHours !== '' ? Number(otHours) : undefined,
        });
        toast.success(`${target.name} marked ${CHOICES.find((c) => c.value === choice)!.label.toLowerCase()}`);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-label="Mark attendance" className="relative flex h-full w-full max-w-md flex-col bg-card shadow-xl">
        <header className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Mark attendance</h2>
            <p className="text-[13px] text-muted-foreground">{target.name} · {new Date(`${target.date}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X /></Button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <span className={label}>Mark as</span>
            <div className="flex flex-wrap gap-2">
              {CHOICES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setChoice(c.value)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${choice === c.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {showTimes && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Check in</label><Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></div>
              <div><label className={label}>Check out</label><Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div>
              <p className="col-span-2 text-[11px] text-muted-foreground">Leave the times empty to mark the status only.</p>
            </div>
          )}

          {choice === 'overtime' && (
            <div>
              <label className={label}>Overtime (hours)</label>
              <Input type="number" min="0" max="24" step="0.25" placeholder="e.g. 2.5" value={otHours} onChange={(e) => setOtHours(e.target.value)} />
              <p className="mt-1 text-[11px] text-muted-foreground">Enter the overtime directly. Leave empty to work it out from the check-out time and shift.</p>
            </div>
          )}

          {choice === 'absent' && (
            <p className="text-[13px] text-muted-foreground">Counts as a loss-of-pay day when payroll is calculated.</p>
          )}

          {choice === 'leave' && (
            <div className="space-y-4">
              <div>
                <span className={label}>Leave is</span>
                <div className="grid grid-cols-2 gap-2">
                  {[true, false].map((p) => (
                    <button
                      key={String(p)}
                      type="button"
                      onClick={() => setPaid(p)}
                      className={`rounded-md border px-3 py-2 text-[13px] font-medium ${paid === p ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted'}`}
                    >
                      {p ? 'Paid' : 'Unpaid'}
                    </button>
                  ))}
                </div>
              </div>
              {paid ? (
                <div>
                  <label className={label}>Leave type</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={typeId || String(paidTypes[0]?.id ?? '')}
                    onChange={(e) => setTypeId(e.target.value)}
                  >
                    {paidTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <p className="mt-1 text-[11px] text-muted-foreground">Taken from the leave balance. Any part the policy cannot cover is recorded as unpaid.</p>
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">Recorded as {unpaidType?.name ?? 'leave without pay'}. Salary for the day is deducted.</p>
              )}
              <div><label className={label}>Reason (optional)</label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            </div>
          )}

          {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="dark" onClick={save} disabled={busy}>{busy && <Spinner className="mr-1" />}Save</Button>
        </footer>
      </aside>
    </div>
  );
}
