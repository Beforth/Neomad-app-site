import { useEffect } from 'react';
import { Toaster, toast } from '@/components/ui/toast';

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
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const detail = (e as CustomEvent<ToastItem>).detail;
      if (!detail) return;
      const text = detail.notes ? `${detail.message} — Note: ${detail.notes}` : detail.message;
      if (detail.type === 'approved') toast.success(detail.title, text);
      else if (detail.type === 'rejected') toast.error(detail.title, text);
      else toast.info(detail.title, text);
    };
    window.addEventListener(ATTENDANCE_STATUS_TOAST_EVENT, handleToastEvent);
    return () => window.removeEventListener(ATTENDANCE_STATUS_TOAST_EVENT, handleToastEvent);
  }, []);

  return <Toaster />;
}
