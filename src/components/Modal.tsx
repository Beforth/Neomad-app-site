/**
 * Shared popup dialog, built on the befui Dialog (Radix): focus is trapped,
 * Escape closes it, and screen readers get a proper dialog.
 *
 * Staff.tsx, Shifts.tsx and ShiftAssign.tsx still declare their own copy;
 * new code should import this one instead of declaring another.
 */
import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Clicking the backdrop or pressing Escape closes the dialog. */
  closeOnBackdropClick?: boolean;
  wide?: boolean;
}

export default function Modal({
  title, onClose, children, closeOnBackdropClick = true, wide = false,
}: ModalProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        aria-describedby={undefined}
        onEscapeKeyDown={(e) => { if (!closeOnBackdropClick) e.preventDefault(); }}
        onInteractOutside={(e) => { if (!closeOnBackdropClick) e.preventDefault(); }}
        className={cn('max-h-[90dvh] gap-0 overflow-y-auto p-0', wide ? 'max-w-2xl' : 'max-w-md')}
      >
        <div className="border-b px-5 py-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
