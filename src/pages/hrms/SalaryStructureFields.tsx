import { CheckCircle2 } from 'lucide-react';
import { Input, fieldClass } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import type { StructureFields } from '../../lib/hrmsPayroll';

const label = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1';

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={label}>{title}</label>
      {children}
    </div>
  );
}

function Money({ prefix, className, ...rest }: { prefix: string; className?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-foreground/85">{prefix}</span>
      <Input type="number" className={`${fieldClass} pl-8 ${className ?? ''}`} {...rest} />
    </div>
  );
}

/**
 * Pay model, CTC, monthly breakdown and deductions of a salary structure.
 * Used by the Payroll structure dialog and the staff form, so both stay the same.
 */
export default function SalaryStructureFields({
  value,
  onChange,
}: {
  value: StructureFields;
  onChange: (next: StructureFields) => void;
}) {
  const set = <K extends keyof StructureFields>(key: K, v: StructureFields[K]) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      <Field title="Pay Model">
        <Segmented
          className="w-fit"
          value={value.payModel}
          onValueChange={(v) => set('payModel', v === 'shift' ? 'shift' : 'monthly')}
          options={[
            { value: 'monthly', label: <>Monthly Salary</> },
            { value: 'shift', label: <>Shift / Daily</> },
          ]}
        />
      </Field>

      {value.payModel === 'monthly' ? (
        <div className="space-y-4">
          <Field title="CTC (per month)">
            <Money prefix="₹" placeholder="e.g. 25000" value={value.ctc === '0' ? '' : value.ctc} onChange={(e) => onChange({ ...value, ctc: e.target.value, basic: '0', hra: '0', conveyance: '0', specialAllowance: '0' })} />
          </Field>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Earnings</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
              Leave all four at 0 and they are worked out from the CTC using the payroll rules. Type amounts to set them by hand.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field title="Basic"><Input type="number" value={value.basic} onChange={(e) => set('basic', e.target.value)} /></Field>
              <Field title="HRA"><Input type="number" value={value.hra} onChange={(e) => set('hra', e.target.value)} /></Field>
              <Field title="Conveyance"><Input type="number" value={value.conveyance} onChange={(e) => set('conveyance', e.target.value)} /></Field>
              <Field title="Special Allowance"><Input type="number" value={value.specialAllowance} onChange={(e) => set('specialAllowance', e.target.value)} /></Field>
            </div>
          </div>
          <Field title="Overtime Rate / hr">
            <Input type="number" value={value.overtimeRate} onChange={(e) => set('overtimeRate', e.target.value)} />
          </Field>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shift Rates (₹)</p>
          <div className="grid grid-cols-2 gap-4">
            <Field title="Shift Rate / day"><Input type="number" value={value.shiftRate} onChange={(e) => set('shiftRate', e.target.value)} /></Field>
            <Field title="Overtime Rate / hr"><Input type="number" value={value.overtimeRate} onChange={(e) => set('overtimeRate', e.target.value)} /></Field>
          </div>
        </div>
      )}

      <div className="border-t border-border pt-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Deductions</p>
        <div className="space-y-3">
          {([
            { key: 'pfEnabled', label: 'Provident Fund (PF)' },
            { key: 'esicEnabled', label: 'ESIC' },
            { key: 'ptEnabled', label: 'Professional Tax (PT)' },
            { key: 'tdsEnabled', label: 'TDS (Income Tax)' },
            { key: 'lwfEnabled', label: 'Labour Welfare Fund (Jun, Dec)' },
          ] as const).map(({ key, label: text }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => set(key, !value[key])}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${value[key] ? 'bg-accent text-accent-foreground border-primary/20' : 'bg-muted text-muted-foreground/70 border-border'}`}
              >
                <CheckCircle2 size={11} />{text}
              </button>
              <div className="flex items-center gap-3">
                {key === 'pfEnabled' && <Money prefix="%" className="w-20" value={value.pfPercent} onChange={(e) => set('pfPercent', e.target.value)} />}
                {key === 'esicEnabled' && (
                  <>
                    <Money prefix="%" className="w-20" value={value.esicPercent} onChange={(e) => set('esicPercent', e.target.value)} />
                    <Money prefix="₹" className="w-24" value={value.esicCap} onChange={(e) => set('esicCap', e.target.value)} />
                  </>
                )}
                {key === 'ptEnabled' && <Money prefix="₹" className="w-20" value={value.pt} onChange={(e) => set('pt', e.target.value)} />}
                {key === 'lwfEnabled' && (
                  <>
                    <Input type="number" placeholder="Employee ₹" className={`${fieldClass} w-24`} value={value.lwf} onChange={(e) => set('lwf', e.target.value)} />
                    <Input type="number" placeholder="Employer ₹" className={`${fieldClass} w-24`} value={value.lwfEmployer} onChange={(e) => set('lwfEmployer', e.target.value)} />
                  </>
                )}
                {key === 'tdsEnabled' && <Money prefix="₹" className="w-20" value={value.tds} onChange={(e) => set('tds', e.target.value)} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
