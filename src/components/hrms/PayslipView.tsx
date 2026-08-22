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
      className="payslip-print-root bg-white border border-zinc-900 rounded-lg shadow-md overflow-hidden max-w-4xl mx-auto font-sans text-zinc-900 print:shadow-none print:border-black print:m-0"
    >
      {/* 1. Header Section */}
      <div className="bg-zinc-200 border-b border-zinc-900 p-4 text-center">
        <h1 className="text-xl sm:text-2xl font-black tracking-wide uppercase text-zinc-900">{companyName}</h1>
        <p className="text-[11px] sm:text-xs font-semibold text-zinc-700 mt-1 uppercase tracking-tight">{companyAddress}</p>
      </div>

      <div className="bg-zinc-100 border-b border-zinc-900 py-1.5 text-center">
        <h2 className="text-sm font-extrabold tracking-widest text-zinc-900 uppercase">SALARY SLIP</h2>
      </div>

      {/* 2. Employee Details Grid */}
      <div className="border-b border-zinc-900 divide-y divide-zinc-900 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-zinc-900">
          <div className="sm:col-span-1 bg-zinc-50 p-2 font-bold uppercase text-zinc-800 flex items-center">EMPLOYEE ID</div>
          <div className="sm:col-span-1 p-2 font-extrabold text-zinc-900 uppercase flex items-center">{empId}</div>
          <div className="sm:col-span-1 bg-zinc-50 p-2 font-bold uppercase text-zinc-800 flex items-center">DESIGNATION</div>
          <div className="sm:col-span-1 p-2 font-extrabold text-zinc-900 uppercase flex items-center">{ROLE_LABELS[entry.role] || entry.role || 'SALES EXECUTIVE'}</div>
          <div className="sm:col-span-1 bg-zinc-50 p-2 font-bold uppercase text-zinc-800 flex items-center">PF NO</div>
          <div className="sm:col-span-1 p-2 font-mono font-bold text-zinc-900 flex items-center truncate">{settings.pfNumber || '102221066730'}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-zinc-900">
          <div className="sm:col-span-1 bg-zinc-50 p-2 font-bold uppercase text-zinc-800 flex items-center">EMPLOYEE NAME</div>
          <div className="sm:col-span-1 p-2 font-extrabold text-zinc-900 uppercase flex items-center">{entry.employeeName}</div>
          <div className="sm:col-span-1 bg-zinc-50 p-2 font-bold uppercase text-zinc-800 flex items-center">MONTH & YEAR</div>
          <div className="sm:col-span-1 p-2 font-extrabold text-zinc-900 flex items-center">{monthLabel(run.month)}</div>
          <div className="sm:col-span-1 bg-zinc-50 p-2 font-bold uppercase text-zinc-800 flex items-center">ESIC NO</div>
          <div className="sm:col-span-1 p-2 font-mono font-bold text-zinc-900 flex items-center truncate">{settings.esicNumber || '3601720461'}</div>
        </div>
      </div>

      {/* 3. Salary Items Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-zinc-300 border-b border-zinc-900 font-extrabold text-zinc-900 uppercase">
              <th className="p-2.5 border-r border-zinc-900 w-1/4">EARNING</th>
              <th className="p-2.5 border-r border-zinc-900 text-right w-[14%]">Amount</th>
              <th className="p-2.5 border-r border-zinc-900 w-1/4">DEDUCTION</th>
              <th className="p-2.5 border-r border-zinc-900 text-right w-[14%]">Amount</th>
              <th className="p-2.5 border-r border-zinc-900 w-1/5">EMPLOYER CONTRIBUTION</th>
              <th className="p-2.5 text-right w-[13%]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 font-bold text-zinc-800">
            <tr>
              <td className="p-2 border-r border-zinc-900 uppercase">BASIC</td>
              <td className="p-2 border-r border-zinc-900 text-right">{basic.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900 uppercase">PF</td>
              <td className="p-2 border-r border-zinc-900 text-right">{pf.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900 uppercase">PF</td>
              <td className="p-2 text-right">{employerPf.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-zinc-900 uppercase">HRA</td>
              <td className="p-2 border-r border-zinc-900 text-right">{hra.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900 uppercase">ESIC</td>
              <td className="p-2 border-r border-zinc-900 text-right">{esic.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900 uppercase">ESIC</td>
              <td className="p-2 text-right">{employerEsic.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-zinc-900 uppercase">CONVEYANCE ALLOWANCE</td>
              <td className="p-2 border-r border-zinc-900 text-right">{conveyance.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900 uppercase">PT</td>
              <td className="p-2 border-r border-zinc-900 text-right">{pt.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900"></td>
              <td className="p-2 text-right"></td>
            </tr>
            <tr>
              <td className="p-2 border-r border-zinc-900 uppercase">SPECIAL ALLOWANCE</td>
              <td className="p-2 border-r border-zinc-900 text-right">{specialAllowance.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900 uppercase">ADVANCES</td>
              <td className="p-2 border-r border-zinc-900 text-right">{advances.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900"></td>
              <td className="p-2 text-right"></td>
            </tr>
            <tr>
              <td className="p-2 border-r border-zinc-900 uppercase">EXTRA</td>
              <td className="p-2 border-r border-zinc-900 text-right">{extra.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900 uppercase">PENALTY</td>
              <td className="p-2 border-r border-zinc-900 text-right">{penalty.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900"></td>
              <td className="p-2 text-right"></td>
            </tr>
            <tr>
              <td className="p-2 border-r border-zinc-900 uppercase">OTHERS</td>
              <td className="p-2 border-r border-zinc-900 text-right">{others.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900 uppercase">MEDICLAIM</td>
              <td className="p-2 border-r border-zinc-900 text-right">{mediclaim.toLocaleString('en-IN')}</td>
              <td className="p-2 border-r border-zinc-900"></td>
              <td className="p-2 text-right"></td>
            </tr>
            <tr className="bg-zinc-200 border-t border-b border-zinc-900 font-extrabold text-zinc-900">
              <td className="p-2.5 border-r border-zinc-900 uppercase">TOTAL SALARY</td>
              <td className="p-2.5 border-r border-zinc-900 text-right">{totalSalary.toLocaleString('en-IN')}</td>
              <td className="p-2.5 border-r border-zinc-900 uppercase">TOTAL DEDUCTION</td>
              <td className="p-2.5 border-r border-zinc-900 text-right">{totalDeduction.toLocaleString('en-IN')}</td>
              <td className="p-2.5 border-r border-zinc-900 uppercase">TOTAL EMPLOYER COST</td>
              <td className="p-2.5 text-right">{totalEmployerCost.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Net Salary Bar */}
      <div className="border-b border-zinc-900 bg-zinc-100 p-3 flex items-center justify-between font-black text-sm">
        <span className="uppercase tracking-wider text-zinc-900">NET SALARY</span>
        <div className="text-right">
          <span className="text-base sm:text-lg text-zinc-900">{formatINR(entry.netPay)}</span>
          <p className="text-[10px] font-semibold text-zinc-500 normal-case">{inWords(entry.netPay)}</p>
        </div>
      </div>

      {/* 5. Payment Details Banner (if paid) */}
      {paid && (
        <div className="border-b border-zinc-900 bg-emerald-50/70 p-3 flex items-center justify-between text-xs font-bold text-emerald-900">
          <span className="flex items-center gap-2">
            <Landmark size={15} className="text-emerald-700" />
            Paid via {PAYMENT_MODE_LABELS[entry.paymentMode] || 'Bank Transfer'} {entry.paymentDate ? `on ${entry.paymentDate}` : ''}
          </span>
          {entry.paymentRef && <span className="font-mono text-[11px] text-emerald-800">Ref: {entry.paymentRef}</span>}
        </div>
      )}

      {/* 6. Signature Footer */}
      <div className="p-8 grid grid-cols-2 gap-8 text-center pt-14">
        <div>
          <div className="border-t border-zinc-900 pt-2 font-extrabold uppercase text-xs text-zinc-900">
            EMPLOYEE SIGNATURE
          </div>
        </div>
        <div>
          <div className="border-t border-zinc-900 pt-2 font-extrabold uppercase text-xs text-zinc-900">
            EMPLOYER SIGNATURE
          </div>
        </div>
      </div>
    </motion.div>
  );
}
