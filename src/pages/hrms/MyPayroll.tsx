import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Banknote, ChevronLeft, Hourglass, Inbox, Printer,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/hrmsExpenses';
import {
  PayrollRun, PayEntry, PayrollSettings,
  getMyPayslips, getPayrollRun, getPayrollSettings, defaultSettings,
  monthLabel, ROLE_LABELS,
} from '../../lib/hrmsPayroll';
import PayslipView from '../../components/hrms/PayslipView';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/app-shell';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-secondary text-muted-foreground',
  calculated: 'bg-warning/10 text-warning',
  approved: 'bg-info/10 text-info',
  paid: 'bg-accent text-primary',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  calculated: 'Calculated',
  approved: 'Approved',
  paid: 'Paid',
};

const ACTIVE_MESSAGE: Record<string, string> = {
  draft: 'Your payslip for this cycle is being prepared.',
  calculated: 'Your salary is being calculated for this cycle.',
  approved: 'Approved — payout is pending.',
};

export default function MyPayroll() {
  const { user, token } = useAuth();
  const [selected, setSelected] = useState<{ run: PayrollRun; entry: PayEntry } | null>(null);
  const [cycles, setCycles] = useState<{ run: PayrollRun; entry: PayEntry }[]>([]);
  const [settings, setSettings] = useState<PayrollSettings>(defaultSettings());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setCycles([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [entries, settingsData] = await Promise.all([
          getMyPayslips(token),
          getPayrollSettings(token).catch(() => defaultSettings()),
        ]);
        const runIds = [...new Set(entries.map((e) => e.runId).filter(Boolean))] as number[];
        const runs = await Promise.all(
          runIds.map((id) => getPayrollRun(token, id).catch(() => null)),
        );
        const runById = new Map<number, PayrollRun>();
        runs.forEach((r) => { if (r) runById.set(r.id, r); });

        const mapped: { run: PayrollRun; entry: PayEntry }[] = [];
        for (const entry of entries) {
          const run = entry.runId ? runById.get(entry.runId) : undefined;
          if (!run) continue;
          mapped.push({ run, entry });
        }
        mapped.sort((a, b) => (a.run.month < b.run.month ? 1 : a.run.month > b.run.month ? -1 : 0));

        if (!cancelled) {
          setCycles(mapped);
          setSettings(settingsData);
        }
      } catch {
        if (!cancelled) setCycles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const latest = cycles[0]?.entry;
  const activeCycle = cycles.find((c) => c.entry.status !== 'paid') || null;

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="print:hidden flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)} >
            <ChevronLeft size={14} />Back to History
          </Button>
          <Button variant="dark" size="sm"
            onClick={() => window.print()}
            
          >
            <Printer size={14} />Print Payslip
          </Button>
        </div>
        <PayslipView run={selected.run} entry={selected.entry} settings={settings} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground/70 animate-pulse py-16 text-center">Loading payroll...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Payroll" description={settings.companyName} actions={<>
<Card className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-foreground/85" >
          <Banknote size={14} className="text-muted-foreground/70" />
          {user?.username || 'Employee'}
          {latest ? ` · ${ROLE_LABELS[latest.role] || latest.role}` : ''}
          {latest ? ` · ${latest.payModel === 'shift' ? 'Shift' : 'Monthly'}` : ''}
        </Card>
</>} />

      {cycles.length === 0 ? (
        <Card className="print:hidden p-10 flex flex-col items-center justify-center text-center" >
          <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-3">
            <Inbox size={24} className="text-muted-foreground/50" />
          </div>
          <h2 className="text-sm font-semibold text-foreground mb-1">No payslips yet</h2>
          <p className="text-xs text-muted-foreground/70 max-w-xs">Your payslips will appear here once a payroll run is generated for you.</p>
        </Card>
      ) : (
        <>
          {activeCycle && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="print:hidden bg-gradient-to-r from-primary to-white border border-primary/20 rounded-xl p-4 flex items-center gap-3 shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Hourglass size={18} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {monthLabel(activeCycle.run.month)} — {STATUS_LABEL[activeCycle.entry.status] || activeCycle.entry.status}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {ACTIVE_MESSAGE[activeCycle.entry.status] || 'Being processed.'}
                </p>
              </div>
              <Badge className={`shrink-0 ${STATUS_BADGE[activeCycle.entry.status]}`}>
                {STATUS_LABEL[activeCycle.entry.status] || activeCycle.entry.status}
              </Badge>
            </motion.div>
          )}

          <div className="print:hidden grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 flex items-center gap-3" >
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Banknote size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground leading-none truncate">
                  {latest ? formatINR(latest.netPay) : '—'}
                </p>
                <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">Latest Net Pay</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3" >
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <Banknote size={18} className="text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground leading-none truncate">
                  {latest ? formatINR(latest.gross) : '—'}
                </p>
                <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">Latest Gross</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3" >
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <Banknote size={18} className="text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground leading-none truncate">
                  {latest ? formatINR(latest.totalDeductions) : '—'}
                </p>
                <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">Latest Deductions</p>
              </div>
            </Card>
          </div>

          <div className="print:hidden">
            <h3 className="text-sm font-semibold text-foreground mb-3">My Payslips</h3>
            <Card className="overflow-hidden" >
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="uppercase whitespace-nowrap">Period</TableHead>
                      <TableHead className="uppercase whitespace-nowrap">Gross</TableHead>
                      <TableHead className="uppercase whitespace-nowrap">Deductions</TableHead>
                      <TableHead className="uppercase whitespace-nowrap">Net Pay</TableHead>
                      <TableHead className="uppercase whitespace-nowrap">Status</TableHead>
                      <TableHead className="uppercase whitespace-nowrap">Payment Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cycles.map(({ run, entry }) => (
                      <motion.tr
                        key={`${run.id}-${entry.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => setSelected({ run, entry })}
                        className="border-b transition-colors hover:bg-muted/70 cursor-pointer"
                      >
                        <TableCell className="whitespace-nowrap font-semibold text-foreground">{monthLabel(run.month)}</TableCell>
                        <TableCell className="font-semibold text-foreground">{formatINR(entry.gross)}</TableCell>
                        <TableCell className="text-destructive">{formatINR(entry.totalDeductions)}</TableCell>
                        <TableCell className="font-semibold text-primary">{formatINR(entry.netPay)}</TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_BADGE[entry.status]}`}>
                            {STATUS_LABEL[entry.status] || entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{entry.paymentDate || '—'}</TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden divide-y divide-border">
                {cycles.map(({ run, entry }) => (
                  <motion.div
                    key={`${run.id}-${entry.id}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelected({ run, entry })}
                    className="p-4 space-y-2 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{monthLabel(run.month)}</p>
                        <p className="text-[11px] text-muted-foreground/70">{entry.paymentDate ? `Paid ${entry.paymentDate}` : 'Not paid yet'}</p>
                      </div>
                      <Badge className={`shrink-0 ${STATUS_BADGE[entry.status]}`}>
                        {STATUS_LABEL[entry.status] || entry.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="text-foreground font-semibold">{formatINR(entry.gross)}</span>
                      <span>·</span>
                      <span className="text-destructive">-{formatINR(entry.totalDeductions)}</span>
                      <span>·</span>
                      <span className="text-primary font-semibold">{formatINR(entry.netPay)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
