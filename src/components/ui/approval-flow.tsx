import * as React from 'react';
import { Avatar } from './avatar';
import { Button } from './button';
import { CheckIcon, ClockIcon, XIcon } from './icons';
import { cn } from '@/lib/utils';

export interface ApprovalStep {
  id: string;
  approver: string;
  role?: string;
  status: 'approved' | 'pending' | 'rejected' | 'waiting';
  comment?: string;
  at?: string;
}

const dot = {
  approved: 'bg-success text-white',
  rejected: 'bg-destructive text-white',
  pending: 'bg-warning/15 text-warning ring-4 ring-warning/10',
  waiting: 'bg-muted text-muted-foreground',
};
const word = { approved: 'Approved', rejected: 'Rejected', pending: 'Awaiting decision', waiting: 'Waiting' };

/**
 * Vertical chain of approvers with each decision, comment and time. The first `pending` step shows Approve and Reject buttons
 * when you pass `onDecide`. You own the steps and update their status in the callback.
 */
export function ApprovalFlow({ steps, onDecide, className }: { steps: ApprovalStep[]; onDecide?: (id: string, decision: 'approved' | 'rejected', comment: string) => void; className?: string }) {
  const [comment, setComment] = React.useState('');
  const current = steps.find((s) => s.status === 'pending')?.id;
  const decide = (id: string, d: 'approved' | 'rejected') => { onDecide?.(id, d, comment.trim()); setComment(''); };
  return (
    <ol className={cn('grid', className)}>
      {steps.map((s, i) => (
        <li key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && <span className={cn('absolute bottom-0 left-[13px] top-8 w-px', s.status === 'approved' ? 'bg-success/50' : 'bg-border')} />}
          <span className={cn('z-10 grid size-7 shrink-0 place-items-center rounded-full', dot[s.status])}>
            {s.status === 'approved' ? <CheckIcon className="size-3.5" /> : s.status === 'rejected' ? <XIcon className="size-3.5" /> : s.status === 'pending' ? <ClockIcon className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Avatar name={s.approver} size="xs" />
              <span className="text-[13px] font-medium">{s.approver}</span>
              {s.role && <span className="text-xs text-muted-foreground">{s.role}</span>}
              <span className={cn('ml-auto text-xs font-medium', s.status === 'approved' && 'text-success', s.status === 'rejected' && 'text-destructive', s.status === 'pending' && 'text-warning', s.status === 'waiting' && 'text-muted-foreground')}>{word[s.status]}{s.at && <span className="font-normal text-muted-foreground"> · {s.at}</span>}</span>
            </div>
            {s.comment && <p className="mt-1.5 rounded-lg border bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground">{s.comment}</p>}
            {onDecide && s.id === current && (
              <div className="mt-2 grid gap-2">
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Add a comment (optional)" aria-label="Comment" className="w-full resize-none rounded-md border bg-background px-3 py-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15" />
                <div className="flex gap-2"><Button size="sm" onClick={() => decide(s.id, 'approved')}>Approve</Button><Button size="sm" variant="outline" onClick={() => decide(s.id, 'rejected')}>Reject</Button></div>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
