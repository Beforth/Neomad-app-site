import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_NOTIFICATIONS_UPDATED_EVENT, appApi } from '../lib/appApi';
import { getAttendanceRequests, AttendanceRequestOut } from '../lib/hrmsApi';
import { listShiftAssignments, type ShiftAssignment } from '../lib/hrmsShifts';
import {
  Bell, Plus, Send, Trash2, Users, Shield, Truck,
  CheckCircle2, Clock, X, Bot, ChevronLeft, XCircle,
  ClipboardList, Calendar, CalendarDays, Receipt, FileText,
  Search, CheckSquare, Square, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDateTimeIST } from '../lib/timeUtils';

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

const FILTER_CATEGORIES = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'attendance', label: 'Attendance', icon: ClipboardList },
  { id: 'shift', label: 'Shifts', icon: Calendar },
  { id: 'leave', label: 'Leave', icon: CalendarDays },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'payroll', label: 'Payroll', icon: FileText },
];

const PAGE_SIZE = 15;

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceRequestOut[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targets, setTargets] = useState<string[]>(['all']);
  const [priority, setPriority] = useState('normal');
  const [toast, setToast] = useState('');
  const [filterTarget, setFilterTarget] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationToDelete, setNotificationToDelete] = useState<number | string | null>(null);
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);
  const [expandedIds, setExpandedIds] = useState<(number | string)[]>([]);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);

  const load = async () => {
    if (!user) return;
    setNotifications(appApi.getUserNotifications(user));
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const [reqs, shifts] = await Promise.all([
          getAttendanceRequests(token),
          listShiftAssignments(token),
        ]);
        setAttendanceRequests(reqs);
        setShiftAssignments(shifts);
      } catch {
        // Silently ignore if offline
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    const onUpdated = () => load();
    window.addEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    window.addEventListener('focus', onUpdated);
    return () => {
      window.removeEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
      window.removeEventListener('focus', onUpdated);
    };
  }, [user?.id]);

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

  const handleDelete = (id: number | string) => {
    if (typeof id === 'number') {
      appApi.deleteNotification(id);
    }
    load();
    setNotificationToDelete(null);
    showToast('Item removed');
  };

  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (feedRef.current && !feedRef.current.contains(event.target as Node)) {
        setSelectedIds([]);
      }
    }
    if (selectedIds.length > 0) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [selectedIds.length]);

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const numIds = selectedIds.filter((x): x is number => typeof x === 'number');
    if (numIds.length > 0) {
      appApi.deleteNotifications(numIds);
    }
    setSelectedIds([]);
    load();
    showToast('Selected items deleted');
  };

  const handleDeleteAll = () => {
    if (notifications.length === 0) return;
    const allIds = notifications.map((n: any) => n.id);
    appApi.deleteNotifications(allIds);
    setSelectedIds([]);
    load();
    showToast('All notifications cleared');
  };

  const handleMarkAllRead = () => {
    if (!user?.id) return;
    appApi.markAllNotifRead(user.id);
    load();
    showToast('Notifications marked as read');
  };

  const toggleExpand = (id: number | string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const filterTargetRef = useRef(filterTarget);
  filterTargetRef.current = filterTarget;

  // Map attendance requests to non-redundant, clean notification items
  const formattedRequests = attendanceRequests.map((req) => {
    const isApprove = req.status === 'approved';
    const isReject = req.status === 'rejected';
    const reqTypeLabel = req.request_type === 'regularization' ? 'Missed Punch' : req.request_type === 'half_day' ? 'Request Half day' : 'Full Day Request';
    const rangeLabel = req.from_date === req.to_date ? req.from_date : `${req.from_date} → ${req.to_date}`;

    return {
      id: `req-${req.id}`,
      rawReqId: req.id,
      isAttendanceRequest: true,
      category: 'attendance',
      badgeLabel: reqTypeLabel,
      badgeColor: req.request_type === 'regularization' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  req.request_type === 'half_day' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                  'bg-violet-50 text-violet-800 border-violet-200',
      rangeLabel,
      reason: req.reason,
      title: reqTypeLabel, // Unique, clean title without duplicate "Attendance Request — "
      message: req.reason ? req.reason : `Request submitted for ${rangeLabel}`,
      status: req.status, // 'pending' | 'approved' | 'rejected'
      adminNote: req.notes || (isApprove ? (req.resolved_by_name ? `Approved by ${req.resolved_by_name}` : 'Approved') : isReject ? 'Rejected' : undefined),
      sentBy: req.employee_username || user?.username || 'Self',
      created_at: req.submitted_at,
      priority: req.status === 'pending' ? 'important' : 'normal',
      readBy: [user?.id],
    };
  });

  // Map shift assignments to clean notification items
  const formattedShifts = shiftAssignments.map((s) => {
    const rangeLabel = s.effective_from === s.effective_to ? s.effective_from : s.effective_to ? `${s.effective_from} → ${s.effective_to}` : `${s.effective_from} (open-ended)`;
    const daysLabel = s.working_days.length > 0 ? s.working_days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') : 'All days';

    return {
      id: `shift-${s.id}`,
      isShiftAssignment: true,
      category: 'shift',
      badgeLabel: 'Shift Assignment',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      shiftName: s.shift_type_name || 'Shift',
      rangeLabel,
      daysLabel,
      title: `Shift: ${s.shift_type_name || 'Schedule Assigned'}`,
      message: `Effective: ${rangeLabel} • Days: ${daysLabel}`,
      status: s.status,
      adminNote: s.location ? `Location: ${s.location}` : undefined,
      sentBy: s.staff_name || 'Admin',
      created_at: s.effective_from,
      priority: s.status === 'active' ? 'normal' : 'important',
      readBy: [user?.id],
    };
  });

  // Combine attendance requests, shift assignments, and manual notifications
  const combinedList = [...formattedRequests, ...formattedShifts, ...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const filtered = combinedList.filter((n) => {
    const title = String(n.title || n.type || n.category || '').toLowerCase();
    const msg = String(n.message || '').toLowerCase();
    const reason = String(n.reason || '').toLowerCase();
    const adminNote = String(n.adminNote || '').toLowerCase();
    const sentBy = String(n.sentBy || '').toLowerCase();
    const badgeLabel = String(n.badgeLabel || '').toLowerCase();

    // Category filter
    if (filterTarget === 'attendance' && !(n.isAttendanceRequest || title.includes('attendance') || msg.includes('attendance') || msg.includes('regularization') || msg.includes('punch'))) return false;
    if (filterTarget === 'leave' && !(title.includes('leave') || msg.includes('leave') || msg.includes('time off'))) return false;
    if (filterTarget === 'expenses' && !(title.includes('expense') || msg.includes('expense') || msg.includes('reimbursement'))) return false;
    if (filterTarget === 'payroll' && !(title.includes('payroll') || msg.includes('payroll') || msg.includes('payslip') || msg.includes('salary'))) return false;
    if (filterTarget === 'shift' && !(n.isShiftAssignment || title.includes('shift') || msg.includes('shift'))) return false;

    // Text search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match = title.includes(q) || msg.includes(q) || reason.includes(q) || adminNote.includes(q) || sentBy.includes(q) || badgeLabel.includes(q);
      if (!match) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filterTarget, searchQuery]);

  const allSelectedOnPage = paginated.length > 0 && paginated.every((n: any) => selectedIds.includes(n.id));

  const handleSelectAll = () => {
    if (allSelectedOnPage) {
      setSelectedIds((prev) => prev.filter((id) => !paginated.some((n: any) => n.id === id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...paginated.map((n: any) => n.id)])]);
    }
  };

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-6 right-6 z-[9999] bg-zinc-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Top Header & Summary Stats */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {(user?.role === 'delivery_boy' || user?.role === 'staff') && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              Notifications & Updates
            </h1>
            <p className="text-xs text-zinc-400 font-medium truncate">
              {isAdminOrManager ? 'Management updates & user requests' : 'Your personal attendance requests & updates'}
            </p>
          </div>
        </div>

        {isAdminOrManager && (
          <button
            type="button"
            onClick={() => setShowCompose(true)}
            className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-xs"
          >
            <Plus className="size-3.5 shrink-0" strokeWidth={2.5} />
            New Announcement
          </button>
        )}
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
                    <Bell size={14} />
                  </div>
                  <h3 className="font-bold text-zinc-900 text-sm">New Broadcast Notification</h3>
                </div>
                <button onClick={() => setShowCompose(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Office Schedule Update"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 text-xs transition-all font-medium" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                    placeholder="Write your message here..."
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 text-xs transition-all resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Priority</label>
                  <div className="flex gap-2">
                    {PRIORITY_OPTIONS.map(p => (
                      <button key={p.id} onClick={() => setPriority(p.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${priority === p.id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                          }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priority === p.id ? 'bg-white' : p.dot}`} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Send To</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TARGET_OPTIONS.map(opt => (
                      <button key={opt.id} onClick={() => toggleTarget(opt.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${targets.includes(opt.id) ? opt.color + ' border-current' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                          }`}>
                        <opt.icon size={13} />
                        {opt.label}
                        {targets.includes(opt.id) && <CheckCircle2 size={12} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-100 flex gap-2">
                <button onClick={() => setShowCompose(false)}
                  className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-xs hover:bg-zinc-200 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSend} disabled={!title.trim() || !message.trim() || sending}
                  className="flex-1 py-2 bg-zinc-900 text-white rounded-xl font-bold text-xs hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Send size={14} />{sending ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {notificationToDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-4 border border-zinc-100 relative">
              <button type="button" onClick={() => setNotificationToDelete(null)} className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" aria-label="Close">
                <X size={16} />
              </button>
              <p className="font-bold text-zinc-900 text-sm">Delete Notification?</p>
              <p className="text-xs text-zinc-500 mt-0.5">This item will be permanently deleted.</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setNotificationToDelete(null)}
                  className="flex-1 py-2 border border-zinc-200 rounded-xl font-bold text-xs text-zinc-600 hover:bg-zinc-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => handleDelete(notificationToDelete)}
                  className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold text-xs hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integrated Filter Bar: Category Headings + Search Input */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-2.5 shadow-xs space-y-2.5 md:space-y-0 md:flex md:items-center md:justify-between md:gap-3">
        {/* Left: Category Heading Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 md:pb-0">
          {FILTER_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = filterTarget === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterTarget(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-emerald-400' : 'text-zinc-400'} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Right: Search Box & Bulk Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative min-w-[200px] flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search requests, dates..."
              className="w-full pl-8 pr-7 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors whitespace-nowrap"
            >
              <Trash2 size={12} />
              Delete ({selectedIds.length})
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors whitespace-nowrap"
              title="Delete all notifications"
            >
              <Trash2 size={12} />
              Delete All
            </button>
          )}
        </div>
      </div>

      {/* Sleek Compact Notification Feed List */}
      <div ref={feedRef} className="bg-white border border-zinc-300 rounded-2xl divide-y divide-zinc-300 shadow-xs overflow-hidden">
        {paginated.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Bell size={20} className="text-zinc-300" />
            </div>
            <h3 className="text-xs font-bold text-zinc-900 mb-0.5">No notifications found</h3>
            <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
              {searchQuery ? 'No items match your search filter' : 'No notifications available at this moment.'}
            </p>
          </div>
        ) : (
          paginated.map((n: any) => {
            const isSelected = selectedIds.includes(n.id);
            const isExpanded = expandedIds.includes(n.id);
            const hasDetails = Boolean(n.reason || n.adminNote);

            // Left accent border status color
            const accentClass =
              n.status === 'pending' ? 'border-l-4 border-l-amber-400 bg-amber-50/10' :
              n.status === 'approved' || n.status === 'active' ? 'border-l-4 border-l-emerald-500' :
              n.status === 'rejected' || n.status === 'cancelled' ? 'border-l-4 border-l-rose-500' :
              'border-l-4 border-l-zinc-300';

            return (
              <div
                key={n.id}
                onClick={() => setSelectedIds(prev => prev.includes(n.id) ? prev.filter(id => id !== n.id) : [...prev, n.id])}
                className={`transition-all cursor-pointer select-none ${accentClass} ${
                  isSelected ? 'bg-zinc-100 border-zinc-900 shadow-2xs' : 'hover:bg-zinc-50'
                }`}
              >
                {/* Main Compact Row */}
                <div className="p-3 md:px-4 flex items-center justify-between gap-3">
                  {/* Left: Checkbox + Icon + Title & Snippet */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0 text-zinc-400">
                      {isSelected ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} className="text-zinc-300" />}
                    </div>

                    {/* Category Icon */}
                    <div className="shrink-0 hidden xs:flex w-7 h-7 rounded-lg bg-zinc-100 text-zinc-600 items-center justify-center">
                      {n.isAttendanceRequest ? <ClipboardList size={14} className="text-indigo-600" /> :
                       n.isShiftAssignment ? <Calendar size={14} className="text-emerald-600" /> :
                       <Bell size={14} className="text-purple-600" />}
                    </div>

                    {/* Title, Badge & Text Snippet */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Title */}
                        <span className="font-bold text-xs text-zinc-900 truncate">
                          {n.title}
                        </span>

                        {/* Unique Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${n.badgeColor || 'bg-purple-50 text-purple-800 border-purple-200'}`}>
                          {n.badgeLabel || 'Announcement'}
                        </span>

                        {/* Date Tag */}
                        {n.rangeLabel && (
                          <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                            {n.rangeLabel}
                          </span>
                        )}
                      </div>

                      {/* Snippet summary line */}
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status Pill + Time + Actions */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Status Pill */}
                    {n.status === 'pending' ? (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                        <Clock size={10} className="animate-pulse text-amber-600" />
                        Pending
                      </span>
                    ) : n.status === 'approved' || n.status === 'active' ? (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        <CheckCircle2 size={10} className="text-emerald-600" />
                        {n.status === 'active' ? 'Active' : 'Approved'}
                      </span>
                    ) : n.status === 'rejected' || n.status === 'cancelled' ? (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200/80">
                        <XCircle size={10} className="text-rose-600" />
                        Rejected
                      </span>
                    ) : null}

                    {/* Timestamp */}
                    <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap hidden md:inline">
                      {formatDateTimeIST(n.created_at)}
                    </span>

                    {/* Expand Details Toggle (if reason or adminNote exists) */}
                    {hasDetails && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(n.id); }}
                        className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand Details'}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}

                    {/* Delete Icon */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setNotificationToDelete(n.id); }}
                      className="p-1 text-zinc-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Inline Expandable Details Box */}
                {isExpanded && hasDetails && (
                  <div className="px-4 pb-3 pt-2 text-xs border-t border-zinc-300 bg-zinc-50/70 space-y-2">
                    {n.reason && (
                      <div>
                        <span className="font-bold text-zinc-500 text-[10px] uppercase tracking-wider">Reason / Description:</span>
                        <p className="text-zinc-700 font-medium mt-0.5">{n.reason}</p>
                      </div>
                    )}

                    {n.adminNote && (
                      <div className={`p-2.5 rounded-lg border ${
                        n.status === 'approved' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' :
                        n.status === 'rejected' ? 'bg-rose-50/80 border-rose-200 text-rose-900' :
                        'bg-white border-zinc-200 text-zinc-800'
                      }`}>
                        <div className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider mb-0.5 opacity-80">
                          <AlertCircle size={11} /> Admin Note / Response:
                        </div>
                        <p className="font-semibold">{n.adminNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-zinc-400 font-medium">Page {safePage} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${p === safePage ? 'bg-zinc-900 text-white' : 'text-zinc-600 bg-white hover:bg-zinc-50 border border-zinc-200'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
