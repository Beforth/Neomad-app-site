import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '@/components/ui/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportPayrollReportXlsx } from '../../lib/hrmsExports';
import {
  getPayrollRun, getPayrollSettings, monthLabel, updatePayrollEntry, workingDaysInMonth,
  type PayEntry, type PayLineItem, type PayrollRun,
} from '../../lib/hrmsPayroll';

const PAY_DAYS = 26;
const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sum = (items: PayLineItem[], ...prefixes: string[]) =>
  items.filter((i) => prefixes.some((p) => i.label.toLowerCase().startsWith(p))).reduce((s, i) => s + Number(i.amount || 0), 0);

type EditKey = 'days' | 'extra' | 'advance' | 'late' | 'penalty' | 'mediclaim';

/** A number box that saves when you leave it or press Enter, and only if the value changed. */
function Cell({ value, disabled, busy, onCommit, max }: {
  value: number; disabled: boolean; busy: boolean; max?: number; onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  if (disabled) return <span className="tabular-nums">{money(value)}</span>;
  const commit = () => {
    let v = Math.max(0, Number(text) || 0);
    if (max !== undefined) v = Math.min(max, v);
    setText(String(v));
    if (v !== value) onCommit(v);
  };
  return (
    <input
      type="number" min={0} max={max} step="any" value={text} disabled={busy}
      onChange={(e) => setText(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className="h-7 w-20 rounded border border-input bg-background px-1.5 text-right text-[13px] tabular-nums outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
    />
  );
}

export default function PayrollRegister() {
  const { token } = useAuth();
  const id = Number(useParams().id);
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [offDays, setOffDays] = useState<number[]>([6]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [excel, setExcel] = useState(false);

  useEffect(() => {
    if (!token) return;
    getPayrollSettings(token).then((s) => setOffDays(s.rules.weeklyOffDays)).catch(() => {});
    getPayrollRun(token, id).then(setRun).catch((e) => setError(e instanceof Error ? e.message : 'Could not load the run'));
  }, [token, id]);

  const wd = run ? workingDaysInMonth(run.month, offDays) : PAY_DAYS;
  const maxDays = Math.min(PAY_DAYS, wd);
  const locked = !run || (run.status !== 'draft' && run.status !== 'calculated');

  async function save(e: PayEntry, key: EditKey, v: number) {
    if (!token || !run) return;
    setBusyId(e.id); setError('');
    try {
      const body =
        key === 'days'
          ? e.payModel === 'shift'
            ? { presentDays: v, halfDays: 0 }
            : { presentDays: v, halfDays: 0 }
          : key === 'extra' ? { extraEarning: v }
          : key === 'penalty' ? { penaltyAmount: v }
          : key === 'advance' ? { advanceDeduction: v }
          : key === 'late' ? { latePenalty: v }
          : { mediclaimDeduction: v };
      const updated = await updatePayrollEntry(token, run.id, e.id, body);
      setRun((prev) => (prev ? { ...prev, entries: prev.entries.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)) } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusyId(null);
    }
  }

  const rows = useMemo(
    () => (run?.entries ?? []).map((e) => {
      const b = sum(e.earnings, 'basic', 'shift wages');
      const hra = sum(e.earnings, 'hra');
      const conv = sum(e.earnings, 'conveyance');
      const special = sum(e.earnings, 'special');
      const pf = sum(e.deductions, 'pf');
      const esic = sum(e.deductions, 'esic');
      const pt = sum(e.deductions, 'professional tax');
      const employer = e.employerTotalCost ?? (e.employerPf ?? 0) + (e.employerEsic ?? 0);
      return { e, b, hra, conv, special, pf, esic, pt, employer, pfEr: e.employerPf ?? 0, esicEr: e.employerEsic ?? 0 };
    }),
    [run],
  );

  const total = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);

  if (!run) return <div className="p-6 text-sm text-muted-foreground">{error ? <span className="text-destructive">{error}</span> : <><Spinner className="mr-2 inline-block" /> Loading…</>}</div>;

  const th = 'whitespace-nowrap text-right text-[11px] uppercase';
  const td = 'whitespace-nowrap text-right tabular-nums text-[13px]';
  /** Zero means "not set / not applicable" for the working columns. */
  const dash = (v?: number) => (v ? money(v) : '—');

  return (
    <div className="space-y-4">
      <Link to={`/hrms/payroll/run/${run.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft size={16} /> Payroll run</Link>
      <PageHeader
        title={`Payroll register, ${monthLabel(run.month)}`}
        description="Type days worked, extra, advance, late, penalty and mediclaim. Each row saves and recalculates when you leave the box."
        actions={
          <>
            <Badge className="capitalize">{run.status}</Badge>
            <Button variant="outline" size="sm" disabled={excel} onClick={async () => {
              setExcel(true);
              try { await exportPayrollReportXlsx(token!, run.month, 'muster-roll'); }
              catch (err) { setError(err instanceof Error ? err.message : 'Download failed'); }
              finally { setExcel(false); }
            }}><FileSpreadsheet size={14} />{excel ? 'Preparing…' : 'Download Excel'}</Button>
          </>
        }
      />
      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}
      {locked && <p className="text-[13px] text-amber-600">This run is {run.status}, so it is read only.</p>}
      {!locked && <p className="text-[12px] text-muted-foreground">Calculate the run first. Calculate again resets days, late and advance from attendance, but keeps Extra, Penalty and Mediclaim. Days worked is capped at {maxDays} for this month.</p>}

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-card text-[11px] uppercase">Employee</TableHead>
              <TableHead className={th}>Days worked</TableHead>
              <TableHead className="whitespace-nowrap text-left text-[11px] uppercase">Department</TableHead>
              <TableHead className="whitespace-nowrap text-left text-[11px] uppercase">UAN</TableHead>
              <TableHead className={th}>CTC</TableHead>
              <TableHead className={th}>Rate / month</TableHead>
              <TableHead className={th}>Earned CTE</TableHead>
              <TableHead className={th}>Basic (full month)</TableHead>
              <TableHead className={th}>ESIC wages</TableHead>
              <TableHead className={th}>Earned basic</TableHead>
              <TableHead className={th}>HRA</TableHead>
              <TableHead className={th}>Conveyance</TableHead>
              <TableHead className={th}>Special</TableHead>
              <TableHead className={th}>Extra</TableHead>
              <TableHead className={th}>Gross</TableHead>
              <TableHead className={th}>Advance</TableHead>
              <TableHead className={th}>Late</TableHead>
              <TableHead className={th}>PF emp</TableHead>
              <TableHead className={th}>PF empr</TableHead>
              <TableHead className={th}>ESIC emp</TableHead>
              <TableHead className={th}>ESIC empr</TableHead>
              <TableHead className={th}>PT</TableHead>
              <TableHead className={th}>Penalty</TableHead>
              <TableHead className={th}>Mediclaim</TableHead>
              <TableHead className={th}>Employee total</TableHead>
              <TableHead className={th}>Employer total</TableHead>
              <TableHead className={th}>Net payable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ e, b, hra, conv, special, pf, esic, pt, employer, pfEr, esicEr }) => {
              const busy = busyId === e.id;
              const cell = (key: EditKey, value: number, max?: number) => (
                <Cell value={value} max={max} disabled={locked} busy={busy} onCommit={(v) => save(e, key, v)} />
              );
              return (
                <TableRow key={e.id} className={e.onHold ? 'opacity-60' : undefined}>
                  <TableCell className="sticky left-0 z-10 bg-card">
                    <p className="whitespace-nowrap text-[13px] font-medium">{e.employeeName}</p>
                    <p className="text-[11px] text-muted-foreground">{e.employeeCode || '—'}{e.onHold ? ' · on hold' : ''}</p>
                    {e.calc?.formulaError && <p className="max-w-[16rem] text-[11px] text-destructive" role="alert">Formula problem, figures not updated: {e.calc.formulaError}</p>}
                  </TableCell>
                  <TableCell className={td}>{cell('days', e.paidDays ?? 0, maxDays)}</TableCell>
                  <TableCell className="whitespace-nowrap text-left text-[13px]">{e.departmentName || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-left text-[13px]">{e.uanNumber || '—'}</TableCell>
                  <TableCell className={td}>{dash(e.ctc)}</TableCell>
                  <TableCell className={td}>{dash(e.calc?.ratePerMonth)}</TableCell>
                  <TableCell className={td}>{dash(e.calc?.earnedCtc)}</TableCell>
                  <TableCell className={td}>{dash(e.calc?.fullBasic)}</TableCell>
                  <TableCell className={td}>{dash(e.calc?.esicWages)}</TableCell>
                  <TableCell className={td}>{money(b)}</TableCell>
                  <TableCell className={td}>{money(hra)}</TableCell>
                  <TableCell className={td}>{money(conv)}</TableCell>
                  <TableCell className={td}>{money(special)}</TableCell>
                  <TableCell className={td}>{cell('extra', e.extraEarning ?? 0)}</TableCell>
                  <TableCell className={`${td} font-medium`}>{money(e.gross)}</TableCell>
                  <TableCell className={td}>{cell('advance', e.advanceDeduction ?? 0)}</TableCell>
                  <TableCell className={td}>{cell('late', e.latePenalty)}</TableCell>
                  <TableCell className={td}>{money(pf)}</TableCell>
                  <TableCell className={td}>{money(pfEr)}</TableCell>
                  <TableCell className={td}>{money(esic)}</TableCell>
                  <TableCell className={td}>{money(esicEr)}</TableCell>
                  <TableCell className={td}>{money(pt)}</TableCell>
                  <TableCell className={td}>{cell('penalty', e.penaltyAmount ?? 0)}</TableCell>
                  <TableCell className={td}>{cell('mediclaim', e.mediclaimDeduction ?? 0)}</TableCell>
                  <TableCell className={td}>{money(e.totalDeductions)}</TableCell>
                  <TableCell className={td}>{money(employer)}</TableCell>
                  <TableCell className={`${td} font-semibold`}>{money(e.netPay)}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
              <TableCell className="sticky left-0 z-10 bg-muted">Total ({rows.length})</TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell className={td}>{money(total((r) => r.e.ctc ?? 0))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.calc?.ratePerMonth ?? 0))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.calc?.earnedCtc ?? 0))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.calc?.fullBasic ?? 0))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.calc?.esicWages ?? 0))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.b))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.hra))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.conv))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.special))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.extraEarning ?? 0))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.gross))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.advanceDeduction ?? 0))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.latePenalty))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.pf))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.pfEr))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.esic))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.esicEr))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.pt))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.penaltyAmount ?? 0))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.mediclaimDeduction ?? 0))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.totalDeductions))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.employer))}</TableCell>
              <TableCell className={td}>{money(total((r) => r.e.netPay))}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
