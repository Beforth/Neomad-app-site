import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'approved' | 'rejected' | 'info';
  title: string;
  message: string;
  notes?: string;
}

export const ATTENDANCE_STATUS_TOAST_EVENT = 'ATTENDANCE_STATUS_TOAST';

export function triggerAttendanceToast(toast: Omit<ToastItem, 'id'>) {
  window.dispatchEvent(
    new CustomEvent(ATTENDANCE_STATUS_TOAST_EVENT, {
      detail: { ...toast, id: String(Date.now() + Math.random()) },
    })
  );
}

export default function ToastManager() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (!customEvent.detail) return;
      const newToast = customEvent.detail;
      setToasts((prev) => [newToast, ...prev].slice(0, 5));

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 6000);
    };

    window.addEventListener(ATTENDANCE_STATUS_TOAST_EVENT, handleToastEvent);
    return () => {
      window.removeEventListener(ATTENDANCE_STATUS_TOAST_EVENT, handleToastEvent);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 backdrop-blur-md transition-all ${
              toast.type === 'approved'
                ? 'bg-zinc-900/95 border-emerald-500/40 text-white shadow-emerald-950/20'
                : toast.type === 'rejected'
                ? 'bg-zinc-900/95 border-rose-500/40 text-white shadow-rose-950/20'
                : 'bg-zinc-900/95 border-zinc-700/40 text-white'
            }`}
          >
            {toast.type === 'approved' ? (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 size={18} />
              </div>
            ) : toast.type === 'rejected' ? (
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                <XCircle size={18} />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <CheckCircle2 size={18} />
              </div>
            )}

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold tracking-tight text-white">{toast.title}</h4>
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                    toast.type === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : toast.type === 'rejected'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {toast.type === 'approved' ? 'Approved' : toast.type === 'rejected' ? 'Rejected' : 'Update'}
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{toast.message}</p>
              {toast.notes && (
                <div className="mt-2 p-2 bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-[11px] text-zinc-300">
                  <span className="font-semibold text-zinc-400 block mb-0.5">Note:</span>
                  {toast.notes}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors shrink-0 -mr-1 -mt-1"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
