import * as React from 'react';
import { cn } from '@/lib/utils';

const tools: { cmd: string; label: string; arg?: string; icon: string }[] = [
  { cmd: 'bold', label: 'Bold', icon: 'B' },
  { cmd: 'italic', label: 'Italic', icon: 'I' },
  { cmd: 'underline', label: 'Underline', icon: 'U' },
  { cmd: 'formatBlock', arg: 'h3', label: 'Heading', icon: 'H' },
  { cmd: 'insertUnorderedList', label: 'Bullet list', icon: '•' },
  { cmd: 'insertOrderedList', label: 'Numbered list', icon: '1.' },
  { cmd: 'formatBlock', arg: 'blockquote', label: 'Quote', icon: '"' },
];

// ponytail: built on contentEditable + execCommand. Fine for notes and comments; swap for Tiptap when you need tables, mentions or collaboration.
/**
 * Small rich text editor: bold, italic, underline, heading, lists, quote and link. `value` is an HTML string.
 * Pasted content is reduced to plain text. Sanitize the HTML again on the server before showing it to other people.
 */
export function RichTextEditor({ value, onChange, placeholder = 'Write something', minHeight = 140, className }: { value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value; }, [value]);

  const refresh = () => setActive({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline'), insertUnorderedList: document.queryCommandState('insertUnorderedList'), insertOrderedList: document.queryCommandState('insertOrderedList') });
  const run = (cmd: string, arg?: string) => {
    ref.current?.focus();
    if (cmd === 'formatBlock' && document.queryCommandValue('formatBlock').toLowerCase() === arg) document.execCommand('formatBlock', false, 'p');
    else document.execCommand(cmd, false, arg);
    onChange(ref.current!.innerHTML);
    refresh();
  };
  const link = () => {
    const url = window.prompt('Link address', 'https://');
    if (url && /^(https?:|mailto:)/i.test(url)) run('createLink', url);
  };
  const btn = 'grid h-7 min-w-7 place-items-center rounded px-1.5 text-[13px] font-semibold outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40';

  return (
    <div className={cn('w-full overflow-hidden rounded-lg border bg-background focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15', className)}>
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1">
        {tools.map((t) => (
          <button key={t.label} type="button" title={t.label} aria-label={t.label} aria-pressed={active[t.cmd]} onMouseDown={(e) => e.preventDefault()} onClick={() => run(t.cmd, t.arg)} className={cn(btn, t.cmd === 'italic' && 'italic', t.cmd === 'underline' && 'underline', active[t.cmd] && 'bg-secondary text-primary')}>{t.icon}</button>
        ))}
        <button type="button" title="Link" aria-label="Link" onMouseDown={(e) => e.preventDefault()} onClick={link} className={btn}>↗</button>
        <button type="button" title="Clear formatting" aria-label="Clear formatting" onMouseDown={(e) => e.preventDefault()} onClick={() => run('removeFormat')} className={cn(btn, 'ml-auto text-xs font-medium text-muted-foreground')}>Clear</button>
      </div>
      <div className="relative">
        {!value.replace(/<[^>]*>/g, '').trim() && <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground/70">{placeholder}</span>}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Editor"
          onInput={(e) => onChange(e.currentTarget.innerHTML)}
          onKeyUp={refresh}
          onMouseUp={refresh}
          onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }}
          style={{ minHeight }}
          className="px-3 py-2.5 text-sm leading-relaxed outline-none [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
    </div>
  );
}
