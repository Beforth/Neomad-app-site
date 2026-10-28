import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { toast } from '@/components/ui/toast';
import { Input, fieldClass } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import FormulaEditor from './FormulaEditor';
import { useScreenShortcuts } from '@/lib/screenShortcuts';
import { countFormulas, listSalaryTemplates, saveSalaryTemplate, type SalaryTemplate, type StructureFields } from '../../lib/hrmsPayroll';

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
  templates = true,
}: {
  value: StructureFields;
  onChange: (next: StructureFields) => void;
  /** Show "start from a template" and "save as template". Off on the template page itself. */
  templates?: boolean;
}) {
  const { token } = useAuth();
  const [list, setList] = useState<SalaryTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!templates || !token) return;
    listSalaryTemplates(token).then(setList).catch(() => setList([]));
  }, [templates, token]);

  const saveAsTemplate = async () => {
    if (!token || !name.trim()) return;
    try {
      const made = await saveSalaryTemplate(token, null, name, '', value);
      setList((l) => [...l, made].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`Template "${made.name}" saved`);
      setSaving(false);
      setName('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the template');
    }
  };

  const set = <K extends keyof StructureFields>(key: K, v: StructureFields[K]) => onChange({ ...value, [key]: v });

  const choosePayModel = (v: string) => onChange(v === 'custom'
    ? { ...value, payModel: 'custom', basic: '0', hra: '0', conveyance: '0', specialAllowance: '0', overtimeRate: '0' }
    : { ...value, payModel: v === 'shift' ? 'shift' : 'monthly' });
  useScreenShortcuts('Salary form', [
    { keys: 'ctrl+alt+m', label: 'Pay model: Monthly salary', run: () => choosePayModel('monthly') },
    { keys: 'ctrl+alt+s', label: 'Pay model: Shift / Daily', run: () => choosePayModel('shift') },
    { keys: 'ctrl+alt+c', label: 'Pay model: Custom formula', run: () => choosePayModel('custom') },
  ]);

  return (
    <div className="space-y-5">
      {templates && (
        <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2.5">
          <Field title="Start from a template">
            <Combobox
              value=""
              onValueChange={(id) => {
                const tpl = list.find((x) => String(x.id) === id);
                if (tpl) onChange({ ...tpl.fields });
              }}
              placeholder={list.length ? 'Pick a template to fill the form' : 'No templates yet'}
              searchPlaceholder="Search templates..."
              emptyText="No template found."
              disabled={list.length === 0}
              options={list.map((x) => ({ value: String(x.id), label: x.name, description: x.description || undefined }))}
            />
          </Field>
          {saving ? (
            <div className="flex items-center gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" autoFocus />
              <Button type="button" size="sm" variant="dark" onClick={saveAsTemplate} disabled={!name.trim()}>Save</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setSaving(false); setName(''); }}>Cancel</Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => setSaving(true)}>Save this as a template</Button>
          )}
          <p className="text-[11px] text-muted-foreground">A template fills in the values and any custom formulas. Changing a template later does not change anyone already set up.</p>
        </div>
      )}
      <Field title="Pay Model">
        <Segmented
          className="w-fit"
          value={value.payModel}
          onValueChange={choosePayModel}
          options={[
            { value: 'monthly', label: <>Monthly Salary</> },
            { value: 'shift', label: <>Shift / Daily</> },
            { value: 'custom', label: <>Custom formula</> },
          ]}
        />
      </Field>

      {value.payModel !== 'shift' ? (
        <div className="space-y-4">
          <Field title="CTC (per month)">
            <Money prefix="₹" placeholder="e.g. 25000" value={value.ctc === '0' ? '' : value.ctc} onChange={(e) => onChange(value.payModel === 'custom' ? { ...value, ctc: e.target.value } : { ...value, ctc: e.target.value, basic: '0', hra: '0', conveyance: '0', specialAllowance: '0' })} />
          </Field>
          {value.payModel === 'custom' && (
            <p className="text-[11px] text-muted-foreground">
              Nothing is worked out from the CTC automatically. Write the earnings as formulas in Custom formulas below; the CTC is available there as <code>ctc</code>.
            </p>
          )}
          {value.payModel === 'monthly' && (<>
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
          </>)}
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
                {key === 'pfEnabled' && <Money prefix="%" className="w-28" value={value.pfPercent} onChange={(e) => set('pfPercent', e.target.value)} />}
                {key === 'esicEnabled' && (
                  <>
                    <Money prefix="%" className="w-28" value={value.esicPercent} onChange={(e) => set('esicPercent', e.target.value)} />
                    <Money prefix="₹" className="w-32" value={value.esicCap} onChange={(e) => set('esicCap', e.target.value)} />
                  </>
                )}
                {key === 'ptEnabled' && <Money prefix="₹" className="w-28" value={value.pt} onChange={(e) => set('pt', e.target.value)} />}
                {key === 'lwfEnabled' && (
                  <>
                    <Input type="number" placeholder="Employee ₹" className={`${fieldClass} w-24`} value={value.lwf} onChange={(e) => set('lwf', e.target.value)} />
                    <Input type="number" placeholder="Employer ₹" className={`${fieldClass} w-24`} value={value.lwfEmployer} onChange={(e) => set('lwfEmployer', e.target.value)} />
                  </>
                )}
                {key === 'tdsEnabled' && <Money prefix="₹" className="w-28" value={value.tds} onChange={(e) => set('tds', e.target.value)} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom formula is its own pay model. Monthly only shows the section when it already holds formulas, so they are never hidden. */}
      {(value.payModel === 'custom' || (value.payModel === 'monthly' && countFormulas(value.formulas) > 0)) && (
        <FormulaEditor scope="set" value={value.formulas} onChange={(formulas) => set('formulas', formulas)} fields={value} defaultOpen={value.payModel === 'custom'} />
      )}
    </div>
  );
}
