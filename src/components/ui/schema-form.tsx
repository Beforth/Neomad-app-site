import * as React from 'react';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Input, Textarea } from './input';
import { Field } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Stepper } from './stepper';
import { cn } from '@/lib/utils';

export type FormValues = Record<string, string | boolean>;

export interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'tel' | 'date' | 'textarea' | 'select' | 'checkbox';
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  /** Return an error message, or nothing when the value is fine. Runs on top of required and email checks. */
  validate?: (value: string | boolean, all: FormValues) => string | undefined;
  /** Half width on wide screens. */
  half?: boolean;
}

export interface FormStep {
  title: string;
  description?: string;
  fields: FormField[];
}

const check = (f: FormField, v: string | boolean | undefined, all: FormValues) => {
  const empty = v === undefined || v === '' || v === false;
  if (f.required && empty) return f.type === 'checkbox' ? 'Please tick this box.' : `${f.label} is required.`;
  if (typeof v === 'string' && v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
  return f.validate?.(v ?? '', all);
};

/**
 * Builds a form from a description. Pass `steps` (one step = single form, several = wizard with a stepper, Back and Next).
 * Each step validates before moving on; `onSubmit` gets all values at the end. Add your own rules per field with `validate`.
 */
export function SchemaForm({
  steps,
  onSubmit,
  initial = {},
  submitLabel = 'Submit',
  className,
}: {
  steps: FormStep[];
  onSubmit: (values: FormValues) => void | Promise<void>;
  initial?: FormValues;
  submitLabel?: string;
  className?: string;
}) {
  const [step, setStep] = React.useState(0);
  const [values, setValues] = React.useState<FormValues>(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const cur = steps[step];
  const last = step === steps.length - 1;
  const set = (name: string, v: string | boolean) => { setValues((x) => ({ ...x, [name]: v })); setErrors((e) => { const { [name]: _, ...rest } = e; return rest; }); };

  const validateStep = () => {
    const next: Record<string, string> = {};
    for (const f of cur.fields) { const m = check(f, values[f.name], values); if (m) next[f.name] = m; }
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    if (!last) return setStep(step + 1);
    setBusy(true);
    try { await onSubmit(values); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={go} noValidate className={cn('grid w-full max-w-xl gap-6', className)}>
      {steps.length > 1 && <Stepper steps={steps.map(({ title, description }) => ({ title, description }))} current={step} />}
      <div className="grid gap-1">
        {steps.length > 1 && <h3 className="text-base font-semibold">{cur.title}</h3>}
        {cur.description && <p className="text-[13px] text-muted-foreground">{cur.description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cur.fields.map((f) => {
          const id = `f-${f.name}`;
          const v = values[f.name];
          const err = errors[f.name];
          const span = f.half ? '' : 'sm:col-span-2';
          if (f.type === 'checkbox') {
            return (
              <div key={f.name} className={cn('grid gap-1', span)}>
                <label className="flex items-center gap-2 text-sm"><Checkbox id={id} checked={v === true} onCheckedChange={(c) => set(f.name, c === true)} />{f.label}</label>
                {(err || f.hint) && <p className={cn('text-xs', err ? 'text-destructive' : 'text-muted-foreground')}>{err || f.hint}</p>}
              </div>
            );
          }
          return (
            <Field key={f.name} className={span} label={f.label} htmlFor={id} required={f.required} hint={f.hint} error={err}>
              {f.type === 'textarea' ? (
                <Textarea id={id} rows={3} value={(v as string) ?? ''} placeholder={f.placeholder} aria-invalid={!!err} onChange={(e) => set(f.name, e.target.value)} />
              ) : f.type === 'select' ? (
                <Select value={(v as string) || undefined} onValueChange={(x) => set(f.name, x)}>
                  <SelectTrigger id={id} aria-invalid={!!err}><SelectValue placeholder={f.placeholder ?? 'Select'} /></SelectTrigger>
                  <SelectContent>{f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input id={id} type={f.type ?? 'text'} value={(v as string) ?? ''} placeholder={f.placeholder} aria-invalid={!!err} onChange={(e) => set(f.name, e.target.value)} />
              )}
            </Field>
          );
        })}
      </div>
      <div className="flex justify-between gap-2">
        {step > 0 ? <Button type="button" variant="outline" onClick={() => { setErrors({}); setStep(step - 1); }}>Back</Button> : <span />}
        <Button type="submit" loading={busy}>{last ? submitLabel : 'Next'}</Button>
      </div>
    </form>
  );
}
