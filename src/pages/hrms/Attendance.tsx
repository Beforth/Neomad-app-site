import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  UserCheck, UserX, Clock, Plus, X, Save,
  CheckCircle2, Download, Shield, Search, MapPin, Loader2,
  Settings as SettingsIcon, Navigation, LogIn, LogOut,
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown, Inbox, XCircle, ClipboardList,
  ThumbsUp, ThumbsDown, Bell, Pencil, Cpu, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUsers, mapBackendRoleToFrontend } from '../../lib/api';
import { appApi, APP_NOTIFICATIONS_UPDATED_EVENT } from '../../lib/appApi';
import SearchableSelect from '../../components/SearchableSelect';
import { toDateStr } from '../../lib/hrmsAttendance';
import { exportAttendanceXlsx } from '../../lib/hrmsExports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea, fieldClass } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState } from '@/components/ui/empty-state';
import Modal from '../../components/Modal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import KpiStrip from '@/components/KpiStrip';
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
  present: 'bg-accent text-accent-foreground border-primary/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  late: 'bg-warning/10 text-warning border-warning/25',
  half_day: 'bg-info/10 text-info border-info/25',
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
  regularization: 'bg-muted text-foreground/70',
  half_day: 'bg-info/10 text-info',
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

const inputClassName = fieldClass;

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
  const [exporting, setExporting] = useState(false);

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
    if (!navigator.geolocation) {
      showToast('This browser cannot read GPS. Open Attendance settings on a phone at the office, then tap Use My Current Location.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setSettings((prev) => ({ ...prev, latitude, longitude }));
        if (!token) {
          showToast('Location captured. Click Save Settings.');
          return;
        }
        setSettingsSaving(true);
        try {
          await updateHrmsSettings(token, {
            office_name: settings.officeName,
            latitude,
            longitude,
            radius_meters: settings.radiusMeters,
          });
          showToast(`Office pin saved at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}. Staff must pull to refresh the app.`);
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Location captured but save failed. Click Save Settings.');
        } finally {
          setSettingsSaving(false);
        }
      },
      (err) => {
        if (err.code === 1) showToast('Location permission denied. Allow location for this site and try again.');
        else if (err.code === 3) showToast('Location timed out. Try again on a phone at the office.');
        else showToast('Failed to get current location. Try again on a phone at the office.');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
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

  // Exported by the server so the file covers the whole filtered date range,
  // not just the rows this page has loaded, and can include punch area names.
  const handleExport = async () => {
    if (!token || exporting) return;
    setExporting(true);
    try {
      const { geocodePending } = await exportAttendanceXlsx(token, {
        from_date: dateFrom,
        to_date: dateTo,
        status: statusFilter,
        search: searchDebounced || undefined,
      });
      showToast(
        geocodePending > 0
          ? `Exported. ${geocodePending} punch location(s) show coordinates — they are being looked up now and will have area names next time.`
          : 'Attendance exported as Excel.',
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
          >
            <CheckCircle2 size={16} className="text-primary" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader title="Attendance" description="Track staff attendance with geo-fenced punch in/out" actions={<>
<div className="flex items-center gap-2">
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}
              >
              <SettingsIcon size={14} />
              Office Settings
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}
            >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? 'Exporting…' : 'Export Excel'}
          </Button>
          <Button variant="dark" size="sm" onClick={() => { setPunchMode('in'); setPunchStaffId(currentUser?.id ? String(currentUser.id) : ''); setPunchDates([toDateStr(new Date())]); setPunchTime(timeNow()); resetGeoState(); setShowPunchModal(true); }}
            >
            <LogIn size={14} />
            Punch In / Out
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => { setPunchMode('in'); setPunchStaffId(''); setPunchDates([toDateStr(new Date())]); setPunchTime(timeNow()); resetGeoState(); setShowPunchModal(true); }}
              >
              <Plus size={14} />
              Mark for Staff
            </Button>
          )}
        </div>
</>} />
      <KpiStrip items={[
  { label: 'Total Staff', value: stats.totalStaff },
  { label: 'Present Today', value: stats.presentToday },
  { label: 'Absent Today', value: stats.absentToday },
]} />
      {/* Tab Switcher */}
      <Segmented className="w-fit" value={String(activeTab)} onValueChange={(v) => { ({ ['records']: (() => setActiveTab('records')), ['requests']: (() => { setActiveTab('requests'); refreshRequests(); }) } as Record<string, () => void>)[v]?.(); }} options={[
  { value: 'records', label: <><ClipboardList size={13} />
          Records</> },
  { value: 'requests', label: <><Bell size={13} />
          Requests
          {pendingRequestsCount > 0 && (
            <Badge variant="warning" className="ml-0.5" >
              {pendingRequestsCount}
            </Badge>
          )}</> }
]} />

      {activeTab === 'requests' ? (
        /* ── Requests Tab ── */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
        >
          {allRequests.length === 0 ? (
            <EmptyState icon={<Inbox />} title="No attendance requests" description="Employees can submit regularization requests from their attendance page." className="border-0" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="uppercase">Employee</TableHead>
                    <TableHead className="uppercase">Range</TableHead>
                    <TableHead className="uppercase">Type</TableHead>
                    <TableHead className="uppercase">Days</TableHead>
                    <TableHead className="uppercase">Reason</TableHead>
                    <TableHead className="uppercase">Submitted</TableHead>
                    <TableHead className="uppercase">Status</TableHead>
                    {canManage && <TableHead className="uppercase">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...allRequests]
                    .sort((a, b) => {
                      if (a.status === 'pending' && b.status !== 'pending') return -1;
                      if (b.status === 'pending' && a.status !== 'pending') return 1;
                      return b.submitted_at.localeCompare(a.submitted_at);
                    })
                    .map((req, i) => {
                      const statusBadge =
                        req.status === 'approved' ? 'bg-accent text-accent-foreground' :
                        req.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                        'bg-warning/10 text-warning';
                      const fromLabel = new Date(req.from_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
                      const toLabel = new Date(req.to_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
                      const submittedLabel = new Date(req.submitted_at).toLocaleDateString('default', { day: 'numeric', month: 'short' });
                      return (
                        <motion.tr
                          key={req.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b transition-colors hover:bg-muted/70"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-semibold text-foreground/70 shrink-0">
                                {(req.employee_username?.[0] ?? '?').toUpperCase()}
                              </div>
                              <span className="text-xs font-semibold text-foreground">{req.employee_username}</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {req.from_date === req.to_date ? fromLabel : `${fromLabel} \u2192 ${toLabel}`}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${REQUEST_TYPE_STYLES[req.request_type] || 'bg-muted text-foreground/70'}`}>
                              {REQUEST_TYPE_LABELS[req.request_type] || 'Request'}
                            </Badge>
                            {(req.from_time || req.to_time) && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground mt-1">
                                <Clock size={10} /> {req.from_time || '--'}–{req.to_time || '--'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">{req.days}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={req.reason}>{req.reason}</TableCell>
                          <TableCell className="whitespace-nowrap">{submittedLabel}</TableCell>
                          <TableCell>
                            <Badge className={`capitalize ${statusBadge}`}>
                              {req.status}
                            </Badge>
                            {req.notes && (
                              <p className="text-[11px] text-muted-foreground/70 mt-0.5 italic truncate max-w-[120px]" title={req.notes}>{req.notes}</p>
                            )}
                          </TableCell>
                          {canManage && (
                            <TableCell className="w-10 pl-0" onClick={(e) => e.stopPropagation()}>
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon-sm" data-row-menu="" aria-label="Row actions"><MoreHorizontal /></Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-52">
{req.status === 'pending' && (
                                  <>
                                    <DropdownMenuItem onSelect={() => handleApproveRequest(req)}><CheckCircle2 /> Approve</DropdownMenuItem>
                                    <DropdownMenuItem destructive onSelect={() => { setRejectTarget(req); setRejectNote(''); }}><XCircle /> Reject</DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem onSelect={() => openEditRequest(req)}><Pencil /> Edit request</DropdownMenuItem>
                              
                              {req.status !== 'pending' && (
                                <span className="text-[11px] text-muted-foreground/50 mt-1 block">
                                  {req.resolved_by_name ? `by ${req.resolved_by_name}` : '—'}
                                </span>
                              )}
</DropdownMenuContent>
</DropdownMenu>
</TableCell>
                          )}
                        </motion.tr>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      ) : (
        /* ── Records Tab ── */
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
              <Input data-search="" className="w-full pl-9 pr-4"
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                
              />
            </div>
            <Input className="w-auto" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
               />
            <Input className="w-auto" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
               />

            {/* Name Sort Filter */}
            <button
              type="button"
              onClick={() => toggleSort('staff')}
              className={`h-8 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0 ${
                sortField === 'staff'
                  ? 'bg-foreground text-white border-foreground'
                  : 'bg-muted text-foreground/70 border-border hover:bg-secondary'
              }`}
              title="Sort by Name (A-Z / Z-A)"
            >
              <ArrowUpDown size={13} className={sortField === 'staff' ? 'text-primary' : 'text-muted-foreground/70'} />
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
                className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors"
              >
                <XCircle size={12} />Clear
              </button>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
          >
            {loading ? (
              <div className="p-12 text-center text-muted-foreground text-sm">Loading attendance records...</div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<Inbox />} title="No attendance records found" description="Try adjusting your search or filters" className="border-0" />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => toggleSort('staff')} className="uppercase whitespace-nowrap cursor-pointer hover:text-foreground/70 select-none">
                          <span className="flex items-center gap-1">Staff{sortField !== 'staff' ? <ArrowUpDown size={12} className="text-muted-foreground/50" /> : sortDir === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />}</span>
                        </TableHead>
                        <TableHead onClick={() => toggleSort('date')} className="uppercase whitespace-nowrap cursor-pointer hover:text-foreground/70 select-none">
                          <span className="flex items-center gap-1">Date{sortField !== 'date' ? <ArrowUpDown size={12} className="text-muted-foreground/50" /> : sortDir === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />}</span>
                        </TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Check In</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Check Out</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Hours</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Overtime</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Location</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Status</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Marked By</TableHead>
                        {canManage && <TableHead className="uppercase whitespace-nowrap">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map((r, i) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b transition-colors hover:bg-muted/70"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground border border-border shadow-sm shrink-0">
                                {(r.staff_name?.[0] ?? '?').toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-foreground">{r.staff_name}</p>
                                <p className="text-[11px] text-muted-foreground">{r.staff_email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                          <TableCell className="font-medium">{r.check_in || '—'}</TableCell>
                          <TableCell className="font-medium">{r.check_out || '—'}</TableCell>
                          <TableCell>{formatHours(r.hours_worked)}</TableCell>
                          <TableCell>
                            {r.overtime > 0 ? (
                              <span className="text-xs font-medium text-violet-600">+{r.overtime}h</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs">
                            {r.source === 'biometric' || r.device_id ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <Cpu size={11} className="text-primary shrink-0" />
                                  {r.device_id || 'Biometric'}
                                </span>
                                <span className="text-[11px] text-muted-foreground/70 font-sans">via biometric terminal</span>
                              </div>
                            ) : r.location_area ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <MapPin size={11} className="text-primary shrink-0" />
                                  {r.location_area}
                                </span>
                                <span className="text-[11px] text-muted-foreground/70 font-sans">
                                  ({Math.round(r.distance_from_office ?? 0)}m away)
                                </span>
                              </div>
                            ) : r.punch_in_lat !== null && r.punch_in_lat !== undefined && r.punch_in_lng !== null && r.punch_in_lng !== undefined ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <MapPin size={11} className="text-primary shrink-0" />
                                  {Number(r.punch_in_lat).toFixed(4)}, {Number(r.punch_in_lng).toFixed(4)}
                                </span>
                                <span className="text-[11px] text-muted-foreground/70 font-sans">
                                  ({Math.round(r.distance_from_office ?? 0)}m away)
                                </span>
                              </div>
                            ) : r.distance_from_office !== null && r.distance_from_office !== undefined ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <MapPin size={11} className="text-info shrink-0" />
                                  {settings.latitude?.toFixed(4) || '18.5204'}, {settings.longitude?.toFixed(4) || '73.8567'}
                                </span>
                                <span className="text-[11px] text-muted-foreground/70 font-sans">
                                  ({Math.round(r.distance_from_office)}m away)
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <MapPin size={11} className="text-muted-foreground shrink-0" />
                                  {settings.latitude?.toFixed(4) || '18.5204'}, {settings.longitude?.toFixed(4) || '73.8567'}
                                </span>
                                <span className="text-[11px] text-muted-foreground/70 font-sans">
                                  (0m away)
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`capitalize ${STATUS_STYLES[r.status] || ''}`}>
                              {STATUS_LABELS[r.status] || r.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.source === 'biometric' || r.device_id
                              ? (r.device_id ? `Machine ${r.device_id}` : 'Biometric machine')
                              : r.marked_by_name || 'self'}
                          </TableCell>
                          {canManage && (
                            <TableCell>
                              <Button variant="ghost" size="icon-sm"
                                type="button"
                                onClick={() => {
                                  setEditRecordTarget(r);
                                  setRecordCheckIn(r.check_in || '');
                                  setRecordCheckOut(r.check_out || '');
                                  setRecordStatus(r.status || 'present');
                                }}
                                
                                title="Edit attendance time & status"
                              >
                                <Pencil size={15} />
                              </Button>
                            </TableCell>
                          )}
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden divide-y divide-border">
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
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground border border-border shadow-sm shrink-0">
                            {(r.staff_name?.[0] ?? '?').toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{r.staff_name}</p>
                            <p className="text-[11px] text-muted-foreground">{r.date}</p>
                          </div>
                        </div>
                        <Badge className={`capitalize ${STATUS_STYLES[r.status] || ''}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">In:</span> <span className="font-medium text-foreground ml-1">{r.check_in || '—'}</span></div>
                        <div><span className="text-muted-foreground">Out:</span> <span className="font-medium text-foreground ml-1">{r.check_out || '—'}</span></div>
                        <div><span className="text-muted-foreground">Hours:</span> <span className="font-medium text-foreground ml-1">{formatHours(r.hours_worked)}</span></div>
                        {(r.overtime_amount ?? 0) > 0 && <div><span className="text-muted-foreground">OT:</span> <span className="font-medium text-violet-600 ml-1">+₹{r.overtime_amount}</span></div>}
                        {(r.penalty_amount ?? 0) > 0 && <div><span className="text-muted-foreground">Penalty:</span> <span className="font-medium text-destructive ml-1">−₹{r.penalty_amount}</span></div>}
                        {!(r.overtime_amount ?? 0) && r.overtime > 0 && <div><span className="text-muted-foreground">OT:</span> <span className="font-medium text-violet-600 ml-1">+{r.overtime}h</span></div>}
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground/70">Loc:</span>
                          {r.distance_from_office !== null ? (
                            <span className={`font-semibold ml-1 ${r.distance_from_office <= settings.radiusMeters ? 'text-primary' : 'text-warning'}`}>
                              <MapPin size={10} className="inline" /> {r.distance_from_office}m
                            </span>
                          ) : (
                            <span className="font-semibold text-info ml-1"><Shield size={10} className="inline" /> Manual</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {filtered.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
                    <p className="text-xs text-muted-foreground">
                      Showing {startRow}–{endRow} of {filtered.length} records
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${p === page ? 'bg-secondary text-foreground border border-input' : 'text-muted-foreground hover:bg-secondary'}`}>
                          {p}
                        </button>
                      ))}
                      <Button variant="ghost" size="icon-sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        
                      >
                        <ChevronRight size={16} />
                      </Button>
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
            <p className="text-sm text-foreground/70">
              Rejecting request from <strong className="text-foreground">{rejectTarget.employee_username}</strong> for{' '}
              <strong className="text-foreground">{rejectTarget.days} day{rejectTarget.days > 1 ? 's' : ''}</strong> from{' '}
              <strong className="text-foreground">
                {new Date(rejectTarget.from_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                {rejectTarget.from_date !== rejectTarget.to_date
                  ? ` \u2192 ${new Date(rejectTarget.to_date + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : ''}
              </strong>.
            </p>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Rejection Note (optional)</label>
              <Textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                rows={2}
                placeholder="Reason for rejection..."
                
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" type="button" onClick={() => { setRejectTarget(null); setRejectNote(''); }}
                >
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" type="button" onClick={() => handleRejectRequest(rejectTarget, rejectNote)}
                >
                <ThumbsDown size={14} /> Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Request Modal */}
      {editTarget && (
        <Modal title={`Edit Request${editTarget.employee_username ? ` — ${editTarget.employee_username}` : ''}`} onClose={() => setEditTarget(null)}>
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
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
                      ? 'border-primary/30 bg-accent text-accent-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {REQUEST_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">From Date</label>
                <Input type="date" value={editFromDate} onChange={e => setEditFromDate(e.target.value)}  />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">To Date</label>
                <Input
                  type="date"
                  value={editReqType === 'regularization' ? editToDate : editFromDate}
                  min={editFromDate || undefined}
                  disabled={editReqType !== 'regularization'}
                  onChange={e => setEditToDate(e.target.value)}
                  
                />
              </div>
            </div>
            {editReqType === 'half_day' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">From Time</label>
                  <Input type="time" value={editFromTime} onChange={e => setEditFromTime(e.target.value)}  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">To Time</label>
                  <Input type="time" value={editToTime} onChange={e => setEditToTime(e.target.value)}  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Reason</label>
              <Textarea
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                rows={2}
                
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" type="button" onClick={() => setEditTarget(null)}
                >
                Cancel
              </Button>
              <Button className="flex-1" type="button" onClick={handleEditRequestSubmit} disabled={editSaving || !editFromDate}
                >
                {editSaving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Changes</>}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showPunchModal && (
        <Modal title="Punch Attendance" onClose={() => { setShowPunchModal(false); resetGeoState(); }}>
          <div className="p-5 space-y-4">
            {toast && (
              <div className="p-3 bg-foreground text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-md">
                <CheckCircle2 size={14} className="text-primary shrink-0" />
                <span>{toast}</span>
              </div>
            )}
            <Segmented value={String(punchMode)} onValueChange={(v) => { ({ ['in']: (() => setPunchMode('in')), ['out']: (() => setPunchMode('out')) } as Record<string, () => void>)[v]?.(); }} options={[
  { value: 'in', label: <><LogIn size={16} />
                Punch In</> },
  { value: 'out', label: <><LogOut size={16} />
                Punch Out</> }
]} />
            {canManage && !punchStaffId && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Staff Member</label>
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
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Marking for</label>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-md text-sm text-foreground/85">
                  <Shield size={14} className="text-warning" />
                  {allStaff.find(s => String(s.id) === String(punchStaffId))?.name || 'Staff'}
                  <button type="button" onClick={() => setPunchStaffId('')} className="ml-auto text-muted-foreground/70 hover:text-foreground/70"><X size={14} /></button>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Select Attendance Date{punchDates.length > 1 ? `s (${punchDates.length})` : ''}
                </label>
                <Button variant="soft" size="xs" className="text-primary hover:text-accent-foreground bg-accent hover:bg-primary/15 border-primary/20"
                  type="button"
                  onClick={handleAddPunchDate}
                  
                  title="Add another date"
                >
                  <Plus size={13} />
                  <span>Add Date</span>
                </Button>
              </div>

              <div className="space-y-2">
                {punchDates.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={d}
                      max={toDateStr(new Date())}
                      onChange={(e) => handleUpdatePunchDate(idx, e.target.value)}
                      
                    />
                    {punchDates.length > 1 && (
                      <Button variant="ghost" size="icon-sm" className="shrink-0 hover:text-destructive hover:bg-destructive/10"
                        type="button"
                        onClick={() => handleRemovePunchDate(idx)}
                        
                        title="Remove date"
                      >
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Punch Time ({punchMode === 'in' ? 'Check In Time' : 'Check Out Time'})
                </label>
                <button
                  type="button"
                  onClick={() => setPunchTime(timeNow())}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Set to Current Time
                </button>
              </div>
              <Input
                type="time"
                value={punchTime}
                onChange={(e) => setPunchTime(e.target.value)}
                
              />
            </div>

            {isPunchingSelf && (
              <div className="bg-muted border border-border rounded-xl p-4">
                {geoStatus === 'fetching' && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    Verifying location...
                  </div>
                )}
                {geoStatus === 'success' && isWithinRadius && (
                  <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
                    <CheckCircle2 size={16} />
                    Location verified — {Math.round(geoDistance || 0)}m from office
                  </div>
                )}
                {geoStatus === 'success' && !isWithinRadius && (
                  <div className="flex items-center justify-center gap-2 text-sm text-destructive font-medium">
                    <MapPin size={16} />
                    You are outside the work area ({Math.round(geoDistance || 0)}m)
                  </div>
                )}
                {geoStatus === 'error' && (
                  <div className="text-center text-sm text-destructive">{geoError}</div>
                )}
              </div>
            )}

            {!isPunchingSelf && (
              <div className="bg-warning/10 border border-warning/25 rounded-xl p-3 flex items-center gap-2">
                <Shield size={16} className="text-warning shrink-0" />
                <p className="text-xs text-warning">Admin/Manager override: Location check bypassed for manual attendance.</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" type="button" onClick={() => { setShowPunchModal(false); resetGeoState(); }}
                >
                Cancel
              </Button>
              <button type="button" onClick={handlePunchSubmit} disabled={punchLoading || (isPunchingSelf && !canPunch)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${punchLoading || (isPunchingSelf && !canPunch)
                    ? 'bg-secondary text-muted-foreground/70 cursor-not-allowed'
                    : 'bg-foreground hover:bg-foreground text-white'}`}>
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
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Office Name</label>
              <Input type="text" value={settings.officeName} onChange={(e) => setSettings(s => ({ ...s, officeName: e.target.value }))}
                 />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Latitude</label>
                <Input type="number" step="0.0001" value={settings.latitude}
                  onChange={(e) => setSettings(s => ({ ...s, latitude: parseFloat(e.target.value) || 0 }))}
                   />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Longitude</label>
                <Input type="number" step="0.0001" value={settings.longitude}
                  onChange={(e) => setSettings(s => ({ ...s, longitude: parseFloat(e.target.value) || 0 }))}
                   />
              </div>
            </div>
            <Button variant="soft" className="w-full bg-info/10 hover:bg-info/15 text-info" type="button" onClick={handleGetCurrentLocation} disabled={settingsSaving}
              >
              <Navigation size={16} />
              {settingsSaving ? 'Saving office pin…' : 'Use My Current Location (saves immediately)'}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Do this while standing at the office, on a phone if possible. A computer can save the wrong pin (often ~2 km off). Staff then pull-to-refresh the app.
            </p>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Geo-Fence Radius
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="5000" step="1" value={settings.radiusMeters}
                  onChange={(e) => setSettings(s => ({ ...s, radiusMeters: parseInt(e.target.value) || 0 }))}
                  className="flex-1 accent-emerald-600" />
                <div className="flex items-center gap-1 shrink-0">
                  <Input className="w-20 text-right" type="number" min="0" max="5000" step="1" value={settings.radiusMeters}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') { setSettings(s => ({ ...s, radiusMeters: 0 })); return; }
                      const n = Math.round(Number(raw));
                      if (Number.isNaN(n)) return;
                      setSettings(s => ({ ...s, radiusMeters: Math.min(5000, Math.max(0, n)) }));
                    }}
                     />
                  <span className="text-xs font-medium text-muted-foreground">m</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground/70 mt-1">
                <span>0m</span>
                <span>5000m</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Type an exact value in the box for a tight fence (e.g. 1m or 2m), or drag to adjust.
              </p>
            </div>
            <div className="bg-muted border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground">
                {settings.radiusMeters <= 0 ? (
                  <>
                    Radius is <strong className="text-foreground/85">0m</strong> — geo-fence is off and staff can punch from anywhere.
                  </>
                ) : (
                  <>
                    Employees must be within <strong className="text-foreground/85">{settings.radiusMeters}m</strong> of
                    <strong className="text-foreground/85"> {settings.officeName}</strong> to punch in/out.
                  </>
                )}
                {' '}Admins and managers can override this for manual attendance marking.
              </p>
            </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button"
              onClick={() => { /* set to office-only: restore a sane default if currently 0 */ setSettings(s => ({ ...s, radiusMeters: (s.radiusMeters && s.radiusMeters > 0) ? s.radiusMeters : 500 })); }}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${settings.radiusMeters > 0 ? 'bg-accent text-accent-foreground border border-primary/20' : 'bg-card text-foreground/70 border border-border hover:bg-muted'}`}>
              Office only
            </button>
            <button type="button"
              onClick={() => { /* set to anywhere */ setSettings(s => ({ ...s, radiusMeters: 0 })); }}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${settings.radiusMeters <= 0 ? 'bg-accent text-accent-foreground border border-primary/20' : 'bg-card text-foreground/70 border border-border hover:bg-muted'}`}>
              Anywhere
            </button>
            <p className="text-xs text-muted-foreground/70 ml-2">Quick toggle: 0m = anywhere</p>
          </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" type="button" onClick={() => setShowSettings(false)}
                >
                Cancel
              </Button>
              <Button className="flex-1" type="button" onClick={handleSaveSettings} disabled={settingsSaving}
                >
                {settingsSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Settings</>}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Admin Direct Attendance Record Edit Modal */}
      {editRecordTarget && (
        <Modal title={`Edit Attendance — ${editRecordTarget.staff_name || 'Staff'}`} onClose={() => setEditRecordTarget(null)}>
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              Update attendance check-in/out times and status for <strong className="text-foreground">{editRecordTarget.staff_name}</strong> on <strong className="text-foreground">{editRecordTarget.date}</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Check In Time</label>
                <Input
                  type="time"
                  value={recordCheckIn}
                  onChange={(e) => setRecordCheckIn(e.target.value)}
                  
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Check Out Time</label>
                <Input
                  type="time"
                  value={recordCheckOut}
                  onChange={(e) => setRecordCheckOut(e.target.value)}
                  
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Attendance Status</label>
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
              <Button variant="secondary" className="flex-1"
                type="button"
                onClick={() => setEditRecordTarget(null)}
                
              >
                Cancel
              </Button>
              <Button className="flex-1"
                type="button"
                onClick={handleSaveRecordEdit}
                disabled={recordSaving}
                
              >
                {recordSaving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Changes</>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
