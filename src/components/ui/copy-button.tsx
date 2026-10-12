import * as React from 'react';
import { CheckIcon, CopyIcon } from './icons';
import { cn } from '@/lib/utils';

/** Icon button that copies `value` and morphs to a check for two seconds. */
export function CopyButton({ value, className, ...props }: { value: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 2000);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      aria-label={done ? 'Copied' : 'Copy'}
      onClick={() => navigator.clipboard.writeText(value).then(() => setDone(true))}
      className={cn('relative inline-flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95', done && 'text-success', className)}
      {...props}
    >
      <CopyIcon className={cn('absolute size-4 transition-all duration-200', done ? 'scale-50 opacity-0' : 'scale-100 opacity-100')} />
      <CheckIcon className={cn('absolute size-4 transition-all duration-200', done ? 'scale-100 opacity-100' : 'scale-50 opacity-0')} />
    </button>
  );
}
