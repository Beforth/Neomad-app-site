import * as React from 'react';
import { cn } from '@/lib/utils';

/** One-time code input. Supports paste, backspace and arrow navigation. Calls onComplete when full. */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  invalid,
  className,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  invalid?: boolean;
  className?: string;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const set = (next: string) => {
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  return (
    <div className={cn('flex gap-2', invalid && 'animate-shake', className)} role="group" aria-label="One-time code">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={value[i] ?? ''}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1);
            if (!d) return;
            set((value.slice(0, i) + d + value.slice(i + 1)).slice(0, length));
            focus(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();
              if (value[i]) set(value.slice(0, i) + value.slice(i + 1));
              else { set(value.slice(0, Math.max(0, i - 1)) + value.slice(i)); focus(i - 1); }
            } else if (e.key === 'ArrowLeft') focus(i - 1);
            else if (e.key === 'ArrowRight') focus(i + 1);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (!t) return;
            set(t);
            focus(t.length);
          }}
          className={cn(
            'size-11 rounded-lg border bg-background text-center text-lg font-semibold tabular-nums outline-none transition-[border-color,box-shadow,transform] duration-150 focus:scale-105 focus:border-ring focus:ring-4 focus:ring-ring/15',
            value[i] && 'border-primary/50 bg-accent',
            invalid && 'border-destructive focus:border-destructive focus:ring-destructive/15',
          )}
        />
      ))}
    </div>
  );
}
