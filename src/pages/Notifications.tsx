import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_NOTIFICATIONS_UPDATED_EVENT, appApi } from '../lib/appApi';
import {
  Bell, Plus, Send, Trash2, Users, Shield, Truck,
  CheckCircle2, Clock, X, Bot, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TARGET_OPTIONS = [
  { id: 'all', label: 'Everyone', icon: Users, color: 'bg-purple-50 text-purple-700' },
  { id: 'admin', label: 'Admins', icon: Shield, color: 'bg-rose-50 text-rose-700' },
  { id: 'manager', label: 'Managers', icon: Users, color: 'bg-blue-50 text-blue-700' },
  { id: 'delivery_boy', label: 'Delivery Boys', icon: Truck, color: 'bg-emerald-50 text-emerald-700' },
];

const PRIORITY_OPTIONS = [
  { id: 'normal', label: 'Normal', dot: 'bg-zinc-400' },
  { id: 'important', label: 'Important', dot: 'bg-amber-500' },
  { id: 'urgent', label: 'Urgent', dot: 'bg-red-500' },
];

const PAGE_SIZE = 20;

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targets, setTargets] = useState<string[]>(['all']);
  const [priority, setPriority] = useState('normal');
  const [toast, setToast] = useState('');
  const [filterTarget, setFilterTarget] = useState('all');
  const [notificationToDelete, setNotificationToDelete] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);

  const load = () => setNotifications(appApi.getNotifications());

  useEffect(() => {
    load();
    const onUpdated = () => load();
    window.addEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    };
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const toggleTarget = (id: string) => {
    if (id === 'all') { setTargets(['all']); return; }
    setTargets(prev => {
      const without = prev.filter(t => t !== 'all');
      if (without.includes(id)) {
        const next = without.filter(t => t !== id);
        return next.length === 0 ? ['all'] : next;
      }
      return [...without, id];
    });
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      const result = await appApi.sendNotification({ title, message, targets, priority, sentBy: user?.username });
      setTitle('');
      setMessage('');
      setTargets(['all']);
      setPriority('normal');
      setShowCompose(false);
      load();
      showToast(`Notification sent to ${result.matched_users} users`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (id: number) => {
    appApi.deleteNotification(id);
    load();
    setNotificationToDelete(null);
    showToast('Notification deleted');
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    appApi.deleteNotifications(selectedIds);
    setSelectedIds([]);
    load();
    showToast('Selected notifications deleted');
  };

  const handleMarkAllRead = () => {
    if (!user?.id) return;
    appApi.markAllNotifRead(user.id);
    load();
    showToast('Notifications marked as read');
  };

  const filterTargetRef = useRef(filterTarget);
  filterTargetRef.current = filterTarget;

  const filtered = filterTarget === 'all'
    ? notifications
    : filterTarget === 'system'
      ? notifications.filter(n => n.isSystem)
      : notifications.filter(n => n.targets.includes(filterTarget) || n.targets.includes('all'));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filterTarget]);

  const allSelectedOnPage = paginated.length > 0 && paginated.every((n: any) => selectedIds.includes(n.id));

  const handleSelectAll = () => {
    if (allSelectedOnPage) {
      setSelectedIds((prev) => prev.filter((id) => !paginated.some((n: any) => n.id === id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...paginated.map((n: any) => n.id)])]);
    }
  };

  const priorityDot = (p: string) => {
    if (p === 'urgent') return 'bg-red-500';
    if (p === 'important') return 'bg-amber-500';
    return 'bg-zinc-300';
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-6 right-6 z-99 bg-zinc-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {(user?.role === 'delivery_boy' || user?.role === 'staff') && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Notifications</h1>
            <p className="text-xs text-zinc-500 font-medium truncate">Broadcast messages to your team</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCompose(true)}
          className="flex shrink-0 items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-100 whitespace-nowrap"
        >
          <Plus className="size-3.5 shrink-0" strokeWidth={2.5} />
          Create
        </button>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
                    <Bell size={16} />
                  </div>
                  <h3 className="font-bold text-zinc-900">New Notification</h3>
                </div>
                <button onClick={() => setShowCompose(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. System Maintenance Tonight"
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 text-sm transition-all font-medium" />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                    placeholder="Write your message here..."
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 text-sm transition-all resize-none" />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Priority</label>
                  <div className="flex gap-2">
                    {PRIORITY_OPTIONS.map(p => (
                      <button key={p.id} onClick={() => setPriority(p.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-all ${priority === p.id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                          }`}>
                        <span className={`w-2 h-2 rounded-full ${priority === p.id ? 'bg-white' : p.dot}`} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Send To</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TARGET_OPTIONS.map(opt => (
                      <button key={opt.id} onClick={() => toggleTarget(opt.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${targets.includes(opt.id) ? opt.color + ' border-current' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                          }`}>
                        <opt.icon size={14} />
                        {opt.label}
                        {targets.includes(opt.id) && <CheckCircle2 size={12} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-zinc-100 flex gap-3">
                <button onClick={() => setShowCompose(false)}
                  className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSend} disabled={!title.trim() || !message.trim() || sending}
                  className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Send size={16} />{sending ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {notificationToDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-zinc-100 relative">
              <button type="button" onClick={() => setNotificationToDelete(null)} className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" aria-label="Close">
                <X size={18} />
              </button>
              <p className="font-bold text-zinc-900">Are you sure?</p>
              <p className="text-sm text-zinc-500 mt-1">This notification will be deleted permanently.</p>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setNotificationToDelete(null)}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-xl font-bold text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => handleDelete(notificationToDelete)}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                  <Trash2 size={16} /> Yes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit flex-wrap">
          {[{ id: 'all', label: 'All' }, { id: 'system', label: 'System', icon: Bot }, ...TARGET_OPTIONS.slice(1)].map(t => (
            <button key={t.id} onClick={() => setFilterTarget(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${filterTarget === t.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {t.icon && <t.icon size={12} />}
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleMarkAllRead}
            className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors">
            Mark all read
          </button>
          <button type="button" onClick={handleBulkDelete} disabled={selectedIds.length === 0}
            className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Delete ({selectedIds.length})
          </button>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              <th className="px-3 py-3 w-10">
                <div className="relative">
                  <input type="checkbox" checked={allSelectedOnPage} onChange={handleSelectAll}
                    className="appearance-none w-3.5 h-3.5 rounded border-2 border-zinc-300 checked:border-emerald-500 checked:bg-emerald-500 transition-all cursor-pointer bg-white" />
                  {allSelectedOnPage && (
                    <CheckCircle2 size={9} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white pointer-events-none" strokeWidth={3} />
                  )}
                </div>
              </th>
              <th className="px-3 py-3">Notification</th>
              <th className="px-3 py-3 hidden sm:table-cell">Target</th>
              <th className="px-3 py-3 hidden md:table-cell">Sent by</th>
              <th className="px-3 py-3 hidden md:table-cell">Date</th>
              <th className="px-3 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Bell size={18} className="text-zinc-300" />
                  </div>
                  <p className="font-semibold text-zinc-400 text-sm">No notifications</p>
                </td>
              </tr>
            ) : paginated.map((n: any) => (
              <tr key={n.id}
                className={`group transition-colors ${selectedIds.includes(n.id) ? 'bg-emerald-50' : 'hover:bg-zinc-50'}`}>
                <td className="px-3 py-3">
                  <div className="relative">
                    <input type="checkbox" checked={selectedIds.includes(n.id)}
                      onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...prev, n.id] : prev.filter((id) => id !== n.id))}
                      className="appearance-none w-3.5 h-3.5 rounded border-2 border-zinc-300 checked:border-emerald-500 checked:bg-emerald-500 transition-all cursor-pointer bg-white" />
                    {selectedIds.includes(n.id) && (
                      <CheckCircle2 size={9} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white pointer-events-none" strokeWidth={3} />
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot(n.priority)}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-zinc-900 text-sm truncate">{n.title}</span>
                        {n.isSystem && (
                          <span className="flex items-center gap-1 px-1 py-0.5 bg-teal-50 text-teal-600 rounded text-[9px] font-semibold shrink-0">
                            <Bot size={8} />System
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate max-w-[260px]">{n.message}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 hidden sm:table-cell">
                  <div className="flex items-center gap-1 flex-wrap">
                    {(n.targets || ['all']).map((t: string) => {
                      const opt = TARGET_OPTIONS.find(o => o.id === t);
                      if (!opt) return null;
                      return (
                        <span key={t} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${opt.color}`}>
                          <opt.icon size={8} />{opt.label}
                        </span>
                      );
                    })}
                    {n.priority !== 'normal' && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${n.priority === 'urgent' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {n.priority === 'urgent' ? 'Urgent' : 'Important'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <span className="text-xs text-zinc-500">{n.sentBy || '—'}</span>
                </td>
                <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Clock size={10} />{new Date(n.created_at).toLocaleString()}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <button onClick={() => setNotificationToDelete(n.id)}
                    className="p-1 text-zinc-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-zinc-400">Page {safePage} of {totalPages}</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${p === safePage ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
