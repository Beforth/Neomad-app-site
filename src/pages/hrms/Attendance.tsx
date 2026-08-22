import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  UserCheck, UserX, Clock, Plus, X, Save,
  CheckCircle2, Download, Shield, Search, MapPin, Loader2,
  Settings as SettingsIcon, Navigation, LogIn, LogOut,
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown, Inbox, XCircle, ClipboardList,
  ThumbsUp, ThumbsDown, Bell, Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUsers, mapBackendRoleToFrontend } from '../../lib/api';
import { appApi, APP_NOTIFICATIONS_UPDATED_EVENT } from '../../lib/appApi';
import SearchableSelect from '../../components/SearchableSelect';
import { toDateStr } from '../../lib/hrmsAttendance';
import {
  getAttendanceRecords,
  getAttendanceSummary,
  punchAttendance,
  markAttendanceRecord,
  getAttendanceRequests,
  resolveAttendanceRequest,
  editAttendanceRequest,
  getHrmsSettings,
  updateHrmsSettings,
  type AttendanceRecordOut,
  type AttendanceMarkBody,
  type AttendanceRequestOut,
  type AttendanceRequestType,
  type AttendanceSummaryOut,
} from '../../lib/hrmsApi';

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  absent: 'bg-red-50 text-red-700 border-red-100',
  late: 'bg-amber-50 text-amber-700 border-amber-100',
  half_day: 'bg-blue-50 text-blue-700 border-blue-100',
  overtime: 'bg-violet-50 text-violet-700 border-violet-100',
};

const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
  overtime: 'Overtime',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half Day' },
];

const REQUEST_TYPE_LABELS: Record<string, string> = {
  regularization: 'Missed Punch',
  half_day: 'Request Half day',
  full_day_change: 'Full Day Request',
};

const REQUEST_TYPE_STYLES: Record<string, string> = {
  regularization: 'bg-zinc-50 text-zinc-600',
  half_day: 'bg-blue-50 text-blue-700',
  full_day_change: 'bg-violet-50 text-violet-700',
};

const PAGE_SIZE = 10;

function formatHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return hrs > 0 || mins > 0 ? `${hrs}h ${mins}m` : '\u2014';
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function timeNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function Modal({ title, onClose, children, closeOnBackdropClick = true }: { title: string; onClose: () => void; children: React.ReactNode; closeOnBackdropClick?: boolean }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { if (closeOnBackdropClick) onClose(); else e.preventDefault(); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
      onClick={closeOnBackdropClick ? onClose : undefined} onKeyDown={handleKeyDown} role="dialog" aria-modal="true">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors"><X size={20} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

const inputClassName = "w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all";

interface AttendanceSettings {
  officeName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

const DEFAULT_SETTINGS: AttendanceSettings = {
  officeName: 'Neomed Office, Nashik',
  latitude: 19.9975,
  longitude: 73.7898,
  radiusMeters: 500,
};

export default function Attendance() {
  const { user: currentUser, token } = useAuth();
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [records, setRecords] = useState<AttendanceRecordOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [dateFrom, setDateFrom] = useState(monthStartStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [sortField, setSortField] = useState<'staff' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [showPunchModal, setShowPunchModal] = useState(false);
  const [punchMode, setPunchMode] = useState<'in' | 'out'>('in');
  const [punchStaffId, setPunchStaffId] = useState('');
  const [punchDates, setPunchDates] = useState<string[]>([toDateStr(new Date())]);
  const [punchTime, setPunchTime] = useState<string>(timeNow());
  const [punchLoading, setPunchLoading] = useState(false);

  // ── Direct Attendance Record Edit state (Admin) ──
  const [editRecordTarget, setEditRecordTarget] = useState<AttendanceRecordOut | null>(null);
  const [recordCheckIn, setRecordCheckIn] = useState<string>('');
  const [recordCheckOut, setRecordCheckOut] = useState<string>('');
  const [recordStatus, setRecordStatus] = useState<string>('present');
  const [recordSaving, setRecordSaving] = useState<boolean>(false);

  const handleAddPunchDate = () => {
    setPunchDates(prev => [...prev, toDateStr(new Date())]);
  };

  const handleRemovePunchDate = (index: number) => {
    setPunchDates(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePunchDate = (index: number, val: string) => {
    setPunchDates(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };
  const [geoStatus, setGeoStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [geoDistance, setGeoDistance] = useState<number | null>(null);
  const [geoPosition, setGeoPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState('');

  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [summary, setSummary] = useState<AttendanceSummaryOut>({ total_staff: 0, present_today: 0, absent_today: 0 });

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // ── Tab state synced with URL search params ──
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = (tabFromUrl === 'requests' || tabFromUrl === 'records') ? tabFromUrl : 'records';

  const [activeTab, setActiveTabState] = useState<'records' | 'requests'>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'requests' || t === 'records') {
      setActiveTabState(t);
    }
  }, [searchParams]);

  const setActiveTab = (tab: 'records' | 'requests') => {
    setActiveTabState(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };
  const [allRequests, setAllRequests] = useState<AttendanceRequestOut[]>([]);
  const [rejectTarget, setRejectTarget] = useState<AttendanceRequestOut | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // ── Edit request state ──
  const [editTarget, setEditTarget] = useState<AttendanceRequestOut | null>(null);
  const [editFromDate, setEditFromDate] = useState('');
  const [editToDate, setEditToDate] = useState('');
  const [editReqType, setEditReqType] = useState<AttendanceRequestType>('regularization');
  const [editFromTime, setEditFromTime] = useState('');
  const [editToTime, setEditToTime] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const pendingRequestsCount = allRequests.filter(r => r.status === 'pending').length;

  const refreshRequests = async () => {
    if (!token) return;
    try {
      const requestsData = await getAttendanceRequests(token);
      setAllRequests(requestsData);
    } catch (error) {
      console.error('Failed to load attendance requests:', error);
      showToast(error instanceof Error ? error.message : 'Failed to load requests');
    }
  };

  const isPunchingSelf = String(punchStaffId) === String(currentUser?.id);
  const isWithinRadius = geoDistance !== null && geoDistance <= settings.radiusMeters;
  const canPunch = isPunchingSelf ? (geoStatus === 'success' && isWithinRadius) : true;

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (showPunchModal && isPunchingSelf) {
      handleGeoClick();
    }
  }, [showPunchModal, isPunchingSelf]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, searchDebounced, dateFrom, dateTo, sortField, sortDir]);

  const toggleSort = (key: 'staff' | 'date') => {
    if (sortField === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(key); setSortDir('asc'); }
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Load users for staff dropdown
      const usersData = await getUsers(token);
      const users = usersData.map((u: any) => ({
        id: u.id,
        name: u.full_name || u.email.split('@')[0],
        email: u.email,
        role: mapBackendRoleToFrontend(u.role_codes),
      }));
      setAllStaff(users);

      // Load attendance records from API
      const recordsData = await getAttendanceRecords(token, {
        from_date: dateFrom,
        to_date: dateTo,
        status_: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setRecords(recordsData);

      // Load attendance summary
      const summaryData = await getAttendanceSummary(token);
      setSummary(summaryData);

      // Load HRMS settings (office location + geo-fence)
      try {
        const settingsData = await getHrmsSettings(token);
        setSettings(prev => ({
          officeName: settingsData.office_name,
          latitude: settingsData.latitude ?? prev.latitude,
          longitude: settingsData.longitude ?? prev.longitude,
          radiusMeters: settingsData.radius_meters,
        }));
      } catch { /* keep defaults if settings endpoint unavailable */ }

      // Load requests if on requests tab
      if (activeTab === 'requests') {
        const requestsData = await getAttendanceRequests(token);
        setAllRequests(requestsData);
      }
    } catch (error) {
      console.error('Failed to load attendance data:', error);
      showToast(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const fetchLocation = useCallback(() => {
    return new Promise<{ lat: number; lng: number; distance: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const dist = getDistance(settings.latitude, settings.longitude, latitude, longitude);
          resolve({ lat: latitude, lng: longitude, distance: dist });
        },
        (err) => {
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, [settings.latitude, settings.longitude]);

  const resetGeoState = () => {
    setGeoStatus('idle');
    setGeoDistance(null);
    setGeoPosition(null);
    setGeoError('');
  };

  const handleGeoClick = async () => {
    setGeoStatus('fetching');
    setGeoError('');
    try {
      const loc = await fetchLocation();
      setGeoPosition({ lat: loc.lat, lng: loc.lng });
      setGeoDistance(loc.distance);
      setGeoStatus('success');
    } catch (err: any) {
      setGeoStatus('error');
      if (err.code === 1) {
        setGeoError('Location access denied. Please enable location permissions.');
      } else if (err.code === 2) {
        setGeoError('Location unavailable. Please try again.');
      } else if (err.code === 3) {
        setGeoError('Location request timed out. Please try again.');
      } else {
        setGeoError(err.message || 'Failed to get location.');
      }
    }
  };

  const handlePunchSubmit = async () => {
    if (!token) {
      showToast('Authentication required');
      return;
    }
    const staffId = parseInt(punchStaffId, 10);
    if (isNaN(staffId)) { showToast('Please select a staff member.'); return; }

    if (isPunchingSelf && geoStatus !== 'success') {
      showToast('Please fetch your location first.');
      return;
    }
    if (isPunchingSelf && geoDistance !== null && geoDistance > settings.radiusMeters) {
      showToast(`You are ${Math.round(geoDistance)}m from office. Maximum allowed is ${settings.radiusMeters}m.`);
      return;
    }

    const validDates = Array.from(new Set(punchDates.filter(Boolean)));
    if (validDates.length === 0) {
      showToast('Please select at least one valid date.');
      return;
    }

    setPunchLoading(true);
    
    try {
      for (const d of validDates) {
        await punchAttendance(token, {
          mode: punchMode,
          staff_id: staffId,
          date: d,
          time: punchTime || undefined,
          lat: geoPosition?.lat,
          lng: geoPosition?.lng,
          distance_from_office: geoDistance !== null ? geoDistance : undefined,
        });
      }
      
      showToast(`Punched ${punchMode === 'in' ? 'in' : 'out'} for ${validDates.length} date(s)${punchTime ? ` at ${punchTime}` : ''}`);
      
      // Refresh records
      await fetchData();
      
      setShowPunchModal(false);
      resetGeoState();
    } catch (error) {
      console.error('Punch failed:', error);
      showToast(error instanceof Error ? error.message : 'Punch failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleSaveRecordEdit = async () => {
    if (!token || !editRecordTarget) return;
    setRecordSaving(true);
    try {
      await markAttendanceRecord(token, editRecordTarget.user_id, editRecordTarget.date, {
        check_in: recordCheckIn || null,
        check_out: recordCheckOut || null,
        status: recordStatus as any,
      });
      showToast(`Attendance updated for ${editRecordTarget.staff_name || 'staff'}`);
      await fetchData();
      setEditRecordTarget(null);
    } catch (error) {
      console.error('Failed to update attendance record:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update record');
    } finally {
      setRecordSaving(false);
    }
  };

  const handleApproveRequest = async (req: AttendanceRequestOut) => {
    if (!token) {
      showToast('Authentication required');
      return;
    }
    
    try {
      await resolveAttendanceRequest(token, req.id, {
        status: 'approved',
      });
      
      showToast(`Approved attendance for ${req.employee_username || 'staff'}`);

      // Send notification
      const toLabel = new Date(req.to_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short' });
      const fromLabel = new Date(req.from_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short' });
      const rangeLabel = req.from_date === req.to_date ? fromLabel : `${fromLabel} → ${toLabel}`;
      const typeLabel = REQUEST_TYPE_LABELS[req.request_type] || 'attendance';
      const timeLabel = req.from_time || req.to_time ? ` (${req.from_time || '--'}–${req.to_time || '--'})` : '';
      appApi.saveNotification({
        title: 'Attendance Approved',
        message: `Your ${typeLabel.toLowerCase()} request for ${rangeLabel}${timeLabel} has been approved by ${currentUser?.username ?? 'Admin'}.`,
        targets: ['all'],
        priority: 'normal',
        sentBy: currentUser?.username ?? 'Admin',
      });
      
      // Refresh requests
      const requestsData = await getAttendanceRequests(token);
      setAllRequests(requestsData);
      
      // Refresh records to show newly created records
      await fetchData();
    } catch (error) {
      console.error('Failed to approve request:', error);
      showToast(error instanceof Error ? error.message : 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (req: AttendanceRequestOut, note: string) => {
    if (!token) {
      showToast('Authentication required');
      return;
    }
    
    try {
      await resolveAttendanceRequest(token, req.id, {
        status: 'rejected',
        notes: note.trim() || undefined,
      });
      
      showToast(`Rejected attendance request from ${req.employee_username || 'staff'}`);

      // Send notification with the reason
      const toLabel = new Date(req.to_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short' });
      const fromLabel = new Date(req.from_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short' });
      const rangeLabel = req.from_date === req.to_date ? fromLabel : `${fromLabel} → ${toLabel}`;
      const typeLabel = REQUEST_TYPE_LABELS[req.request_type] || 'attendance';
      appApi.saveNotification({
        title: 'Attendance Request Rejected',
        message: `Your ${typeLabel.toLowerCase()} request for ${rangeLabel} was not approved by ${currentUser?.username ?? 'Admin'}.${note.trim() ? ` Reason: ${note.trim()}` : ''}`,
        targets: ['all'],
        priority: 'normal',
        sentBy: currentUser?.username ?? 'Admin',
      });

      // Refresh requests
      const requestsData = await getAttendanceRequests(token);
      setAllRequests(requestsData);
      
      setRejectTarget(null);
      setRejectNote('');
    } catch (error) {
      console.error('Failed to reject request:', error);
      showToast(error instanceof Error ? error.message : 'Failed to reject request');
    }
  };

  const openEditRequest = (req: AttendanceRequestOut) => {
    setEditTarget(req);
    setEditFromDate(req.from_date);
    setEditToDate(req.to_date);
    setEditReqType(req.request_type || 'regularization');
    setEditFromTime(req.from_time || '');
    setEditToTime(req.to_time || '');
    setEditReason(req.reason || '');
  };

  const handleEditRequestSubmit = async () => {
    if (!token || !editTarget) return;
    setEditSaving(true);
    try {
      await editAttendanceRequest(token, editTarget.id, {
        from_date: editFromDate,
        to_date: editReqType === 'regularization' ? editToDate : editFromDate,
        request_type: editReqType,
        from_time: editReqType === 'half_day' ? editFromTime || null : null,
        to_time: editReqType === 'half_day' ? editToTime || null : null,
        reason: editReason.trim() || undefined,
      });
      showToast('Request updated');

      // Notify the employee about the update
      const toLabel = new Date(editFromDate + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short' });
      appApi.saveNotification({
        title: 'Attendance Request Updated',
        message: `Your ${(REQUEST_TYPE_LABELS[editReqType] || 'attendance').toLowerCase()} request for ${toLabel} was updated by ${currentUser?.username ?? 'Admin'}.`,
        targets: ['all'],
        priority: 'normal',
        sentBy: currentUser?.username ?? 'Admin',
      });

      const requestsData = await getAttendanceRequests(token);
      setAllRequests(requestsData);
      await fetchData();
      setEditTarget(null);
    } catch (error) {
      console.error('Failed to edit request:', error);
      showToast(error instanceof Error ? error.message : 'Failed to edit request');
    } finally {
      setEditSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!token) {
      showToast('Authentication required');
      return;
    }
    setSettingsSaving(true);
    try {
      await updateHrmsSettings(token, {
        office_name: settings.officeName,
        latitude: settings.latitude,
        longitude: settings.longitude,
        radius_meters: settings.radiusMeters,
      });
      setShowSettings(false);
      showToast('Office location settings saved.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSettings(prev => ({
            ...prev,
            latitude: parseFloat(pos.coords.latitude.toFixed(4)),
            longitude: parseFloat(pos.coords.longitude.toFixed(4)),
          }));
          showToast('Current location set as office.');
        },
        () => showToast('Failed to get current location.')
      );
    }
  };

  const filtered = useMemo(() => {
    let result = records.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      if (searchDebounced) {
        const q = searchDebounced.toLowerCase();
        if (!r.staff_name?.toLowerCase().includes(q) && !r.staff_email?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    result.sort((a, b) => {
      const cmp = sortField === 'staff'
        ? (a.staff_name || '').localeCompare(b.staff_name || '')
        : a.date.localeCompare(b.date);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [records, statusFilter, dateFrom, dateTo, searchDebounced, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = search || statusFilter !== 'all' || dateFrom !== monthStartStr() || dateTo !== todayStr();

  const stats = useMemo(() => {
    return {
      totalStaff: summary.total_staff,
      presentToday: summary.present_today,
      absentToday: summary.absent_today,
    };
  }, [summary]);

  const handleExport = () => {
    const headers = ['Date', 'Staff', 'Email', 'Check In', 'Check Out', 'Hours', 'Overtime', 'Status', 'Distance (m)', 'Marked By'];
    const rows = filtered.map(r => [
      r.date, r.staff_name, r.staff_email, r.check_in || '', r.check_out || '',
      r.hours_worked ? String(r.hours_worked) : '', r.overtime ? `+${r.overtime}h` : '',
      STATUS_LABELS[r.status] || r.status,
      r.distance_from_office !== null ? String(r.distance_from_office) : 'Manual',
      r.marked_by_name || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance-${dateFrom}-to-${dateTo}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('Attendance exported as CSV.');
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-[9999] bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Attendance</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Track staff attendance with geo-fenced punch in/out</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
              <SettingsIcon size={14} />
              Office Settings
            </button>
          )}
          <button onClick={handleExport}
            className="flex items-center gap-2 bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
            <Download size={14} />
            Export CSV
          </button>
          <button onClick={() => { setPunchMode('in'); setPunchStaffId(currentUser?.id ? String(currentUser.id) : ''); setPunchDates([toDateStr(new Date())]); setPunchTime(timeNow()); resetGeoState(); setShowPunchModal(true); }}
            className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
            <LogIn size={14} />
            Punch In / Out
          </button>
          {canManage && (
            <button onClick={() => { setPunchMode('in'); setPunchStaffId(''); setPunchDates([toDateStr(new Date())]); setPunchTime(timeNow()); resetGeoState(); setShowPunchModal(true); }}
              className="flex items-center gap-2 bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
              <Plus size={14} />
              Mark for Staff
            </button>
          )}
        </div>
      </motion.header>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Staff', value: stats.totalStaff, icon: Shield, color: 'bg-blue-50 text-blue-600' },
          { label: 'Present Today', value: stats.presentToday, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Absent Today', value: stats.absentToday, icon: UserX, color: 'bg-red-50 text-red-600' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">{card.value}</p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
      {/* Tab Switcher */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'records'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <ClipboardList size={13} />
          Records
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('requests'); refreshRequests(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'requests'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Bell size={13} />
          Requests
          {pendingRequestsCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full leading-none">
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'requests' ? (
        /* ── Requests Tab ── */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden"
        >
          {allRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
                <Inbox size={24} className="text-zinc-300" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">No attendance requests</h3>
              <p className="text-xs text-zinc-400">Employees can submit regularization requests from their attendance page.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Employee</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Range</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Type</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Days</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reason</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Submitted</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                    {canManage && <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {[...allRequests]
                    .sort((a, b) => {
                      if (a.status === 'pending' && b.status !== 'pending') return -1;
                      if (b.status === 'pending' && a.status !== 'pending') return 1;
                      return b.submitted_at.localeCompare(a.submitted_at);
                    })
                    .map((req, i) => {
                      const statusBadge =
                        req.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                        req.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                        'bg-amber-50 text-amber-700';
                      const fromLabel = new Date(req.from_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
                      const toLabel = new Date(req.to_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
                      const submittedLabel = new Date(req.submitted_at).toLocaleDateString('default', { day: 'numeric', month: 'short' });
                      return (
                        <motion.tr
                          key={req.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-zinc-50/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-600 shrink-0">
                                {(req.employee_username?.[0] ?? '?').toUpperCase()}
                              </div>
                              <span className="text-xs font-semibold text-zinc-900">{req.employee_username}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-600 whitespace-nowrap">
                            {req.from_date === req.to_date ? fromLabel : `${fromLabel} \u2192 ${toLabel}`}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${REQUEST_TYPE_STYLES[req.request_type] || 'bg-zinc-50 text-zinc-600'}`}>
                              {REQUEST_TYPE_LABELS[req.request_type] || 'Request'}
                            </span>
                            {(req.from_time || req.to_time) && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 mt-1">
                                <Clock size={10} /> {req.from_time || '--'}–{req.to_time || '--'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-zinc-900">{req.days}</td>
                          <td className="px-4 py-3 text-xs text-zinc-500 max-w-[200px] truncate" title={req.reason}>{req.reason}</td>
                          <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{submittedLabel}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${statusBadge}`}>
                              {req.status}
                            </span>
                            {req.notes && (
                              <p className="text-[10px] text-zinc-400 mt-0.5 italic truncate max-w-[120px]" title={req.notes}>{req.notes}</p>
                            )}
                          </td>
                          {canManage && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {req.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveRequest(req)}
                                      className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                      title="Approve"
                                    >
                                      <CheckCircle2 size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setRejectTarget(req); setRejectNote(''); }}
                                      className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Reject"
                                    >
                                      <XCircle size={15} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditRequest(req)}
                                  className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                                  title="Edit request"
                                >
                                  <Pencil size={15} />
                                </button>
                              </div>
                              {req.status !== 'pending' && (
                                <span className="text-[10px] text-zinc-300 mt-1 block">
                                  {req.resolved_by_name ? `by ${req.resolved_by_name}` : '—'}
                                </span>
                              )}
                            </td>
                          )}
                        </motion.tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      ) : (
        /* ── Records Tab ── */
        <>
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center"
          >
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
              />
            </div>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="h-8 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all" />

            {/* Name Sort Filter */}
            <button
              type="button"
              onClick={() => toggleSort('staff')}
              className={`h-8 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0 ${
                sortField === 'staff'
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
              }`}
              title="Sort by Name (A-Z / Z-A)"
            >
              <ArrowUpDown size={13} className={sortField === 'staff' ? 'text-emerald-400' : 'text-zinc-400'} />
              <span>
                Name {sortField === 'staff' ? (sortDir === 'asc' ? '(A-Z)' : '(Z-A)') : 'Sort'}
              </span>
            </button>

            <div className="w-[160px]">
              <SearchableSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
                className="w-full"
              />
            </div>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setSearchDebounced(''); setStatusFilter('all'); setDateFrom(monthStartStr()); setDateTo(todayStr()); setSortField('date'); setSortDir('desc'); }}
                className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
              >
                <XCircle size={12} />Clear
              </button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden"
          >
            {loading ? (
              <div className="p-12 text-center text-zinc-500 text-sm">Loading attendance records...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
                  <Inbox size={24} className="text-zinc-300" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">No attendance records found</h3>
                <p className="text-xs text-zinc-400 max-w-xs">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/50 border-b border-zinc-100">
                      <tr>
                        <th onClick={() => toggleSort('staff')} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600 select-none">
                          <span className="flex items-center gap-1">Staff{sortField !== 'staff' ? <ArrowUpDown size={12} className="text-zinc-300" /> : sortDir === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />}</span>
                        </th>
                        <th onClick={() => toggleSort('date')} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600 select-none">
                          <span className="flex items-center gap-1">Date{sortField !== 'date' ? <ArrowUpDown size={12} className="text-zinc-300" /> : sortDir === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />}</span>
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Check In</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Check Out</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Hours</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Overtime</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Location</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Marked By</th>
                        {canManage && <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {paged.map((r, i) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-zinc-50/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 border border-zinc-200 shadow-sm shrink-0">
                                {(r.staff_name?.[0] ?? '?').toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-zinc-900">{r.staff_name}</p>
                                <p className="text-[10px] text-zinc-500">{r.staff_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-600">{r.date}</td>
                          <td className="py-3 px-4 text-xs text-zinc-900 font-medium">{r.check_in || '—'}</td>
                          <td className="py-3 px-4 text-xs text-zinc-900 font-medium">{r.check_out || '—'}</td>
                          <td className="py-3 px-4 text-xs text-zinc-600">{formatHours(r.hours_worked)}</td>
                          <td className="py-3 px-4">
                            {r.overtime > 0 ? (
                              <span className="text-xs font-medium text-violet-600">+{r.overtime}h</span>
                            ) : (
                              <span className="text-xs text-zinc-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-zinc-700">
                            {r.punch_in_lat !== null && r.punch_in_lat !== undefined && r.punch_in_lng !== null && r.punch_in_lng !== undefined ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-zinc-900 flex items-center gap-1">
                                  <MapPin size={11} className="text-emerald-600 shrink-0" />
                                  {Number(r.punch_in_lat).toFixed(4)}, {Number(r.punch_in_lng).toFixed(4)}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-sans">
                                  ({Math.round(r.distance_from_office ?? 0)}m away)
                                </span>
                              </div>
                            ) : r.distance_from_office !== null && r.distance_from_office !== undefined ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-zinc-900 flex items-center gap-1">
                                  <MapPin size={11} className="text-blue-600 shrink-0" />
                                  {settings.latitude?.toFixed(4) || '18.5204'}, {settings.longitude?.toFixed(4) || '73.8567'}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-sans">
                                  ({Math.round(r.distance_from_office)}m away)
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-semibold text-zinc-800 flex items-center gap-1">
                                  <MapPin size={11} className="text-zinc-500 shrink-0" />
                                  {settings.latitude?.toFixed(4) || '18.5204'}, {settings.longitude?.toFixed(4) || '73.8567'}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-sans">
                                  (0m away)
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${STATUS_STYLES[r.status] || ''}`}>
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500">{r.marked_by_name || 'self'}</td>
                          {canManage && (
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditRecordTarget(r);
                                  setRecordCheckIn(r.check_in || '');
                                  setRecordCheckOut(r.check_out || '');
                                  setRecordStatus(r.status || 'present');
                                }}
                                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                                title="Edit attendance time & status"
                              >
                                <Pencil size={15} />
                              </button>
                            </td>
                          )}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-zinc-100">
                  {paged.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 border border-zinc-200 shadow-sm shrink-0">
                            {(r.staff_name?.[0] ?? '?').toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900">{r.staff_name}</p>
                            <p className="text-[10px] text-zinc-500">{r.date}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${STATUS_STYLES[r.status] || ''}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-zinc-500">In:</span> <span className="font-medium text-zinc-900 ml-1">{r.check_in || '—'}</span></div>
                        <div><span className="text-zinc-500">Out:</span> <span className="font-medium text-zinc-900 ml-1">{r.check_out || '—'}</span></div>
                        <div><span className="text-zinc-500">Hours:</span> <span className="font-medium text-zinc-900 ml-1">{formatHours(r.hours_worked)}</span></div>
                        {(r.overtime_amount ?? 0) > 0 && <div><span className="text-zinc-500">OT:</span> <span className="font-medium text-violet-600 ml-1">+₹{r.overtime_amount}</span></div>}
                        {(r.penalty_amount ?? 0) > 0 && <div><span className="text-zinc-500">Penalty:</span> <span className="font-medium text-rose-600 ml-1">−₹{r.penalty_amount}</span></div>}
                        {!(r.overtime_amount ?? 0) && r.overtime > 0 && <div><span className="text-zinc-500">OT:</span> <span className="font-medium text-violet-600 ml-1">+{r.overtime}h</span></div>}
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-400">Loc:</span>
                          {r.distance_from_office !== null ? (
                            <span className={`font-semibold ml-1 ${r.distance_from_office <= settings.radiusMeters ? 'text-emerald-600' : 'text-amber-600'}`}>
                              <MapPin size={10} className="inline" /> {r.distance_from_office}m
                            </span>
                          ) : (
                            <span className="font-semibold text-blue-600 ml-1"><Shield size={10} className="inline" /> Manual</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {filtered.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-white">
                    <p className="text-xs text-zinc-500">
                      Showing {startRow}–{endRow} of {filtered.length} records
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === page ? 'bg-zinc-100 text-zinc-800 border border-zinc-300' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}

      {/* Reject Confirmation Modal */}
      {rejectTarget && (
        <Modal title="Reject Attendance Request" onClose={() => { setRejectTarget(null); setRejectNote(''); }}>
          <div className="p-5 space-y-4">
            <p className="text-sm text-zinc-600">
              Rejecting request from <strong className="text-zinc-900">{rejectTarget.employee_username}</strong> for{' '}
              <strong className="text-zinc-900">{rejectTarget.days} day{rejectTarget.days > 1 ? 's' : ''}</strong> from{' '}
              <strong className="text-zinc-900">
                {new Date(rejectTarget.from_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                {rejectTarget.from_date !== rejectTarget.to_date
                  ? ` \u2192 ${new Date(rejectTarget.to_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : ''}
              </strong>.
            </p>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Rejection Note (optional)</label>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                rows={2}
                placeholder="Reason for rejection..."
                className={inputClassName}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setRejectTarget(null); setRejectNote(''); }}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => handleRejectRequest(rejectTarget, rejectNote)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors">
                <ThumbsDown size={14} /> Reject
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Request Modal */}
      {editTarget && (
        <Modal title={`Edit Request${editTarget.employee_username ? ` — ${editTarget.employee_username}` : ''}`} onClose={() => setEditTarget(null)}>
          <div className="p-5 space-y-4">
            <p className="text-xs text-zinc-500">
              Update the submitted request. If the request is already approved, the attendance record is re-marked according to the new type.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['regularization', 'half_day', 'full_day_change'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditReqType(t)}
                  className={`px-2 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                    editReqType === t
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  {REQUEST_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">From Date</label>
                <input type="date" value={editFromDate} onChange={e => setEditFromDate(e.target.value)} className={inputClassName} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">To Date</label>
                <input
                  type="date"
                  value={editReqType === 'regularization' ? editToDate : editFromDate}
                  min={editFromDate || undefined}
                  disabled={editReqType !== 'regularization'}
                  onChange={e => setEditToDate(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>
            {editReqType === 'half_day' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">From Time</label>
                  <input type="time" value={editFromTime} onChange={e => setEditFromTime(e.target.value)} className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">To Time</label>
                  <input type="time" value={editToTime} onChange={e => setEditToTime(e.target.value)} className={inputClassName} />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Reason</label>
              <textarea
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                rows={2}
                className={inputClassName}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditTarget(null)}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleEditRequestSubmit} disabled={editSaving || !editFromDate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {editSaving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showPunchModal && (
        <Modal title="Punch Attendance" onClose={() => { setShowPunchModal(false); resetGeoState(); }}>
          <div className="p-5 space-y-4">
            {toast && (
              <div className="p-3 bg-zinc-900 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-md">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>{toast}</span>
              </div>
            )}
            <div className="flex items-center bg-zinc-100 rounded-xl p-1">
              <button type="button" onClick={() => setPunchMode('in')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${punchMode === 'in' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                <LogIn size={16} />
                Punch In
              </button>
              <button type="button" onClick={() => setPunchMode('out')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${punchMode === 'out' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                <LogOut size={16} />
                Punch Out
              </button>
            </div>
            {canManage && !punchStaffId && (
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Staff Member</label>
                <SearchableSelect
                  options={allStaff.map(s => ({ value: String(s.id), label: `${s.name} (${s.role})` }))}
                  value={punchStaffId}
                  onChange={setPunchStaffId}
                  placeholder="Select staff..."
                />
              </div>
            )}

            {canManage && punchStaffId && !isPunchingSelf && (
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Marking for</label>
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-700">
                  <Shield size={14} className="text-amber-500" />
                  {allStaff.find(s => String(s.id) === String(punchStaffId))?.name || 'Staff'}
                  <button type="button" onClick={() => setPunchStaffId('')} className="ml-auto text-zinc-400 hover:text-zinc-600"><X size={14} /></button>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Select Attendance Date{punchDates.length > 1 ? `s (${punchDates.length})` : ''}
                </label>
                <button
                  type="button"
                  onClick={handleAddPunchDate}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors shadow-sm"
                  title="Add another date"
                >
                  <Plus size={13} />
                  <span>Add Date</span>
                </button>
              </div>

              <div className="space-y-2">
                {punchDates.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="date"
                      value={d}
                      max={toDateStr(new Date())}
                      onChange={(e) => handleUpdatePunchDate(idx, e.target.value)}
                      className={inputClassName}
                    />
                    {punchDates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePunchDate(idx)}
                        className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                        title="Remove date"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Punch Time ({punchMode === 'in' ? 'Check In Time' : 'Check Out Time'})
                </label>
                <button
                  type="button"
                  onClick={() => setPunchTime(timeNow())}
                  className="text-[10px] text-emerald-600 hover:underline font-semibold"
                >
                  Set to Current Time
                </button>
              </div>
              <input
                type="time"
                value={punchTime}
                onChange={(e) => setPunchTime(e.target.value)}
                className={inputClassName}
              />
            </div>

            {isPunchingSelf && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                {geoStatus === 'fetching' && (
                  <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
                    <Loader2 size={16} className="animate-spin" />
                    Verifying location...
                  </div>
                )}
                {geoStatus === 'success' && isWithinRadius && (
                  <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium">
                    <CheckCircle2 size={16} />
                    Location verified — {Math.round(geoDistance || 0)}m from office
                  </div>
                )}
                {geoStatus === 'success' && !isWithinRadius && (
                  <div className="flex items-center justify-center gap-2 text-sm text-red-600 font-medium">
                    <MapPin size={16} />
                    You are outside the work area ({Math.round(geoDistance || 0)}m)
                  </div>
                )}
                {geoStatus === 'error' && (
                  <div className="text-center text-sm text-red-500">{geoError}</div>
                )}
              </div>
            )}

            {!isPunchingSelf && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <Shield size={16} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">Admin/Manager override: Location check bypassed for manual attendance.</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowPunchModal(false); resetGeoState(); }}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handlePunchSubmit} disabled={punchLoading || (isPunchingSelf && !canPunch)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${punchLoading || (isPunchingSelf && !canPunch)
                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'}`}>
                {punchLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : punchMode === 'in' ? (
                  <><UserCheck size={16} /> Punch In</>
                ) : (
                  <><UserX size={16} /> Punch Out</>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showSettings && canManage && (
        <Modal title="Office Location Settings" onClose={() => setShowSettings(false)}>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Office Name</label>
              <input type="text" value={settings.officeName} onChange={(e) => setSettings(s => ({ ...s, officeName: e.target.value }))}
                className={inputClassName} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Latitude</label>
                <input type="number" step="0.0001" value={settings.latitude}
                  onChange={(e) => setSettings(s => ({ ...s, latitude: parseFloat(e.target.value) || 0 }))}
                  className={inputClassName} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Longitude</label>
                <input type="number" step="0.0001" value={settings.longitude}
                  onChange={(e) => setSettings(s => ({ ...s, longitude: parseFloat(e.target.value) || 0 }))}
                  className={inputClassName} />
              </div>
            </div>
            <button type="button" onClick={handleGetCurrentLocation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-colors">
              <Navigation size={16} />
              Use My Current Location
            </button>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                Geo-Fence Radius ({settings.radiusMeters}m)
              </label>
              <input type="range" min="100" max="5000" step="100" value={settings.radiusMeters}
                onChange={(e) => setSettings(s => ({ ...s, radiusMeters: parseInt(e.target.value) }))}
                className="w-full accent-emerald-600" />
              <div className="flex justify-between text-xs text-zinc-400 mt-1">
                <span>100m</span>
                <span>5000m</span>
              </div>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <p className="text-xs text-zinc-500">
                Employees must be within <strong className="text-zinc-700">{settings.radiusMeters}m</strong> of
                <strong className="text-zinc-700"> {settings.officeName}</strong> to punch in/out.
                Admins and managers can override this for manual attendance marking.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleSaveSettings} disabled={settingsSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
                {settingsSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Settings</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Admin Direct Attendance Record Edit Modal */}
      {editRecordTarget && (
        <Modal title={`Edit Attendance — ${editRecordTarget.staff_name || 'Staff'}`} onClose={() => setEditRecordTarget(null)}>
          <div className="p-5 space-y-4">
            <p className="text-xs text-zinc-500">
              Update attendance check-in/out times and status for <strong className="text-zinc-800">{editRecordTarget.staff_name}</strong> on <strong className="text-zinc-800">{editRecordTarget.date}</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Check In Time</label>
                <input
                  type="time"
                  value={recordCheckIn}
                  onChange={(e) => setRecordCheckIn(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Check Out Time</label>
                <input
                  type="time"
                  value={recordCheckOut}
                  onChange={(e) => setRecordCheckOut(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Attendance Status</label>
              <SearchableSelect
                options={[
                  { value: 'present', label: 'Present' },
                  { value: 'absent', label: 'Absent' },
                  { value: 'late', label: 'Late' },
                  { value: 'half_day', label: 'Half Day' },
                  { value: 'overtime', label: 'Overtime' },
                ]}
                value={recordStatus}
                onChange={setRecordStatus}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditRecordTarget(null)}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecordEdit}
                disabled={recordSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {recordSaving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
