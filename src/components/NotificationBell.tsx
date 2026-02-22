import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mockApi } from '../lib/mockApi';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    const all = mockApi.getNotifications();
    const mine = all.filter((n: any) =>
      n.targets.includes('all') || n.targets.includes(user?.role || '')
    );
    setNotifications(mine);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [user?.id, user?.role]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !(n.readBy || []).includes(user?.id)).length;

  const markRead = (id: number) => {
    mockApi.markNotifRead(id, user!.id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, readBy: [...(n.readBy || []), user!.id] } : n)
    );
  };

  const markAllRead = () => {
    notifications.forEach(n => {
      if (!(n.readBy || []).includes(user?.id)) markRead(n.id);
    });
  };

  const priorityColor = (p: string) => {
    if (p === 'urgent') return 'bg-red-500';
    if (p === 'important') return 'bg-amber-400';
    return 'bg-zinc-300';
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); load(); }}
        className="relative p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-all"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-zinc-100 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-zinc-400" />
                <span className="text-sm font-bold text-zinc-900">Notifications</span>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full leading-none">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={markAllRead} title="Mark all as read"
                    className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-emerald-600 font-medium transition-colors px-1.5 py-1 rounded-lg hover:bg-emerald-50">
                    <CheckCheck size={12} />All read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-zinc-300 hover:text-zinc-600 p-1 rounded-lg">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-50">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={28} className="mx-auto text-zinc-200 mb-2" />
                  <p className="text-xs text-zinc-400 font-medium">No notifications yet</p>
                </div>
              ) : notifications.map(n => {
                const isRead = (n.readBy || []).includes(user?.id);
                return (
                  <button key={n.id} onClick={() => markRead(n.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors ${isRead ? 'opacity-60' : ''}`}>
                    <div className="flex gap-2.5 items-start">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isRead ? 'bg-zinc-200' : priorityColor(n.priority)}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold text-zinc-900 leading-tight truncate ${!isRead ? 'font-extrabold' : ''}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-zinc-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/50">
                <a href="/notifications"
                  className="text-xs text-zinc-400 hover:text-zinc-700 font-medium transition-colors">
                  View all in Notifications →
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
