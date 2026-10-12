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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const TARGET_OPTIONS = [
  { id: 'all', label: 'Everyone', icon: Users, color: 'bg-purple-50 text-purple-700' },
  { id: 'admin', label: 'Admins', icon: Shield, color: 'bg-destructive/10 text-destructive' },
  { id: 'manager', label: 'Managers', icon: Users, color: 'bg-info/10 text-info' },
  { id: 'delivery_boy', label: 'Delivery Boys', icon: Truck, color: 'bg-accent text-accent-foreground' },
];

const PRIORITY_OPTIONS = [
  { id: 'normal', label: 'Normal', dot: 'bg-muted-foreground/40' },
  { id: 'important', label: 'Important', dot: 'bg-warning' },
  { id: 'urgent', label: 'Urgent', dot: 'bg-destructive' },
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
      badgeColor: req.request_type === 'regularization' ? 'bg-warning/10 text-warning border-warning/25' :
                  req.request_type === 'half_day' ? 'bg-info/10 text-info border-info/25' :
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
      badgeColor: 'bg-accent text-accent-foreground border-primary/20',
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
            className="fixed top-6 right-6 z-[9999] bg-foreground text-white text-sm px-4 py-2.5 rounded-md shadow-xl flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-primary" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Top Header & Summary Stats */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3" >
        <div className="flex items-center gap-3 min-w-0">
          {(user?.role === 'delivery_boy' || user?.role === 'staff') && (
            <Button variant="ghost" size="icon-sm" className="shrink-0"
              type="button"
              onClick={() => navigate(-1)}
              
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Notifications & Updates
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {isAdminOrManager ? 'Management updates & user requests' : 'Your personal attendance requests & updates'}
            </p>
          </div>
        </div>

        {isAdminOrManager && (
          <Button size="sm" className="shrink-0"
            type="button"
            onClick={() => setShowCompose(true)}
            
          >
            <Plus className="size-3.5 shrink-0" strokeWidth={2.5} />
            New Announcement
          </Button>
        )}
      </Card>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-lg overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center text-white">
                    <Bell size={14} />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">New Broadcast Notification</h3>
                </div>
                <button onClick={() => setShowCompose(false)} className="text-muted-foreground/70 hover:text-foreground/70">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Title</label>
                  <Input className="w-full" type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Office Schedule Update"
                     />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Message</label>
                  <Textarea className="w-full" value={message} onChange={e => setMessage(e.target.value)} rows={3}
                    placeholder="Write your message here..."
                     />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Priority</label>
                  <div className="flex gap-2">
                    {PRIORITY_OPTIONS.map(p => (
                      <button key={p.id} onClick={() => setPriority(p.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${priority === p.id ? 'bg-foreground text-white border-foreground' : 'bg-card text-foreground/70 border-border hover:border-input'
                          }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priority === p.id ? 'bg-card' : p.dot}`} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Send To</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TARGET_OPTIONS.map(opt => (
                      <button key={opt.id} onClick={() => toggleTarget(opt.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${targets.includes(opt.id) ? opt.color + ' border-current' : 'bg-card text-muted-foreground border-border hover:border-input'
                          }`}>
                        <opt.icon size={13} />
                        {opt.label}
                        {targets.includes(opt.id) && <CheckCircle2 size={12} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowCompose(false)}
                  >
                  Cancel
                </Button>
                <Button variant="dark" size="sm" className="flex-1" onClick={handleSend} disabled={!title.trim() || !message.trim() || sending}
                  >
                  <Send size={14} />{sending ? 'Sending...' : 'Send Now'}
                </Button>
              </div>
            </DialogContent>
</Dialog>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {notificationToDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-xl shadow-xl w-full max-w-sm p-4 border border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" type="button" onClick={() => setNotificationToDelete(null)}  aria-label="Close">
                <X size={16} />
              </Button>
              <p className="font-semibold text-foreground text-sm">Delete Notification?</p>
              <p className="text-xs text-muted-foreground mt-0.5">This item will be permanently deleted.</p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setNotificationToDelete(null)}
                  >
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(notificationToDelete)}
                  >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integrated Filter Bar: Category Headings + Search Input */}
      <Card className="p-2.5 space-y-2.5 md:space-y-0 md:flex md:items-center md:justify-between md:gap-3" >
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
                    ? 'bg-foreground text-white border-foreground shadow-xs'
                    : 'bg-muted text-foreground/70 border-border hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-primary' : 'text-muted-foreground/70'} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Right: Search Box & Bulk Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative min-w-[200px] flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={13} />
            <Input className="w-full pl-8 pr-7"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search requests, dates..."
              
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground/70"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {selectedIds.length > 0 && (
            <Button variant="outline" size="sm" className="whitespace-nowrap bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/15"
              type="button"
              onClick={handleBulkDelete}
              
            >
              <Trash2 size={12} />
              Delete ({selectedIds.length})
            </Button>
          )}

          {notifications.length > 0 && (
            <Button variant="secondary" size="sm" className="whitespace-nowrap hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
              type="button"
              onClick={handleDeleteAll}
              
              title="Delete all notifications"
            >
              <Trash2 size={12} />
              Delete All
            </Button>
          )}
        </div>
      </Card>

      {/* Sleek Compact Notification Feed List */}
      <Card className="border-input divide-y divide-input overflow-hidden" ref={feedRef} >
        {paginated.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-2">
              <Bell size={20} className="text-muted-foreground/50" />
            </div>
            <h3 className="text-xs font-semibold text-foreground mb-0.5">No notifications found</h3>
            <p className="text-[11px] text-muted-foreground/70 max-w-xs mx-auto">
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
              n.status === 'pending' ? 'border-l-4 border-l-amber-400 bg-warning/10' :
              n.status === 'approved' || n.status === 'active' ? 'border-l-4 border-l-emerald-500' :
              n.status === 'rejected' || n.status === 'cancelled' ? 'border-l-4 border-l-rose-500' :
              'border-l-4 border-l-zinc-300';

            return (
              <div
                key={n.id}
                onClick={() => setSelectedIds(prev => prev.includes(n.id) ? prev.filter(id => id !== n.id) : [...prev, n.id])}
                className={`transition-all cursor-pointer select-none ${accentClass} ${
                  isSelected ? 'bg-secondary border-foreground shadow-2xs' : 'hover:bg-muted'
                }`}
              >
                {/* Main Compact Row */}
                <div className="p-3 md:px-4 flex items-center justify-between gap-3">
                  {/* Left: Checkbox + Icon + Title & Snippet */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0 text-muted-foreground/70">
                      {isSelected ? <CheckSquare size={16} className="text-foreground" /> : <Square size={16} className="text-muted-foreground/50" />}
                    </div>

                    {/* Category Icon */}
                    <div className="shrink-0 hidden xs:flex w-7 h-7 rounded-lg bg-secondary text-foreground/70 items-center justify-center">
                      {n.isAttendanceRequest ? <ClipboardList size={14} className="text-indigo-600" /> :
                       n.isShiftAssignment ? <Calendar size={14} className="text-primary" /> :
                       <Bell size={14} className="text-purple-600" />}
                    </div>

                    {/* Title, Badge & Text Snippet */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Title */}
                        <span className="font-semibold text-xs text-foreground truncate">
                          {n.title}
                        </span>

                        {/* Unique Badge */}
                        <Badge className={`${n.badgeColor || 'bg-purple-50 text-purple-800 border-purple-200'}`}>
                          {n.badgeLabel || 'Announcement'}
                        </Badge>

                        {/* Date Tag */}
                        {n.rangeLabel && (
                          <Badge>
                            {n.rangeLabel}
                          </Badge>
                        )}
                      </div>

                      {/* Snippet summary line */}
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status Pill + Time + Actions */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Status Pill */}
                    {n.status === 'pending' ? (
                      <Badge variant="warning" className="hidden sm:inline-flex" >
                        <Clock size={10} className="animate-pulse text-warning" />
                        Pending
                      </Badge>
                    ) : n.status === 'approved' || n.status === 'active' ? (
                      <Badge variant="success" className="hidden sm:inline-flex" >
                        <CheckCircle2 size={10} className="text-primary" />
                        {n.status === 'active' ? 'Active' : 'Approved'}
                      </Badge>
                    ) : n.status === 'rejected' || n.status === 'cancelled' ? (
                      <Badge variant="danger" className="hidden sm:inline-flex" >
                        <XCircle size={10} className="text-destructive" />
                        Rejected
                      </Badge>
                    ) : null}

                    {/* Timestamp */}
                    <span className="text-[11px] text-muted-foreground/70 font-medium whitespace-nowrap hidden md:inline">
                      {formatDateTimeIST(n.created_at)}
                    </span>

                    {/* Expand Details Toggle (if reason or adminNote exists) */}
                    {hasDetails && (
                      <Button variant="ghost" size="icon-sm"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(n.id); }}
                        
                        title={isExpanded ? 'Collapse' : 'Expand Details'}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                    )}

                    {/* Delete Icon */}
                    <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setNotificationToDelete(n.id); }}
                      
                      title="Delete notification"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                {/* Inline Expandable Details Box */}
                {isExpanded && hasDetails && (
                  <div className="px-4 pb-3 pt-2 text-xs border-t border-input bg-muted/70 space-y-2">
                    {n.reason && (
                      <div>
                        <span className="font-medium text-muted-foreground text-xs">Reason / Description:</span>
                        <p className="text-foreground/85 font-medium mt-0.5">{n.reason}</p>
                      </div>
                    )}

                    {n.adminNote && (
                      <div className={`p-2.5 rounded-lg border ${
                        n.status === 'approved' ? 'bg-accent/80 border-primary/20 text-accent-foreground' :
                        n.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                        'bg-card border-border text-foreground'
                      }`}>
                        <div className="flex items-center gap-1 font-medium text-xs mb-0.5 opacity-80">
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
      </Card>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground/70 font-medium">Page {safePage} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
              >
              Prev
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${p === safePage ? 'bg-foreground text-white' : 'text-foreground/70 bg-card hover:bg-muted border border-border'}`}>
                {p}
              </button>
            ))}
            <Button variant="outline" size="xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
              >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
