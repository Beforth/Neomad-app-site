import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { toast } from '@/components/ui/toast';
import { Input, fieldClass } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import FormulaEditor from './FormulaEditor';
import SalarySheet from './SalarySheet';
import { useScreenShortcuts } from '@/lib/screenShortcuts';
import { DEFAULT_RULES, countFormulas, listSalaryTemplates, saveSalaryTemplate, type SalaryTemplate, type StructureFields } from '../../lib/hrmsPayroll';

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
  // The template last picked, so the picker shows it instead of going back to empty.
  const [picked, setPicked] = useState('');
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    if (!templates || !token) return;
    listSalaryTemplates(token).then(setList).catch(() => setList([]));
  }, [templates, token]);

  const saveAsTemplate = async () => {
    if (!token || !name.trim()) return;
    try {
      const made = await saveSalaryTemplate(token, null, name, '', value);
      setList((l) => [...l, made].sort((a, b) => a.name.localeCompare(b.name)));
      setPicked(String(made.id));
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

  // Everywhere but the template page: just choose a template. How a template works is
  // declared (and checked) on the template page.
  if (templates) {
    const chosen = list.find((x) => String(x.id) === picked);
    return (
      <div className="space-y-4">
        <Field title="Salary template">
          <Combobox
            value={picked}
            onValueChange={(id) => {
              const tpl = list.find((x) => String(x.id) === id);
              if (!tpl) return;
              setPicked(id);
              // Keep a CTC already typed for this person; a template brings the rest.
              onChange({ ...tpl.fields, ctc: Number(value.ctc) > 0 ? value.ctc : tpl.fields.ctc });
            }}
            placeholder={list.length ? 'Choose the salary template' : 'No templates yet'}
            searchPlaceholder="Search templates..."
            emptyText="No template found."
            options={list.map((x) => ({ value: String(x.id), label: x.name, description: x.description || undefined }))}
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Can't find the one you need?{' '}
            <a className="font-semibold text-primary" href="/hrms/payroll/templates/new" target="_blank" rel="noreferrer">Create a new template</a>
            {' '}(opens in a new tab), then{' '}
            <button type="button" className="font-semibold text-primary" onClick={() => token && listSalaryTemplates(token).then(setList).catch(() => undefined)}>reload the list</button>.
          </p>
          {chosen && <p className="mt-1 text-[11px] text-muted-foreground">{chosen.description}</p>}
        </Field>
        {value.payModel === 'shift' ? (
          <div className="grid grid-cols-2 gap-4">
            <Field title="Shift Rate / day"><Input type="number" value={value.shiftRate} onChange={(e) => set('shiftRate', e.target.value)} /></Field>
            <Field title="Overtime Rate / hr"><Input type="number" value={value.overtimeRate} onChange={(e) => set('overtimeRate', e.target.value)} /></Field>
          </div>
        ) : (
          <Field title="CTC (per month)">
            <Money prefix="₹" placeholder="e.g. 25000" value={value.ctc === '0' ? '' : value.ctc} onChange={(e) => set('ctc', e.target.value)} />
          </Field>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Field title="Pay Model">
        <Segmented
          className="w-fit"
          value={value.payModel}
          onValueChange={choosePayModel}
          options={[
            { value: 'monthly', label: <>Monthly Salary</> },
            { value: 'shift', label: <>Shift / Daily</> },
            ...(value.payModel === 'custom' ? [{ value: 'custom', label: <>Custom formula</> }] : []),
          ]}
        />
      </Field>

      {value.payModel !== 'shift' ? (
        <div className="space-y-4">
          {value.payModel === 'custom' && (
            <p className="text-[11px] text-muted-foreground">
              Nothing is worked out from the CTC automatically. Write the earnings as formulas in Custom formulas below; the CTC is available there as <code>ctc</code>.
            </p>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rates</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">As in the salary sheet's rate row. Empty uses the company value shown in grey.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {([
                ['basic_percent', 'Basic % of rate', DEFAULT_RULES.basicPercent],
                ['hra_percent', 'HRA % of basic', DEFAULT_RULES.hraPercent],
                ['conveyance_percent', 'Conveyance % of basic', DEFAULT_RULES.conveyancePercent],
                ['pf_employer_percent', 'P.F. employer %', DEFAULT_RULES.pfEmployerPercent],
                ['esic_employer_percent', 'ESIC employer %', DEFAULT_RULES.esicEmployerPercent],
                ['pf_wage_cap', 'P.F. wage ceiling (Rs)', DEFAULT_RULES.pfWageCap],
              ] as const).map(([key, title, dflt]) => (
                <Field key={key} title={title}>
                  <Input
                    type="number"
                    placeholder={String(dflt)}
                    value={String(value.formulas.rules?.[key] ?? '')}
                    onChange={(e) => {
                      const rules = { ...(value.formulas.rules ?? {}) };
                      if (e.target.value === '') delete rules[key]; else rules[key] = Number(e.target.value);
                      set('formulas', { ...value.formulas, rules });
                    }}
                  />
                </Field>
              ))}
              <Field title="P.F. employee %"><Input type="number" value={value.pfPercent} onChange={(e) => set('pfPercent', e.target.value)} /></Field>
              <Field title="ESIC wages">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={String(value.formulas.rules?.esic_wages_rule ?? '')}
                  onChange={(e) => {
                    const rules = { ...(value.formulas.rules ?? {}) };
                    if (e.target.value === '') delete rules.esic_wages_rule; else rules.esic_wages_rule = e.target.value;
                    set('formulas', { ...value.formulas, rules });
                  }}
                >
                  <option value="">Company default</option>
                  <option value="basic_or_half_gross">Larger of basic or half gross</option>
                  <option value="gross">Whole gross</option>
                </select>
              </Field>
              <Field title="E.S.I. employee %"><Input type="number" value={value.esicPercent} onChange={(e) => set('esicPercent', e.target.value)} /></Field>
              <Field title="E.S.I. applies up to basic (Rs)"><Input type="number" value={value.esicCap} onChange={(e) => set('esicCap', e.target.value)} /></Field>
              <Field title="P.T. (Rs)"><Input type="number" value={value.pt} onChange={(e) => set('pt', e.target.value)} /></Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-5 text-sm">
              {([['pfEnabled', 'Deduct P.F.'], ['esicEnabled', 'Deduct E.S.I.'], ['ptEnabled', 'Deduct P.T.']] as const).map(([key, text]) => (
                <label key={key} className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={value[key]} onChange={(e) => set(key, e.target.checked)} />{text}
                </label>
              ))}
            </div>
          </div>
          <Field title="Overtime Rate / hr">
            <Input type="number" value={value.overtimeRate} onChange={(e) => set('overtimeRate', e.target.value)} />
          </Field>
          <SalarySheet fields={value} />
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

      {/* Rare per-person changes to a line. Hidden until asked for, unless the set already has some. */}
      {value.payModel !== 'shift' && (() => {
        const f = value.formulas;
        const has = value.payModel === 'custom' || Object.keys(f.overrides ?? {}).length + (f.extra_earnings?.length ?? 0) + (f.extra_deductions?.length ?? 0) > 0;
        if (!has && !advanced) {
          return <button type="button" className="text-xs font-semibold text-primary" onClick={() => setAdvanced(true)}>Change how a line is worked out for this person</button>;
        }
        return <FormulaEditor key={picked} scope="set" value={value.formulas} onChange={(formulas) => set('formulas', formulas)} fields={value} defaultOpen={value.payModel === 'custom' || has} />;
      })()}
    </div>
  );
}
