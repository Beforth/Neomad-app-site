import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormulaHelp from './FormulaHelp';
import {
  countFormulas, getFormulaMeta, getPayrollSettings, previewFormulas,
  type FormulaLine, type FormulaMeta, type FormulaPreview, type FormulaSet, type PayrollSettings, type StructureFields,
} from '../../lib/hrmsPayroll';

const label = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1';
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RULE_LABELS: Record<string, string> = {
  pay_days: 'Pay days in a month',
  basic_percent: 'Basic % of the rate',
  hra_percent: 'HRA % of basic',
  conveyance_percent: 'Conveyance % of basic',
  pf_employer_percent: 'PF employer %',
  esic_employer_percent: 'ESIC employer %',
  pf_wage_cap: 'PF wage ceiling (₹)',
};

type Append = (name: string) => void;

/** One formula text box. Remembers itself as the place the name chips type into. */
function FormulaInput({
  value, onChange, placeholder, disabled, focusRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  focusRef: React.MutableRefObject<Append | null>;
}) {
  return (
    <Input
      className="font-mono text-[13px]"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => {
        focusRef.current = (name) => onChange(`${value}${value && !/[\s(+\-*/,<>=]$/.test(value) ? ' ' : ''}${name}`);
      }}
    />
  );
}

/**
 * Custom payroll formulas: replace a built-in line, add extra earning or deduction lines,
 * and (for templates and people) set their own values for the rules.
 * The sample at the bottom is worked out by the server, so it always matches payroll.
 */
export default function FormulaEditor({
  value, onChange, scope, fields, defaultOpen = false,
}: {
  value: FormulaSet;
  onChange: (next: FormulaSet) => void;
  /** company = the default for everyone; set = one template or one person, layered over the company default */
  scope: 'company' | 'set';
  fields?: StructureFields;
  /** Start expanded (used when the pay model is Custom formula). */
  defaultOpen?: boolean;
}) {
  const { token, user } = useAuth();
  const role = user?.role as string | undefined;
  const canEdit = role === 'admin' || role === 'super_admin';
  const [open, setOpen] = useState(defaultOpen);
  const [meta, setMeta] = useState<FormulaMeta | null>(null);
  const [company, setCompany] = useState<PayrollSettings | null>(null);
  const [showNames, setShowNames] = useState(false);
  const [sampleCtc, setSampleCtc] = useState('30000');
  const [sampleDays, setSampleDays] = useState('26');
  const [result, setResult] = useState<FormulaPreview | null>(null);
  const [problem, setProblem] = useState('');
  const focusRef = useRef<Append | null>(null);
  const count = countFormulas(value);

  useEffect(() => {
    if (!open || !token || meta) return;
    getFormulaMeta(token).then(setMeta).catch((e) => setProblem(e instanceof Error ? e.message : 'Could not load'));
    if (scope === 'set') getPayrollSettings(token).then(setCompany).catch(() => undefined);
  }, [open, token, meta, scope]);

  // Start the sample from the form's own CTC once, when it is opened.
  useEffect(() => {
    if (open && Number(fields?.ctc) > 0) setSampleCtc(String(Number(fields?.ctc)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !token) return;
    const timer = setTimeout(() => {
      previewFormulas(token, {
        formulas: value,
        base: scope === 'company' ? 'none' : 'company',
        ctc: Number(sampleCtc) || 0,
        days: Number(sampleDays) || 0,
        fields,
      })
        .then((r) => { setResult(r); setProblem(''); })
        .catch((e) => { setResult(null); setProblem(e instanceof Error ? e.message : 'Could not work this out'); });
    }, 600);
    return () => clearTimeout(timer);
  }, [open, token, value, scope, sampleCtc, sampleDays, fields]);

  const setOverride = (key: string, text: string) => {
    const next = { ...(value.overrides ?? {}) };
    if (text === '') delete next[key]; else next[key] = text;
    onChange({ ...value, overrides: next });
  };
  const setRule = (key: string, text: string) => {
    const next = { ...(value.rules ?? {}) };
    if (text === '') delete next[key]; else next[key] = key === 'esic_wages_rule' ? text : Number(text);
    onChange({ ...value, rules: next });
  };
  const setLines = (kind: 'extra_earnings' | 'extra_deductions', lines: FormulaLine[]) =>
    onChange({ ...value, [kind]: lines });

  const companyRule = (key: string): string => {
    const r = company?.rules;
    if (!r) return '';
    const map: Record<string, number> = {
      pay_days: r.payDays, basic_percent: r.basicPercent, hra_percent: r.hraPercent,
      conveyance_percent: r.conveyancePercent, pf_employer_percent: r.pfEmployerPercent,
      esic_employer_percent: r.esicEmployerPercent, pf_wage_cap: r.pfWageCap,
    };
    return String(map[key] ?? '');
  };

  const lineEditor = (kind: 'extra_earnings' | 'extra_deductions', title: string, hint: string) => {
    const lines = value[kind] ?? [];
    return (
      <div className="space-y-2">
        <div>
          <p className={label}>{title}</p>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:grid-cols-[10rem_7rem_1fr_auto] items-start">
            <Input value={line.label} disabled={!canEdit} placeholder="Name on the payslip" onChange={(e) => setLines(kind, lines.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))} />
            <Input value={line.key ?? ''} disabled={!canEdit} placeholder="Short name" className="font-mono text-[13px]" onChange={(e) => setLines(kind, lines.map((l, j) => (j === i ? { ...l, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') } : l)))} />
            <div className="col-span-3 sm:col-span-1 sm:order-none order-last">
              <FormulaInput focusRef={focusRef} disabled={!canEdit} placeholder="e.g. basic * 5%" value={line.formula} onChange={(v) => setLines(kind, lines.map((l, j) => (j === i ? { ...l, formula: v } : l)))} />
            </div>
            {canEdit && <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove line" onClick={() => setLines(kind, lines.filter((_, j) => j !== i))}><Trash2 /></Button>}
          </div>
        ))}
        {canEdit && <Button type="button" size="sm" variant="outline" onClick={() => setLines(kind, [...lines, { label: '', formula: '' }])}><Plus size={13} />Add a line</Button>}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <span>
          <span className="text-sm font-semibold">Custom formulas</span>
          {count > 0 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">{count} customised</span>}
          <span className="block text-[11px] text-muted-foreground">
            {scope === 'company'
              ? 'Change how any line is worked out, for everyone. Leave empty to use the built-in calculation.'
              : 'Change how a line is worked out for this one. Anything left empty uses the company default.'}
          </span>
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-border p-4">
          {!canEdit && <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Only an admin can change formulas. You can see what is set.</p>}

          <div className="space-y-3">
            <div>
              <p className={label}>Lines you can change</p>
              <p className="text-[11px] text-muted-foreground">Type a formula to replace a line. The grey text is how it is worked out now. Percent works: <code>basic * 12%</code>.</p>
            </div>
            {(meta?.lines ?? []).map((line) => {
              const custom = value.overrides?.[line.key];
              return (
                <div key={line.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[13px] font-medium">{line.label} <span className="font-mono text-[11px] text-muted-foreground">{line.key}</span></span>
                    {custom !== undefined && canEdit && (
                      <button type="button" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setOverride(line.key, '')}><RotateCcw size={11} />Use built-in</button>
                    )}
                  </div>
                  <FormulaInput focusRef={focusRef} disabled={!canEdit} value={custom ?? ''} placeholder={line.default} onChange={(v) => setOverride(line.key, v)} />
                </div>
              );
            })}
          </div>

          {scope === 'set' && (
            <div className="space-y-2">
              <div>
                <p className={label}>Values for this set</p>
                <p className="text-[11px] text-muted-foreground">For example a different PF ceiling. Empty uses the company value shown in grey.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {(meta?.rule_keys ?? []).filter((k) => RULE_LABELS[k]).map((k) => (
                  <div key={k}>
                    <label className="mb-1 block text-[11px] text-muted-foreground">{RULE_LABELS[k]}</label>
                    <Input type="number" disabled={!canEdit} value={value.rules?.[k] ?? ''} placeholder={companyRule(k)} onChange={(e) => setRule(k, e.target.value)} />
                  </div>
                ))}
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">ESIC wages</label>
                  <select
                    disabled={!canEdit}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={String(value.rules?.esic_wages_rule ?? '')}
                    onChange={(e) => setRule('esic_wages_rule', e.target.value)}
                  >
                    <option value="">Company default</option>
                    <option value="basic_or_half_gross">Larger of basic or half gross</option>
                    <option value="gross">Whole gross</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {lineEditor('extra_earnings', 'Extra earnings', 'Added to gross. Give a short name to use the result in later lines.')}
          {lineEditor('extra_deductions', 'Extra deductions', 'Taken off net pay after PF, ESIC and tax. They can use gross, PF and ESIC.')}

          <div>
            <button type="button" className="text-xs font-semibold text-primary" onClick={() => setShowNames((v) => !v)}>{showNames ? 'Hide' : 'Show'} the formula guide (names, IF, ROUND ...)</button>
            {showNames && meta && (
              <div className="mt-2 rounded-md bg-muted/50 p-3">
                <FormulaHelp meta={meta} onPick={(name) => focusRef.current?.(name)} />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className={label}>Try it</p>
            <div className="mb-3 flex gap-3">
              <div className="w-32"><label className="mb-1 block text-[11px] text-muted-foreground">Sample CTC</label><Input type="number" value={sampleCtc} onChange={(e) => setSampleCtc(e.target.value)} /></div>
              <div className="w-24"><label className="mb-1 block text-[11px] text-muted-foreground">Days worked</label><Input type="number" value={sampleDays} onChange={(e) => setSampleDays(e.target.value)} /></div>
            </div>
            {problem && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{problem}</p>}
            {result && !problem && (
              <div className="grid gap-4 text-[13px] sm:grid-cols-2">
                <div>
                  <p className="mb-1 font-semibold">Earnings</p>
                  {result.earnings.map((l) => <div key={l.label} className="flex justify-between"><span>{l.label}</span><span>{inr(l.amount)}</span></div>)}
                  <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold"><span>Gross</span><span>{inr(result.gross)}</span></div>
                </div>
                <div>
                  <p className="mb-1 font-semibold">Deductions</p>
                  {result.deductions.map((l) => <div key={l.label} className="flex justify-between"><span>{l.label}</span><span>{inr(l.amount)}</span></div>)}
                  <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold"><span>Net pay</span><span>{inr(result.net_pay)}</span></div>
                  <div className="mt-1 flex justify-between text-muted-foreground"><span>Employer PF + ESIC</span><span>{inr(result.employer_total_cost)}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
