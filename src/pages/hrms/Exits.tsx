import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '@/components/ui/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input, fieldClass } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getOrgChart, type OrgChartPerson } from '../../lib/hrmsStaff';
import {
  EXIT_TYPE_LABEL, listExits, startExit, statusVariant, type ExitRequest, type ExitType,
} from '../../lib/hrmsExit';

const FILTERS = [
  { value: '', label: <>All</> },
  { value: 'pending', label: <>Pending</> },
  { value: 'approved', label: <>In progress</> },
  { value: 'completed', label: <>Completed</> },
];

export default function Exits() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ExitRequest[] | null>(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setError('');
    listExits(token, filter || undefined)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load exits'));
  }, [token, filter]);
  useEffect(load, [load]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exits"
        description="Resignations and terminations, with the exit checklist and final settlement."
        actions={<Button onClick={() => setOpen(true)}><Plus /> Start exit</Button>}
      />
      <Segmented value={filter} onValueChange={setFilter} options={FILTERS} />
      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}
      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Last working day</TableHead>
              <TableHead className="text-right">Checklist</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!rows ? (
              <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="py-10 text-center text-muted-foreground"><Spinner className="mr-2 inline-block" /> Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No exits here.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/hrms/exits/${r.id}`)}>
                <TableCell>
                  <p className="font-medium">{r.employee_name}</p>
                  <p className="text-xs text-muted-foreground">{[r.designation, r.department].filter(Boolean).join(' · ')}</p>
                </TableCell>
                <TableCell>{EXIT_TYPE_LABEL[r.exit_type]}</TableCell>
                <TableCell>{r.last_working_day}</TableCell>
                <TableCell className="text-right tabular-nums">{r.checklist_done}/{r.checklist_total}</TableCell>
                <TableCell><Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {open && token && <StartDialog token={token} onClose={() => setOpen(false)} onDone={(id) => navigate(`/hrms/exits/${id}`)} />}
    </div>
  );
}

function StartDialog({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: (id: number) => void }) {
  const [people, setPeople] = useState<OrgChartPerson[]>([]);
  const [userId, setUserId] = useState('');
  const [type, setType] = useState<ExitType>('resignation');
  const [notice, setNotice] = useState('30');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { getOrgChart(token).then(setPeople).catch(() => setPeople([])); }, [token]);

  async function submit() {
    if (!userId) { setError('Pick an employee.'); return; }
    setBusy(true); setError('');
    try {
      const e = await startExit(token, { user_id: Number(userId), exit_type: type, notice_days: Number(notice) || 0, reason: reason.trim() || undefined });
      onDone(e.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the exit');
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Start an exit</DialogTitle>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">Employee
            <select className={fieldClass} value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select employee</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.designation ? ` · ${p.designation}` : ''}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">Type
            <select className={fieldClass} value={type} onChange={(e) => setType(e.target.value as ExitType)}>
              {(Object.keys(EXIT_TYPE_LABEL) as ExitType[]).map((t) => <option key={t} value={t}>{EXIT_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">Notice period (days)
            <Input type="number" min={0} value={notice} onChange={(e) => setNotice(e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">Reason
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">HR-started exits are approved straight away. You can change the last working day next.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>{busy ? 'Starting…' : 'Start exit'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
