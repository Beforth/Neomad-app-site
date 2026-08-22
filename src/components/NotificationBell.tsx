import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Check, Trash2, Clock, Calendar, FileText, DollarSign,
  AlertCircle, CheckCircle2, XCircle, ArrowRight, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_NOTIFICATIONS_UPDATED_EVENT, appApi } from '../lib/appApi';
import { useNavigate } from 'react-router-dom';

export type CategoryTab = 'all' | 'attendance' | 'leave' | 'expenses' | 'payroll';

export function getNotificationCategory(item: any): CategoryTab {
  const t = String(item.category || item.type || item.title || '').toLowerCase();
  const msg = String(item.message || '').toLowerCase();
  if (t.includes('attendance') || msg.includes('attendance') || msg.includes('regularization') || msg.includes('clock') || msg.includes('punch')) return 'attendance';
  if (t.includes('leave') || msg.includes('leave') || msg.includes('time off') || msg.includes('vacation')) return 'leave';
  if (t.includes('expense') || t.includes('advance') || msg.includes('expense') || msg.includes('reimbursement')) return 'expenses';
  if (t.includes('payroll') || t.includes('pay') || msg.includes('payslip') || msg.includes('salary')) return 'payroll';
  return 'attendance';
}

const CATEGORY_BADGES: Record<CategoryTab, { label: string; bg: string; text: string; icon: any }> = {
  all: { label: 'All', bg: 'bg-zinc-100', text: 'text-zinc-700', icon: Bell },
  attendance: { label: 'Attendance', bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
  leave: { label: 'Leave', bg: 'bg-purple-50', text: 'text-purple-700', icon: Calendar },
  expenses: { label: 'Expenses', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: FileText },
  payroll: { label: 'Payroll', bg: 'bg-amber-50', text: 'text-amber-700', icon: DollarSign },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!user) return;
    setNotifications(appApi.getUserNotifications(user));
  };

  useEffect(() => {
    load();
    const onUpdated = () => load();
    window.addEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    window.addEventListener('storage', onUpdated);
    return () => {
      window.removeEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
      window.removeEventListener('storage', onUpdated);
    };
  }, [user?.id, user?.role]);

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !(n.readBy || []).includes(user?.id)).length;

  const handleMarkAllRead = () => {
    if (!user) return;
    appApi.markAllNotifRead(user.id);
    load();
  };

  const handleMarkSingleRead = (id: number) => {
    if (!user) return;
    appApi.markNotifRead(id, user.id);
    load();
  };

  const handleClearSingle = (id: number) => {
    appApi.deleteNotification(id);
    load();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeCategory === 'all') return true;
    return getNotificationCategory(n) === activeCategory;
  });

  return (
    <div className="relative">
      <button
        onClick={() => navigate('/notifications')}
        className="relative p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-all"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center leading-none border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
