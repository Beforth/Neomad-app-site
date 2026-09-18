/**
 * Shared popup dialog.
 *
 * Matches the look and behaviour of the per-page `Modal` definitions in
 * Staff.tsx, Shifts.tsx and ShiftAssign.tsx — new code should import this one
 * instead of declaring another copy.
 */
import { useEffect, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

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
  // Escape is bound on the document: the dialog itself is not focused when it
  // opens, so a React onKeyDown on the wrapper would never fire.
  useEffect(() => {
    if (!closeOnBackdropClick) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeOnBackdropClick, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
      onClick={closeOnBackdropClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-xl w-full overflow-hidden ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">{title}</h3>
          <button type="button" onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
