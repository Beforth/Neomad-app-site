import * as React from 'react';
import * as D from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

/**
 * Mobile-style sheet that rises from the bottom. Drag the handle down to dismiss; Escape and the backdrop close it too.
 * Uses Radix Dialog, so focus is trapped and restored. Keep a title for screen readers (visible or `srOnlyTitle`).
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [dy, setDy] = React.useState(0);
  const y0 = React.useRef<number | null>(null);
  const end = () => {
    const close = dy > 90;
    y0.current = null;
    setDy(0);
    if (close) onOpenChange(false);
  };
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-in" />
        <D.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          style={{ transform: dy ? `translateY(${dy}px)` : undefined, transition: y0.current === null ? 'transform 200ms' : 'none' }}
          className={cn('fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-lg animate-slide-up flex-col rounded-t-2xl border border-b-0 bg-popover pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl outline-none', className)}
        >
          <div
            className="grid cursor-grab touch-none place-items-center py-3 active:cursor-grabbing"
            onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => y0.current !== null && setDy(Math.max(0, e.clientY - y0.current))}
            onPointerUp={end}
            onPointerCancel={end}
          >
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="grid gap-1 px-5 pb-3">
            <D.Title className="text-base font-semibold">{title}</D.Title>
            {description ? <D.Description className="text-[13px] text-muted-foreground">{description}</D.Description> : null}
          </div>
          <div className="overflow-y-auto px-5">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
