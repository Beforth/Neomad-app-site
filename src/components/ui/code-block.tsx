import * as React from 'react';
import { CopyIcon, CheckIcon } from './icons';
import { cn } from '@/lib/utils';

/** Code with an optional title, line numbers and a copy button. Plain text, no syntax highlighter, so it stays tiny. */
export function CodeBlock({
  code,
  title,
  lineNumbers,
  maxHeight,
  className,
}: {
  code: string;
  title?: string;
  lineNumbers?: boolean;
  maxHeight?: number;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const lines = code.replace(/\n$/, '').split('\n');
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch { return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <figure className={cn('overflow-hidden rounded-lg border bg-muted/50', className)}>
      <figcaption className="flex h-9 items-center justify-between border-b bg-muted px-3">
        <span className="font-mono text-xs text-muted-foreground">{title}</span>
        <button type="button" onClick={copy} aria-label="Copy code" className="inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
          {copied ? <><CheckIcon className="size-3.5 text-success" /> Copied</> : <><CopyIcon className="size-3.5" /> Copy</>}
        </button>
      </figcaption>
      <pre className="overflow-auto p-3 font-mono text-[12.5px] leading-6" style={{ maxHeight }}>
        <code>
          {lines.map((l, i) => (
            <span key={i} className="block">
              {lineNumbers && <span className="mr-4 inline-block w-5 select-none text-right text-muted-foreground/50">{i + 1}</span>}
              {l || ' '}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
