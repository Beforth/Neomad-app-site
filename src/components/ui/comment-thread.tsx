import * as React from 'react';
import { Avatar } from './avatar';
import { Button } from './button';
import { Textarea } from './input';
import { cn } from '@/lib/utils';

export interface Comment {
  id: string;
  author: string;
  time: string;
  body: string;
  replies?: Comment[];
}

function Item({ c, onReply, depth }: { c: Comment; onReply?: (parentId: string, text: string) => void; depth: number }) {
  const [replying, setReplying] = React.useState(false);
  const [text, setText] = React.useState('');
  const send = () => {
    if (!text.trim()) return;
    onReply?.(c.id, text.trim());
    setText('');
    setReplying(false);
  };
  return (
    <li className="grid gap-2">
      <div className="flex gap-3">
        <Avatar name={c.author} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px]"><span className="font-semibold">{c.author}</span> <span className="text-xs text-muted-foreground">· {c.time}</span></p>
          <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-foreground/90">{c.body}</p>
          {onReply && depth < 3 && !replying && <button type="button" onClick={() => setReplying(true)} className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground">Reply</button>}
          {replying && (
            <div className="mt-2 grid gap-2">
              <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={`Reply to ${c.author}`} className="min-h-16" />
              <div className="flex gap-2"><Button size="xs" onClick={send} disabled={!text.trim()}>Reply</Button><Button size="xs" variant="ghost" onClick={() => setReplying(false)}>Cancel</Button></div>
            </div>
          )}
        </div>
      </div>
      {c.replies && c.replies.length > 0 && (
        <ul className={cn('ml-4 grid gap-3 border-l pl-4', depth > 1 && 'ml-2 pl-3')}>
          {c.replies.map((r) => <Item key={r.id} c={r} onReply={onReply} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}

/** Nested comments with inline reply boxes (three levels deep). You own the state: `onReply` gets the parent id and text. */
export function CommentThread({ comments, onReply, className }: { comments: Comment[]; onReply?: (parentId: string, text: string) => void; className?: string }) {
  return <ul className={cn('grid gap-5', className)}>{comments.map((c) => <Item key={c.id} c={c} onReply={onReply} depth={0} />)}</ul>;
}
