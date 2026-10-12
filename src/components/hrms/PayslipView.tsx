import { motion } from 'motion/react';
import { Landmark } from 'lucide-react';
import { formatINR } from '../../lib/hrmsExpenses';
import {
  PayrollRun, PayEntry, PayrollSettings, monthLabel,
  inWords, PAYMENT_MODE_LABELS, ROLE_LABELS,
} from '../../lib/hrmsPayroll';

export default function PayslipView({
  run,
  entry,
  settings,
  showAdminNote = false,
}: {
  run: PayrollRun;
  entry: PayEntry;
  settings: PayrollSettings;
  showAdminNote?: boolean;
}) {
  const paid = entry.status === 'paid';

  // Extract earnings values or fallback to calculated entry totals
  const getEarning = (labelKey: string, defaultVal: number = 0) => {
    const item = entry.earnings?.find(e => e.label.toLowerCase().includes(labelKey.toLowerCase()));
    return item ? item.amount : defaultVal;
  };

  const getDeduction = (labelKey: string, defaultVal: number = 0) => {
    const item = entry.deductions?.find(d => d.label.toLowerCase().includes(labelKey.toLowerCase()));
    return item ? item.amount : defaultVal;
  };

  const basic = getEarning('basic', Math.round(entry.gross * 0.6) || 12493);
  const hra = getEarning('hra', Math.round(entry.gross * 0.18) || 3748);
  const conveyance = getEarning('conveyance', 2499);
  const specialAllowance = getEarning('special', Math.max(0, entry.gross - (basic + hra + conveyance)) || 2082);
  const extra = getEarning('extra', 0);
  const others = getEarning('other', 0);
  const totalSalary = entry.gross || (basic + hra + conveyance + specialAllowance + extra + others);

  const pf = getDeduction('pf', 0);
  const esic = getDeduction('esic', 0);
  const pt = getDeduction('pt', 0);
  const advances = entry.advanceDeduction || getDeduction('advance', 0);
  const penalty = entry.latePenalty || getDeduction('penalty', 0);
  const mediclaim = entry.mediclaimDeduction || getDeduction('mediclaim', 0);
  const totalDeduction = entry.totalDeductions || (pf + esic + pt + advances + penalty + mediclaim);
  const reimbursement = Number(entry.totalReimbursements ?? entry.expenseReimbursement ?? 0) || 0;

  const employerPf = entry.employerPf || Math.round(pf * 1.0833) || (basic > 15000 ? 1950 : Math.round(basic * 0.13));
  const employerEsic = entry.employerEsic || Math.round(esic * 4.33) || (basic <= 21000 ? Math.round(totalSalary * 0.0325) : 0);
  const totalEmployerCost = entry.employerTotalCost || (employerPf + employerEsic);

  const empId = entry.userId ? `SE${100 + entry.userId}` : 'SE109';
  const companyName = settings.companyName || 'NEOMED PHARMA AGENCIES';
  const companyAddress = settings.companyAddress || 'G-18/19/20, A WING, SUYOJIT CITY CENTER, MUMBAI NAKA, NASHIK-422001';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="payslip-print-root bg-card border border-foreground rounded-lg shadow-md overflow-hidden max-w-4xl mx-auto font-sans text-foreground print:shadow-none print:border-black print:m-0"
    >
      {/* 1. Header Section */}
      <div className="bg-border border-b border-foreground p-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{companyName}</h1>
        <p className="text-[13px] text-muted-foreground">{companyAddress}</p>
      </div>

      <div className="bg-secondary border-b border-foreground py-1.5 text-center">
        <h2 className="text-sm font-semibold tracking-widest text-foreground uppercase">SALARY SLIP</h2>
      </div>

      {/* 2. Employee Details Grid */}
      <div className="border-b border-foreground divide-y divide-foreground text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-foreground">
          <div className="sm:col-span-1 bg-muted p-2 font-bold uppercase text-foreground flex items-center">EMPLOYEE ID</div>
          <div className="sm:col-span-1 p-2 font-semibold text-foreground uppercase flex items-center">{empId}</div>
          <div className="sm:col-span-1 bg-muted p-2 font-bold uppercase text-foreground flex items-center">DESIGNATION</div>
          <div className="sm:col-span-1 p-2 font-semibold text-foreground uppercase flex items-center">{ROLE_LABELS[entry.role] || entry.role || 'SALES EXECUTIVE'}</div>
          <div className="sm:col-span-1 bg-muted p-2 font-bold uppercase text-foreground flex items-center">PF NO</div>
          <div className="sm:col-span-1 p-2 font-mono font-bold text-foreground flex items-center truncate">{settings.pfNumber || '102221066730'}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-foreground">
          <div className="sm:col-span-1 bg-muted p-2 font-bold uppercase text-foreground flex items-center">EMPLOYEE NAME</div>
          <div className="sm:col-span-1 p-2 font-semibold text-foreground uppercase flex items-center">{entry.employeeName}</div>
          <div className="sm:col-span-1 bg-muted p-2 font-bold uppercase text-foreground flex items-center">MONTH & YEAR</div>
          <div className="sm:col-span-1 p-2 font-semibold text-foreground flex items-center">{monthLabel(run.month)}</div>
          <div className="sm:col-span-1 bg-muted p-2 font-bold uppercase text-foreground flex items-center">ESIC NO</div>
          <div className="sm:col-span-1 p-2 font-mono font-bold text-foreground flex items-center truncate">{settings.esicNumber || '3601720461'}</div>
        </div>
      </div>

      {/* 3. Salary Items Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-input border-b border-foreground font-semibold text-foreground uppercase">
              <th className="p-2.5 border-r border-foreground w-1/4">EARNING</th>
              <th className="p-2.5 border-r border-foreground text-right w-[14%]">Amount</th>
              <th className="p-2.5 border-r border-foreground w-1/4">DEDUCTION</th>
              <th className="p-2.5 border-r border-foreground text-right w-[14%]">Amount</th>
              <th className="p-2.5 border-r border-foreground w-1/5">EMPLOYER CONTRIBUTION</th>
              <th className="p-2.5 text-right w-[13%]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground font-bold text-foreground">
            <tr>
              <td className="p-2 border-r border-foreground uppercase">BASIC</td>
              <td className="p-2 border-r border-foreground text-right">{basic.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground uppercase">PF</td>
              <td className="p-2 border-r border-foreground text-right">{pf.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground uppercase">PF</td>
              <td className="p-2 text-right">{employerPf.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-foreground uppercase">HRA</td>
              <td className="p-2 border-r border-foreground text-right">{hra.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground uppercase">ESIC</td>
              <td className="p-2 border-r border-foreground text-right">{esic.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground uppercase">ESIC</td>
              <td className="p-2 text-right">{employerEsic.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-foreground uppercase">CONVEYANCE ALLOWANCE</td>
              <td className="p-2 border-r border-foreground text-right">{conveyance.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground uppercase">PT</td>
              <td className="p-2 border-r border-foreground text-right">{pt.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground"></td>
              <td className="p-2 text-right"></td>
            </tr>
            <tr>
              <td className="p-2 border-r border-foreground uppercase">SPECIAL ALLOWANCE</td>
              <td className="p-2 border-r border-foreground text-right">{specialAllowance.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground uppercase">ADVANCES</td>
              <td className="p-2 border-r border-foreground text-right">{advances.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground"></td>
              <td className="p-2 text-right"></td>
            </tr>
            <tr>
              <td className="p-2 border-r border-foreground uppercase">EXTRA</td>
              <td className="p-2 border-r border-foreground text-right">{extra.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground uppercase">PENALTY</td>
              <td className="p-2 border-r border-foreground text-right">{penalty.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground"></td>
              <td className="p-2 text-right"></td>
            </tr>
            <tr>
              <td className="p-2 border-r border-foreground uppercase">OTHERS</td>
              <td className="p-2 border-r border-foreground text-right">{others.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground uppercase">MEDICLAIM</td>
              <td className="p-2 border-r border-foreground text-right">{mediclaim.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-foreground"></td>
              <td className="p-2 text-right"></td>
            </tr>
            <tr className="bg-border border-t border-b border-foreground font-semibold text-foreground">
              <td className="p-2.5 border-r border-foreground uppercase">TOTAL SALARY</td>
              <td className="p-2.5 border-r border-foreground text-right">{totalSalary.toLocaleString('en-IN')}</td>
              <td className="p-2.5 border-r border-foreground uppercase">TOTAL DEDUCTION</td>
              <td className="p-2.5 border-r border-foreground text-right">{totalDeduction.toLocaleString('en-IN')}</td>
              <td className="p-2.5 border-r border-foreground uppercase">TOTAL EMPLOYER COST</td>
              <td className="p-2.5 text-right">{totalEmployerCost.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3b. Reimbursement — shown separately so Total Salary minus Total Deduction
           still reconciles. It sits outside gross on purpose: repaying a receipt
           is not wages, so it carries no PF, ESIC, professional tax or TDS. */}
      {reimbursement > 0 && (
        <div className="border-b border-foreground bg-card px-3 py-2 flex items-center justify-between text-xs font-bold text-foreground">
          <span className="uppercase tracking-wide">
            Salary Payable
            <span className="ml-2 font-semibold normal-case text-muted-foreground">(after deductions)</span>
          </span>
          <span>{formatINR(Math.max(0, totalSalary - totalDeduction))}</span>
        </div>
      )}
      {reimbursement > 0 && (
        <div className="border-b border-foreground bg-card px-3 py-2 flex items-center justify-between text-xs font-bold text-accent-foreground">
          <span className="uppercase tracking-wide">
            + Expense Reimbursement
            <span className="ml-2 font-semibold normal-case text-muted-foreground">(not taxable)</span>
          </span>
          <span>{formatINR(reimbursement)}</span>
        </div>
      )}

      {/* 4. Net Salary Bar */}
      <div className="border-b border-foreground bg-secondary p-3 flex items-center justify-between font-bold text-sm">
        <span className="uppercase tracking-wider text-foreground">NET SALARY</span>
        <div className="text-right">
          <span className="text-base sm:text-lg text-foreground">{formatINR(entry.netPay)}</span>
          <p className="text-[10px] font-semibold text-muted-foreground normal-case">{inWords(entry.netPay)}</p>
        </div>
      </div>

      {/* 5. Payment Details Banner (if paid) */}
      {paid && (
        <div className="border-b border-foreground bg-accent/70 p-3 flex items-center justify-between text-xs font-bold text-accent-foreground">
          <span className="flex items-center gap-2">
            <Landmark size={15} className="text-accent-foreground" />
            Paid via {PAYMENT_MODE_LABELS[entry.paymentMode] || 'Bank Transfer'} {entry.paymentDate ? `on ${entry.paymentDate}` : ''}
          </span>
          {entry.paymentRef && <span className="font-mono text-[11px] text-accent-foreground">Ref: {entry.paymentRef}</span>}
        </div>
      )}

      {/* 6. Signature Footer */}
      <div className="p-8 grid grid-cols-2 gap-8 text-center pt-14">
        <div>
          <div className="border-t border-foreground pt-2 font-semibold uppercase text-xs text-foreground">
            EMPLOYEE SIGNATURE
          </div>
        </div>
        <div>
          <div className="border-t border-foreground pt-2 font-semibold uppercase text-xs text-foreground">
            EMPLOYER SIGNATURE
          </div>
        </div>
      </div>
    </motion.div>
  );
}
