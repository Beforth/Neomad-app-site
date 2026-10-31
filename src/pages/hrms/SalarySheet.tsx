import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '@/components/ui/input';
import { previewFormulas, type FormulaPreview, type StructureFields } from '../../lib/hrmsPayroll';

const inr = (n: number) => (Math.abs(n) < 0.005 ? 0 : n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Row {
  head: string;
  /** The formula, written as the salary sheet has it. */
  how: string;
  value: number | null;
  strong?: boolean;
}

const pick = (items: { label: string; amount: number }[] | undefined, start: string) =>
  items?.find((i) => i.label.toLowerCase().startsWith(start))?.amount ?? 0;

/**
 * The salary worked out column by column, in the order and with the names of the Excel
 * salary sheet (Muster roll cum wages register), for one sample month.
 */
export default function SalarySheet({ fields }: { fields: StructureFields }) {
  const { token } = useAuth();
  const [days, setDays] = useState('26');
  const [extra, setExtra] = useState('0');
  const [out, setOut] = useState<FormulaPreview | null>(null);
  const [problem, setProblem] = useState('');
  const [sampleCtc, setSampleCtc] = useState('25000');
  // With no CTC typed yet (a template), show the sheet on a sample one.
  const typed = Number(fields.ctc) || 0;
  const ctc = typed > 0 ? typed : Number(sampleCtc) || 0;

  useEffect(() => {
    if (!token || ctc <= 0) { setOut(null); return; }
    const timer = setTimeout(() => {
      previewFormulas(token, {
        formulas: fields.formulas,
        base: 'company',
        ctc,
        days: Number(days) || 0,
        bonus: Number(extra) || 0,
        fields,
      })
        .then((r) => { setOut(r); setProblem(''); })
        .catch((e) => { setOut(null); setProblem(e instanceof Error ? e.message : 'Could not work this out'); });
    }, 400);
    return () => clearTimeout(timer);
  }, [token, fields, ctc, days, extra]);

  const d = out?.detail;
  const basic = pick(out?.earnings, 'basic');
  const hra = pick(out?.earnings, 'hra');
  const conv = pick(out?.earnings, 'conv');
  const special = pick(out?.earnings, 'special');
  const bonus = pick(out?.earnings, 'bonus') || Number(extra) || 0;
  const pf = pick(out?.deductions, 'pf');
  const esic = pick(out?.deductions, 'esic');
  const pt = pick(out?.deductions, 'professional');
  const other = out ? out.total_deductions - pf - esic - pt : 0;
  const pfEr = out?.employer_pf ?? 0;
  const esicEr = out?.employer_esic ?? 0;
  const empContribution = out?.total_deductions ?? 0;
  const net = out?.net_pay ?? 0;
  const total = net + empContribution + pfEr + esicEr;

  const has = out !== null;
  const rows: Row[] = [
    { head: 'Rate Per Month / Day', how: 'CTC / (1 + Basic% x PF employer% + Basic% x ESIC employer%)', value: has ? d?.rate_per_month ?? 0 : null },
    { head: 'Earned CTE', how: 'Rate / 26 x Days worked', value: has ? d?.earned_ctc ?? 0 : null },
    { head: 'Basic Salary', how: 'Rate x Basic%', value: has ? d?.full_basic ?? 0 : null },
    { head: 'Earned Basic Salary', how: 'Basic Salary / 26 x Days worked', value: has ? basic : null },
    { head: 'Earned H.R.A.', how: 'Earned Basic x HRA%', value: has ? hra : null },
    { head: 'Conveyance allowns', how: 'Earned Basic x Conveyance%', value: has ? conv : null },
    { head: 'Special Allowance', how: 'Earned CTE - (Earned Basic + HRA + Conveyance)', value: has ? special : null },
    { head: 'EXTRA', how: 'Typed for the month', value: has ? bonus : null },
    { head: 'Gross Amount Payable', how: 'Earned Basic + HRA + Conveyance + Special + Extra', value: has ? out.gross : null, strong: true },
    { head: 'ESIC Wages', how: 'Larger of Earned Basic and half of Gross', value: has ? d?.esic_wages ?? 0 : null },
    { head: 'P.F. Employee', how: 'If Earned Basic > 15,000 then 1,800, else Earned Basic x 12%', value: has ? pf : null },
    { head: 'P.F. Employer', how: 'If Earned Basic > 15,000 then 1,950, else Earned Basic x 13%', value: has ? pfEr : null },
    { head: 'E.S.I.', how: 'If Basic Salary > 21,000 then 0, else ESIC Wages x 0.55%', value: has ? esic : null },
    { head: 'ESIC Employer', how: 'If Basic Salary > 21,000 then 0, else ESIC Wages x 3.25%', value: has ? esicEr : null },
    { head: 'P.T.', how: 'Professional tax from the rates above', value: has ? pt : null },
    { head: 'ADV. / Penalties / Mediclaim', how: 'Entered in the monthly payroll run', value: has ? other : null },
    { head: 'EMPLOYEE CONTRIBUTION', how: 'ADV + PF + ESI + PT + Penalties + Mediclaim', value: has ? empContribution : null, strong: true },
    { head: 'Employer Contribution', how: 'P.F. Employer + ESIC Employer', value: has ? pfEr + esicEr : null, strong: true },
    { head: 'TOTAL DEDUCTION', how: 'Employee Contribution + Employer Contribution', value: has ? empContribution + pfEr + esicEr : null },
    { head: 'Net Payable', how: 'Gross Amount Payable - Employee Contribution', value: has ? net : null, strong: true },
    { head: 'TOTAL', how: 'Net Payable + Total Deduction', value: has ? total : null },
  ];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Salary calculation</p>
          <p className="text-[11px] text-muted-foreground">Same columns and order as the salary sheet. Worked out for one sample month.</p>
        </div>
        <div className="flex gap-3">
          {typed <= 0 && (
            <div className="w-28">
              <label className="mb-1 block text-[11px] text-muted-foreground">Sample CTC (Rs)</label>
              <Input type="number" value={sampleCtc} onChange={(e) => setSampleCtc(e.target.value)} />
            </div>
          )}
          <div className="w-24">
            <label className="mb-1 block text-[11px] text-muted-foreground">Days worked</label>
            <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-[11px] text-muted-foreground">Extra (Rs)</label>
            <Input type="number" value={extra} onChange={(e) => setExtra(e.target.value)} />
          </div>
        </div>
      </div>
      {ctc <= 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Enter the CTC to see the calculation.</p>
      ) : problem ? (
        <p className="px-4 py-4 text-sm text-destructive">{problem}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 font-semibold">Column</th>
              <th className="px-2 py-2 font-semibold">How it is worked out</th>
              <th className="px-4 py-2 text-right font-semibold">Rs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.head} className={`border-t border-border ${r.strong ? 'bg-muted/30 font-semibold' : ''}`}>
                <td className="px-4 py-1.5 whitespace-nowrap">{r.head}</td>
                <td className="px-2 py-1.5 text-[12px] text-muted-foreground font-normal">{r.how}</td>
                <td className="px-4 py-1.5 text-right tabular-nums">{r.value === null ? '...' : inr(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
