import * as React from 'react';
import { Button } from './button';
import { CheckCircleIcon, XIcon } from './icons';
import { Input } from './input';
import { cn } from '@/lib/utils';

/**
 * Promo code field. `onApply` returns true (or resolves true) when the code is valid. Applied codes show as a removable chip.
 * Codes are upper-cased as you type.
 */
export function CouponInput({
  onApply,
  onRemove,
  applied,
  hint,
  className,
}: {
  onApply: (code: string) => boolean | Promise<boolean>;
  onRemove?: () => void;
  /** The code currently in effect, if any. Controlled by you. */
  applied?: string;
  /** Shown under the chip, e.g. "You save ₹250". */
  hint?: React.ReactNode;
  className?: string;
}) {
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    const ok = await onApply(code.trim());
    setBusy(false);
    if (ok) setCode('');
    else setError('That code is not valid.');
  };

  if (applied) {
    return (
      <div className={cn('grid gap-1', className)}>
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-[13px] text-success">
          <CheckCircleIcon className="size-4 shrink-0" />
          <span className="font-mono font-medium">{applied}</span> applied
          {onRemove && <button type="button" aria-label="Remove code" onClick={onRemove} className="ml-auto grid size-5 place-items-center rounded outline-none hover:bg-success/15 focus-visible:ring-2 focus-visible:ring-success/40"><XIcon className="size-3.5" /></button>}
        </div>
        {hint && <p className="px-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  }
  return (
    <form onSubmit={submit} className={cn('grid gap-1', className)}>
      <div className="flex gap-2">
        <Input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }} placeholder="Promo code" aria-label="Promo code" aria-invalid={!!error} className="font-mono uppercase placeholder:normal-case" />
        <Button type="submit" variant="outline" loading={busy} disabled={!code.trim()}>Apply</Button>
      </div>
      {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
    </form>
  );
}
