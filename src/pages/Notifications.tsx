import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { APP_NOTIFICATIONS_UPDATED_EVENT, appApi } from '../lib/appApi';
import {
  Bell, Plus, Send, Trash2, Users, Shield, Truck,
  CheckCircle2, Clock, X, Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TARGET_OPTIONS = [
  { id: 'all', label: 'Everyone', icon: Users, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'admin', label: 'Admins', icon: Shield, color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'manager', label: 'Managers', icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'delivery_boy', label: 'Delivery Boys', icon: Truck, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const PRIORITY_OPTIONS = [
  { id: 'normal', label: 'Normal', dot: 'bg-zinc-400' },
  { id: 'important', label: 'Important', dot: 'bg-amber-500' },
  { id: 'urgent', label: 'Urgent', dot: 'bg-red-500' },
];

export default function Notifications() {
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

  const handleSend = () => {
    if (!title.trim() || !message.trim()) return;
    appApi.saveNotification({ title, message, targets, priority, sentBy: user?.username });
    setTitle('');
    setMessage('');
    setTargets(['all']);
    setPriority('normal');
    setShowCompose(false);
    load();
    showToast('Notification sent!');
  };

  const handleDelete = (id: number) => {
    appApi.deleteNotification(id);
    load();
    setNotificationToDelete(null);
    showToast('Notification deleted');
  };

  const filtered = filterTarget === 'all'
    ? notifications
    : filterTarget === 'system'
      ? notifications.filter(n => n.isSystem)
      : notifications.filter(n => n.targets.includes(filterTarget) || n.targets.includes('all'));

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Notifications</h1>
          <p className="text-xs text-zinc-500 font-medium">Broadcast messages to your team</p>
        </div>
        <button onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
          <Plus size={14} />Create Notification
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
                <button onClick={handleSend} disabled={!title.trim() || !message.trim()}
                  className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Send size={16} />Send Now
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-zinc-100">
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
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit flex-wrap">
        {[{ id: 'all', label: 'All' }, { id: 'system', label: 'System', icon: Bot }, ...TARGET_OPTIONS.slice(1)].map(t => (
          <button key={t.id} onClick={() => setFilterTarget(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${filterTarget === t.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t.icon && <t.icon size={12} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={28} className="text-zinc-300" />
            </div>
            <p className="font-bold text-zinc-400">No notifications yet</p>
            <p className="text-xs text-zinc-400 mt-1">Click "Create Notification" to broadcast a message</p>
          </div>
        ) : filtered.map(n => (
          <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${n.isSystem ? 'border-l-4 border-l-teal-400 border-zinc-100' : 'border-zinc-100'
              }`}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot(n.priority)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h4 className="font-bold text-zinc-900 text-sm leading-tight">{n.title}</h4>
                      {n.isSystem && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-[9px] font-bold shrink-0">
                          <Bot size={9} />System
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{n.message}</p>
                  </div>
                </div>
                <button onClick={() => setNotificationToDelete(n.id)}
                  className="shrink-0 p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(n.targets || ['all']).map((t: string) => {
                    const opt = TARGET_OPTIONS.find(o => o.id === t);
                    if (!opt) return null;
                    return (
                      <span key={t} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${opt.color}`}>
                        <opt.icon size={9} />{opt.label}
                      </span>
                    );
                  })}
                  {n.priority !== 'normal' && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${n.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                      {n.priority === 'urgent' ? 'Urgent' : 'Important'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {n.sentBy && (
                    <span className="text-[10px] text-zinc-400 font-medium">by {n.sentBy}</span>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                    <Clock size={10} />{new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
