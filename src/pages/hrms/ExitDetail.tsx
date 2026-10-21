import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '@/components/ui/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  EXIT_TYPE_LABEL, completeExit, decideExit, getExit, getSettlement, saveSettlement, statusVariant,
  toggleChecklist, type ExitRequest, type Settlement,
} from '../../lib/hrmsExit';

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ExitDetail() {
  const { token } = useAuth();
  const id = Number(useParams().id);
  const [exit, setExit] = useState<ExitRequest | null>(null);
  const [settle, setSettle] = useState<Settlement | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [lwd, setLwd] = useState('');
  const [earn, setEarn] = useState('0');
  const [ded, setDed] = useState('0');
  const [encash, setEncash] = useState('');
  const [sNote, setSNote] = useState('');

  const apply = useCallback((e: ExitRequest) => {
    setExit(e);
    setNote(e.decision_note ?? '');
    setLwd(e.last_working_day);
    setEarn(String(e.other_earnings || 0));
    setDed(String(e.other_deductions || 0));
    setEncash(e.leave_encashment_override === null ? '' : String(e.leave_encashment_override));
    setSNote(e.settlement_note ?? '');
  }, []);

  const loadSettlement = useCallback(() => {
    if (!token) return;
    getSettlement(token, id).then(setSettle).catch((e) => setError(e instanceof Error ? e.message : 'Could not load settlement'));
  }, [token, id]);

  useEffect(() => {
    if (!token) return;
    getExit(token, id)
      .then((e) => { apply(e); if (e.status === 'approved' || e.status === 'completed') loadSettlement(); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load this exit'));
  }, [token, id, apply, loadSettlement]);

  async function run(fn: () => Promise<ExitRequest | Settlement | void>, after?: (r: any) => void) {
    setBusy(true); setError('');
    try {
      const r = await fn();
      after?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (!exit) return <div className="p-6 text-sm text-muted-foreground">{error ? <span className="text-destructive">{error}</span> : <><Spinner className="mr-2 inline-block" /> Loading…</>}</div>;

  const t = token!;
  const decide = (status: 'approved' | 'rejected') =>
    run(() => decideExit(t, id, { status, decision_note: note, last_working_day: lwd }), (e) => { apply(e); if (status === 'approved') loadSettlement(); });
  const approved = exit.status === 'approved';
  const closed = approved || exit.status === 'completed';
  const pendingItems = exit.checklist_total - exit.checklist_done;

  return (
    <div className="space-y-5">
      <Link to="/hrms/exits" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft size={16} /> Exits</Link>
      <PageHeader
        title={exit.employee_name}
        description={[exit.designation, exit.department, exit.employee_code].filter(Boolean).join(' · ')}
        actions={<Badge variant={statusVariant(exit.status)} className="capitalize">{exit.status}</Badge>}
      />
      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}

      <Card className="grid gap-3 p-4 text-sm sm:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Type</p>{EXIT_TYPE_LABEL[exit.exit_type]}</div>
        <div><p className="text-xs text-muted-foreground">Resigned on</p>{exit.resignation_date}</div>
        <div><p className="text-xs text-muted-foreground">Notice</p>{exit.notice_days} days</div>
        <div><p className="text-xs text-muted-foreground">Last working day</p>{exit.last_working_day}</div>
        {exit.reason && <div className="sm:col-span-4"><p className="text-xs text-muted-foreground">Reason</p>{exit.reason}</div>}
      </Card>

      {(exit.status === 'pending' || approved) && (
        <Card className="grid gap-3 p-4">
          <h2 className="text-sm font-semibold">{exit.status === 'pending' ? 'Decision' : 'Dates and note'}</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Last working day
              <Input type="date" className="w-[170px]" value={lwd} onChange={(e) => setLwd(e.target.value)} />
            </label>
            <label className="grid flex-1 gap-1 text-xs font-medium text-muted-foreground">Note
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            {exit.status === 'pending' ? (
              <>
                <Button disabled={busy} onClick={() => decide('approved')}>Approve</Button>
                <Button variant="destructive" disabled={busy} onClick={() => decide('rejected')}>Reject</Button>
              </>
            ) : (
              <Button variant="outline" disabled={busy} onClick={() => run(() => decideExit(t, id, { last_working_day: lwd, decision_note: note }), (e) => { apply(e); loadSettlement(); })}>Save</Button>
            )}
          </div>
        </Card>
      )}

      {closed && (
        <Card className="grid gap-2 p-4">
          <h2 className="text-sm font-semibold">Exit checklist <span className="font-normal text-muted-foreground">({exit.checklist_done}/{exit.checklist_total})</span></h2>
          {exit.checklist.map((c) => (
            <label key={c.key} className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={c.done} disabled={busy || !approved} onCheckedChange={(v) => run(() => toggleChecklist(t, id, c.key, v === true), apply)} />
              <span className={c.done ? 'text-muted-foreground line-through' : ''}>{c.label}</span>
            </label>
          ))}
        </Card>
      )}

      {closed && settle && (
        <Card className="grid gap-3 p-4">
          <h2 className="text-sm font-semibold">Final settlement</h2>
          {settle.notes.map((n) => <p key={n} className="text-[13px] text-amber-600">{n}</p>)}
          <dl className="grid gap-1.5 text-sm">
            <Line label={`Salary for ${settle.month}`} value={settle.salary_due} />
            <Line label="Leave encashment" value={settle.leave_encashment} hint={settle.encashment_lines.map((l) => `${l.leave_type} ${l.days}d`).join(', ')} />
            <Line label="Other earnings" value={settle.other_earnings} />
            <Line label="Advances still owed" value={-settle.advance_outstanding} />
            <Line label="Other deductions" value={-settle.other_deductions} />
            <div className="mt-1 flex justify-between border-t pt-2 font-semibold"><dt>Net payable</dt><dd className="tabular-nums">{inr(settle.net_payable)}</dd></div>
          </dl>
          {approved && (
            <div className="grid gap-3 border-t pt-3 sm:grid-cols-4">
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">Other earnings
                <Input type="number" min={0} value={earn} onChange={(e) => setEarn(e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">Other deductions
                <Input type="number" min={0} value={ded} onChange={(e) => setDed(e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">Leave encashment (blank = calculated)
                <Input type="number" min={0} placeholder={String(settle.leave_encashment_calculated)} value={encash} onChange={(e) => setEncash(e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">Note
                <Input value={sNote} onChange={(e) => setSNote(e.target.value)} />
              </label>
              <div className="sm:col-span-4">
                <Button variant="outline" disabled={busy} onClick={() => run(
                  () => saveSettlement(t, id, { other_earnings: Number(earn) || 0, other_deductions: Number(ded) || 0, leave_encashment_override: encash === '' ? null : Number(encash), note: sNote }),
                  setSettle,
                )}>Save settlement</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {approved && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            Completing the exit switches off {exit.employee_name}'s account. They will not be able to log in.
            {pendingItems > 0 && <span className="text-amber-600"> {pendingItems} checklist item(s) are still open.</span>}
          </p>
          <Button variant="destructive" disabled={busy} onClick={() => {
            if (window.confirm(`Complete the exit and switch off ${exit.employee_name}'s account?`)) run(() => completeExit(t, id), apply);
          }}>Complete exit</Button>
        </Card>
      )}
    </div>
  );
}

function Line({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}{hint && <span className="ml-1 text-xs">({hint})</span>}</dt>
      <dd className="tabular-nums">{value < 0 ? `− ${inr(-value)}` : inr(value)}</dd>
    </div>
  );
}
