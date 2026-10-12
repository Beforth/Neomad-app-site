import * as React from 'react';
import { CheckIcon } from './icons';
import { cn } from '@/lib/utils';

const DEFAULT = ['#2563eb', '#7c3aed', '#db2777', '#e11d48', '#ea580c', '#d97706', '#059669', '#0891b2', '#475569', '#0f172a'];

/** Swatches plus a hex field and the browser's native picker. Value is always a 6-digit hex string. */
export function ColorPicker({
  value,
  onValueChange,
  swatches = DEFAULT,
  className,
}: {
  value: string;
  onValueChange: (hex: string) => void;
  swatches?: string[];
  className?: string;
}) {
  const [text, setText] = React.useState(value);
  React.useEffect(() => setText(value), [value]);
  const commit = (v: string) => {
    const hex = v.startsWith('#') ? v : `#${v}`;
    if (/^#[0-9a-f]{6}$/i.test(hex)) onValueChange(hex.toLowerCase());
    else setText(value);
  };
  return (
    <div className={cn('grid w-fit gap-3', className)}>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Color">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={c}
            onClick={() => onValueChange(c)}
            style={{ background: c }}
            className="grid size-8 place-items-center rounded-full outline-none ring-offset-2 ring-offset-background transition-transform duration-150 hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring aria-checked:scale-110 aria-checked:ring-2 aria-checked:ring-foreground/60"
          >
            <CheckIcon weight={3} className={cn('size-3.5 text-white transition-all', value === c ? 'scale-100 opacity-100' : 'scale-50 opacity-0')} />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border" style={{ background: value }}>
          <input type="color" value={value} onChange={(e) => onValueChange(e.target.value)} aria-label="Pick any color" className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => commit(text)}
          onKeyDown={(e) => e.key === 'Enter' && commit(text)}
          maxLength={7}
          spellCheck={false}
          aria-label="Hex value"
          className="h-9 w-28 rounded-md border bg-background px-3 font-mono text-sm uppercase outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15"
        />
      </div>
    </div>
  );
}
