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

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-500',
  calculated: 'bg-amber-50 text-amber-600',
  approved: 'bg-blue-50 text-blue-600',
  paid: 'bg-emerald-50 text-emerald-600',
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
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
            <ChevronLeft size={14} />Back to History
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Printer size={14} />Print Payslip
          </button>
        </div>
        <PayslipView run={selected.run} entry={selected.entry} settings={settings} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-zinc-400 animate-pulse py-16 text-center">Loading payroll...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">My Payroll</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">{settings.companyName}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 shadow-sm">
          <Banknote size={14} className="text-zinc-400" />
          {user?.username || 'Employee'}
          {latest ? ` · ${ROLE_LABELS[latest.role] || latest.role}` : ''}
          {latest ? ` · ${latest.payModel === 'shift' ? 'Shift' : 'Monthly'}` : ''}
        </div>
      </motion.header>

      {cycles.length === 0 ? (
        <div className="print:hidden bg-white border border-zinc-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
            <Inbox size={24} className="text-zinc-300" />
          </div>
          <h2 className="text-sm font-bold text-zinc-900 mb-1">No payslips yet</h2>
          <p className="text-xs text-zinc-400 max-w-xs">Your payslips will appear here once a payroll run is generated for you.</p>
        </div>
      ) : (
        <>
          {activeCycle && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="print:hidden bg-gradient-to-r from-emerald-50 to-white border border-emerald-100 rounded-xl p-4 flex items-center gap-3 shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Hourglass size={18} className="text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-zinc-900 truncate">
                  {monthLabel(activeCycle.run.month)} — {STATUS_LABEL[activeCycle.entry.status] || activeCycle.entry.status}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {ACTIVE_MESSAGE[activeCycle.entry.status] || 'Being processed.'}
                </p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${STATUS_BADGE[activeCycle.entry.status]}`}>
                {STATUS_LABEL[activeCycle.entry.status] || activeCycle.entry.status}
              </span>
            </motion.div>
          )}

          <div className="print:hidden grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Banknote size={18} className="text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">
                  {latest ? formatINR(latest.netPay) : '—'}
                </p>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">Latest Net Pay</p>
              </div>
            </div>
            <div className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Banknote size={18} className="text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">
                  {latest ? formatINR(latest.gross) : '—'}
                </p>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">Latest Gross</p>
              </div>
            </div>
            <div className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                <Banknote size={18} className="text-rose-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">
                  {latest ? formatINR(latest.totalDeductions) : '—'}
                </p>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">Latest Deductions</p>
              </div>
            </div>
          </div>

          <div className="print:hidden">
            <h3 className="text-sm font-bold text-zinc-900 mb-3">My Payslips</h3>
            <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Period</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Gross</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Deductions</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Net Pay</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {cycles.map(({ run, entry }) => (
                      <motion.tr
                        key={`${run.id}-${entry.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => setSelected({ run, entry })}
                        className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-zinc-900">{monthLabel(run.month)}</td>
                        <td className="px-4 py-3 text-xs font-bold text-zinc-900">{formatINR(entry.gross)}</td>
                        <td className="px-4 py-3 text-xs text-rose-500">{formatINR(entry.totalDeductions)}</td>
                        <td className="px-4 py-3 text-xs font-extrabold text-emerald-600">{formatINR(entry.netPay)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[entry.status]}`}>
                            {STATUS_LABEL[entry.status] || entry.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{entry.paymentDate || '—'}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-zinc-100">
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
                        <p className="text-xs font-bold text-zinc-900">{monthLabel(run.month)}</p>
                        <p className="text-[10px] text-zinc-400">{entry.paymentDate ? `Paid ${entry.paymentDate}` : 'Not paid yet'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${STATUS_BADGE[entry.status]}`}>
                        {STATUS_LABEL[entry.status] || entry.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span className="text-zinc-900 font-bold">{formatINR(entry.gross)}</span>
                      <span>·</span>
                      <span className="text-rose-500">-{formatINR(entry.totalDeductions)}</span>
                      <span>·</span>
                      <span className="text-emerald-600 font-extrabold">{formatINR(entry.netPay)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
