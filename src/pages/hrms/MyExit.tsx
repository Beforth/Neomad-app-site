import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '@/components/ui/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { myExits, statusVariant, submitResignation, withdrawResignation, type ExitRequest } from '../../lib/hrmsExit';

/** Employee view: hand in a resignation, see where it stands, withdraw it while pending. */
export default function MyExit() {
  const { token } = useAuth();
  const [rows, setRows] = useState<ExitRequest[] | null>(null);
  const [notice, setNotice] = useState('30');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    myExits(token).then(setRows).catch((e) => setError(e instanceof Error ? e.message : 'Could not load'));
  }, [token]);
  useEffect(load, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await fn(); load(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); } finally { setBusy(false); }
  }

  if (!rows) return <div className="p-6 text-sm text-muted-foreground"><Spinner className="mr-2 inline-block" /> Loading…</div>;
  const current = rows.find((r) => r.status === 'pending' || r.status === 'approved');

  return (
    <div className="space-y-5">
      <PageHeader title="Resignation" description="Hand in your notice and follow its progress." />
      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}

      {current ? (
        <Card className="grid gap-2 p-4 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your notice</h2>
            <Badge variant={statusVariant(current.status)} className="capitalize">{current.status === 'approved' ? 'Accepted' : current.status}</Badge>
          </div>
          <p>Handed in on {current.resignation_date}. Last working day: <strong>{current.last_working_day}</strong> ({current.notice_days} days notice).</p>
          {current.reason && <p className="text-muted-foreground">Reason: {current.reason}</p>}
          {current.decision_note && <p className="text-muted-foreground">HR note: {current.decision_note}</p>}
          {current.status === 'approved' && <p className="text-muted-foreground">Exit checklist: {current.checklist_done} of {current.checklist_total} done.</p>}
          {current.status === 'pending' && (
            <div><Button variant="outline" disabled={busy} onClick={() => act(() => withdrawResignation(token!, current.id))}>Withdraw</Button></div>
          )}
        </Card>
      ) : (
        <Card className="grid gap-3 p-4">
          <h2 className="text-sm font-semibold">Submit resignation</h2>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">Notice period (days)
            <Input type="number" min={0} className="w-[140px]" value={notice} onChange={(e) => setNotice(e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">Reason
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <p className="text-xs text-muted-foreground">HR will review it. They may change your last working day.</p>
          <div><Button disabled={busy} onClick={() => window.confirm('Submit your resignation?') && act(() => submitResignation(token!, { notice_days: Number(notice) || 0, reason }))}>Submit resignation</Button></div>
        </Card>
      )}

      {rows.filter((r) => r !== current).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Earlier</h2>
          {rows.filter((r) => r !== current).map((r) => (
            <Card key={r.id} className="flex items-center justify-between p-3 text-sm">
              <span>{r.resignation_date} · last day {r.last_working_day}</span>
              <Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
