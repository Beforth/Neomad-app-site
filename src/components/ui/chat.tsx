import * as React from 'react';
import { Avatar } from './avatar';
import { ArrowUpIcon } from './icons';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  from: string;
  text: React.ReactNode;
  at: Date | string | number;
}

const clock = (d: Date | string | number) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * Message list with a composer. `me` is your name: those bubbles sit right in the primary color, the rest on the left with an avatar.
 * Enter sends, Shift+Enter adds a line. Scrolls to the newest message. Pass `typing` (a name) to show "is typing".
 */
export function Chat({
  messages,
  me,
  onSend,
  typing,
  placeholder = 'Write a message',
  className,
}: {
  messages: ChatMessage[];
  me: string;
  onSend: (text: string) => void;
  typing?: string;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = React.useState('');
  const end = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length, typing]);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(t);
    setDraft('');
  };

  return (
    <div className={cn('flex h-96 w-full max-w-md flex-col overflow-hidden rounded-xl border bg-card', className)}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
        {messages.map((m, i) => {
          const mine = m.from === me;
          const first = messages[i - 1]?.from !== m.from;
          const last = messages[i + 1]?.from !== m.from;
          return (
            <div key={m.id} className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
              {!mine && <Avatar name={m.from} size="xs" className={cn(!last && 'invisible')} />}
              <div className={cn('grid max-w-[78%] gap-0.5', mine && 'justify-items-end')}>
                {first && !mine && <span className="px-1 text-[11px] text-muted-foreground">{m.from}</span>}
                <p className={cn('whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-[13px] leading-snug', mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary')}>{m.text}</p>
                <time className="px-1 text-[10px] text-muted-foreground">{clock(m.at)}</time>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex gap-0.5 rounded-full bg-secondary px-2.5 py-2">{[0, 1, 2].map((i) => <span key={i} style={{ animationDelay: `${i * 0.15}s` }} className="size-1 animate-bounce rounded-full bg-muted-foreground" />)}</span>
            {typing} is typing
          </div>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 border-t p-2.5">
        <textarea
          value={draft}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={placeholder}
          aria-label="Message"
          className="max-h-28 min-h-9 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15"
        />
        <button type="submit" aria-label="Send" disabled={!draft.trim()} className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground outline-none transition-[opacity,transform] focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 disabled:opacity-40"><ArrowUpIcon className="size-4" /></button>
      </form>
    </div>
  );
}
