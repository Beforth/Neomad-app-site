import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  UserCheck, UserX, Clock, Plus, X, Save,
  CheckCircle2, Download, Shield, Search, MapPin, Loader2,
  Settings as SettingsIcon, Navigation, LogIn, LogOut,
  ChevronLeft, ChevronRight, Inbox, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUsers, mapBackendRoleToFrontend } from '../../lib/api';
import SearchableSelect from '../../components/SearchableSelect';

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-600',
  absent: 'bg-red-50 text-red-600',
  late: 'bg-amber-50 text-amber-600',
  half_day: 'bg-blue-50 text-blue-600',
};

const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half Day' },
];

const PAGE_SIZE = 10;

let _idCounter = 10000;
function generateId() { return ++_idCounter; }

function formatHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return hrs > 0 || mins > 0 ? `${hrs}h ${mins}m` : '\u2014';
}

function getStatus(checkIn: string | null, checkOut: string | null): 'present' | 'absent' | 'late' | 'half_day' {
  if (!checkIn) return 'absent';
  const hour = parseInt(checkIn.split(':')[0], 10);
  if (hour > 9) return 'late';
  if (checkOut) {
    const [outH, outM] = checkOut.split(':').map(Number);
    const [inH, inM] = checkIn.split(':').map(Number);
    const totalMins = (outH - inH) * 60 + (outM - inM);
    if (totalMins < 240) return 'half_day';
  }
  return 'present';
}

function calcHours(checkIn: string, checkOut: string): number {
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  return Math.round(((outH * 60 + outM) - (inH * 60 + inM)) / 60 * 10) / 10;
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
  absentAfterTime: string;
}

const DEFAULT_SETTINGS: AttendanceSettings = {
  officeName: 'Neomed Office, Nashik',
  latitude: 19.9975,
  longitude: 73.7898,
  radiusMeters: 500,
  absentAfterTime: '12:00',
};

export default function Attendance() {
  const { user: currentUser, token } = useAuth();
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [dateFrom, setDateFrom] = useState(monthStartStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);

  const [showPunchModal, setShowPunchModal] = useState(false);
  const [punchMode, setPunchMode] = useState<'in' | 'out'>('in');
  const [punchStaffId, setPunchStaffId] = useState('');
  const [punchTime, setPunchTime] = useState(timeNow());
  const [punchLoading, setPunchLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [geoDistance, setGeoDistance] = useState<number | null>(null);
  const [geoPosition, setGeoPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState('');

  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'manager';

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

  useEffect(() => { setPage(1); }, [statusFilter, searchDebounced, dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (token) {
        const data = await getUsers(token);
        const users = data.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.email.split('@')[0],
          email: u.email,
          role: mapBackendRoleToFrontend(u.role_codes),
        }));
        setAllStaff(users);
        generateMockRecords(users);
      }
    } catch {
      setAllStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const generateMockRecords = (users: any[]) => {
    const today = new Date();
    const mockRecords: any[] = [];
    users.forEach((u: any) => {
      for (let d = 0; d < 15; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - d);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (date.getDay() === 0) continue;
        const hasRecord = Math.random() > 0.15;
        if (!hasRecord) {
          mockRecords.push({
            id: generateId() + d * 100 + u.id,
            staffId: u.id, staffName: u.name, staffEmail: u.email,
            date: dateStr, checkIn: null, checkOut: null,
            status: 'absent', hoursWorked: 0, markedBy: 'self',
            punchInLocation: null, distanceFromOffice: null,
          });
          continue;
        }
        const lateChance = Math.random();
        const checkInH = lateChance > 0.8 ? 9 + Math.floor(Math.random() * 2) : 8 + Math.floor(Math.random() * 2);
        const checkInM = Math.floor(Math.random() * 60);
        const checkIn = `${String(checkInH).padStart(2, '0')}:${String(checkInM).padStart(2, '0')}`;
        const shouldCheckout = Math.random() > 0.1;
        let checkOut = null;
        let hoursWorked = 0;
        if (shouldCheckout) {
          const outH = checkInH + 7 + Math.floor(Math.random() * 3);
          const outM = Math.floor(Math.random() * 60);
          checkOut = `${String(Math.min(outH, 18)).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
          hoursWorked = calcHours(checkIn, checkOut);
        }
        const status = getStatus(checkIn, checkOut);
        const isManual = Math.random() > 0.85;
        const dist = Math.round(Math.random() * 300);
        mockRecords.push({
          id: generateId() + d * 100 + u.id,
          staffId: u.id, staffName: u.name, staffEmail: u.email,
          date: dateStr, checkIn, checkOut, status, hoursWorked,
          markedBy: isManual ? 'Admin' : 'self',
          punchInLocation: isManual ? null : { lat: settings.latitude + (Math.random() - 0.5) * 0.002, lng: settings.longitude + (Math.random() - 0.5) * 0.002 },
          distanceFromOffice: isManual ? null : dist,
        });
      }
    });
    setRecords(mockRecords);
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

    setPunchLoading(true);
    await new Promise(r => setTimeout(r, 500));

    const staff = allStaff.find(s => s.id === staffId);
    const dateStr = todayStr();

    if (punchMode === 'in') {
      const existing = records.find(r => r.staffId === staffId && r.date === dateStr && r.checkIn);
      if (existing) { showToast('Already punched in for today.'); setPunchLoading(false); return; }

      setRecords(prev => {
        const absIdx = prev.findIndex(r => r.staffId === staffId && r.date === dateStr && !r.checkIn);
        if (absIdx >= 0) {
          const updated = [...prev];
          updated[absIdx] = {
            ...updated[absIdx],
            checkIn: punchTime,
            status: getStatus(punchTime, null),
            markedBy: canPunch && !isPunchingSelf ? (currentUser?.username || 'Admin') : 'self',
            punchInLocation: geoPosition,
            distanceFromOffice: geoDistance !== null ? Math.round(geoDistance) : null,
          };
          return updated;
        }
        return [...prev, {
          id: generateId(), staffId, staffName: staff?.name || '', staffEmail: staff?.email || '',
          date: dateStr, checkIn: punchTime, checkOut: null,
          status: getStatus(punchTime, null), hoursWorked: 0,
          markedBy: canPunch && !isPunchingSelf ? (currentUser?.username || 'Admin') : 'self',
          punchInLocation: geoPosition,
          distanceFromOffice: geoDistance !== null ? Math.round(geoDistance) : null,
        }];
      });
      showToast(`Punched in at ${punchTime}${geoDistance !== null ? ` (${Math.round(geoDistance)}m from office)` : ''}`);
    } else {
      const todayRecord = records.find(r => r.staffId === staffId && r.date === dateStr && r.checkIn && !r.checkOut);
      if (!todayRecord) { showToast('No active punch-in found for today.'); setPunchLoading(false); return; }

      setRecords(prev => prev.map(r => {
        if (r.staffId === staffId && r.date === dateStr && r.checkIn && !r.checkOut) {
          return { ...r, checkOut: punchTime, hoursWorked: calcHours(r.checkIn, punchTime), status: getStatus(r.checkIn, punchTime) };
        }
        return r;
      }));
      showToast(`Punched out at ${punchTime}`);
    }

    setPunchLoading(false);
    setShowPunchModal(false);
    resetGeoState();
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    await new Promise(r => setTimeout(r, 300));
    setSettingsSaving(false);
    setShowSettings(false);
    showToast('Office location settings saved.');
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
    const today = todayStr();
    const now = new Date();
    const [cutoffH, cutoffM] = settings.absentAfterTime.split(':').map(Number);
    const cutoffPassed = now.getHours() > cutoffH || (now.getHours() === cutoffH && now.getMinutes() >= cutoffM);

    return records.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      if (r.date === today && r.status === 'absent' && !cutoffPassed) return false;
      if (searchDebounced) {
        const q = searchDebounced.toLowerCase();
        if (!r.staffName.toLowerCase().includes(q) && !r.staffEmail.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [records, statusFilter, dateFrom, dateTo, searchDebounced, settings.absentAfterTime]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = search || statusFilter !== 'all' || dateFrom !== monthStartStr() || dateTo !== todayStr();

  const stats = useMemo(() => {
    const today = todayStr();
    const todayRecords = records.filter(r => r.date === today);
    const totalStaff = allStaff.length;
    const now = new Date();
    const [cutoffH, cutoffM] = settings.absentAfterTime.split(':').map(Number);
    const cutoffPassed = now.getHours() > cutoffH || (now.getHours() === cutoffH && now.getMinutes() >= cutoffM);
    const presentToday = todayRecords.filter(r => r.status !== 'absent').length;
    const absentToday = cutoffPassed
      ? todayRecords.filter(r => r.status === 'absent').length + (totalStaff - todayRecords.length)
      : todayRecords.filter(r => r.status === 'absent').length;
    return { totalStaff, presentToday, absentToday };
  }, [records, allStaff, settings.absentAfterTime]);

  const handleExport = () => {
    const headers = ['Date', 'Staff', 'Email', 'Check In', 'Check Out', 'Hours', 'Status', 'Distance (m)', 'Marked By'];
    const rows = filtered.map(r => [
      r.date, r.staffName, r.staffEmail, r.checkIn || '', r.checkOut || '',
      r.hoursWorked ? String(r.hoursWorked) : '', STATUS_LABELS[r.status] || r.status,
      r.distanceFromOffice !== null ? String(r.distanceFromOffice) : 'Manual',
      r.markedBy || '',
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
            className="fixed top-5 right-5 z-50 bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
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
          <button onClick={() => { setPunchMode('in'); setPunchStaffId(currentUser?.id ? String(currentUser.id) : ''); setPunchTime(timeNow()); resetGeoState(); setShowPunchModal(true); }}
            className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
            <LogIn size={14} />
            Punch In / Out
          </button>
          {canManage && (
            <button onClick={() => { setPunchMode('in'); setPunchStaffId(''); setPunchTime(timeNow()); resetGeoState(); setShowPunchModal(true); }}
              className="flex items-center gap-2 bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
              <Plus size={14} />
              Mark for Staff
            </button>
          )}
        </div>
      </motion.header>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total Staff</p>
              <p className="text-2xl font-bold text-zinc-900 mt-1">{stats.totalStaff}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-blue-600" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Present Today</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.presentToday}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <UserCheck size={20} className="text-emerald-600" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Absent Today</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.absentToday}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <UserX size={20} className="text-red-600" />
            </div>
          </div>
        </motion.div>
      </div>

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
            onClick={() => { setSearch(''); setSearchDebounced(''); setStatusFilter('all'); setDateFrom(monthStartStr()); setDateTo(todayStr()); }}
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
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Staff</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Date</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Check In</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Check Out</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Hours</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Location</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Marked By</th>
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
                            {r.staffName[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-zinc-800">{r.staffName}</p>
                            <p className="text-[10px] text-zinc-400">{r.staffEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600">{r.date}</td>
                      <td className="px-4 py-3 text-xs text-zinc-900 font-semibold">{r.checkIn || '\u2014'}</td>
                      <td className="px-4 py-3 text-xs text-zinc-900 font-semibold">{r.checkOut || '\u2014'}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{formatHours(r.hoursWorked)}</td>
                      <td className="px-4 py-3">
                        {r.distanceFromOffice !== null ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${r.distanceFromOffice <= settings.radiusMeters ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            <MapPin size={10} />
                            {r.distanceFromOffice}m
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                            <Shield size={10} />
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${STATUS_STYLES[r.status] || ''}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{r.markedBy || 'self'}</td>
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
                        {r.staffName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{r.staffName}</p>
                        <p className="text-[10px] text-zinc-500">{r.date}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${STATUS_STYLES[r.status] || ''}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-zinc-400">In:</span> <span className="font-semibold text-zinc-800 ml-1">{r.checkIn || '\u2014'}</span></div>
                    <div><span className="text-zinc-400">Out:</span> <span className="font-semibold text-zinc-800 ml-1">{r.checkOut || '\u2014'}</span></div>
                    <div><span className="text-zinc-400">Hours:</span> <span className="font-semibold text-zinc-800 ml-1">{formatHours(r.hoursWorked)}</span></div>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400">Loc:</span>
                      {r.distanceFromOffice !== null ? (
                        <span className={`font-semibold ml-1 ${r.distanceFromOffice <= settings.radiusMeters ? 'text-emerald-600' : 'text-amber-600'}`}>
                          <MapPin size={10} className="inline" /> {r.distanceFromOffice}m
                        </span>
                      ) : (
                        <span className="font-semibold text-blue-600 ml-1"><Shield size={10} className="inline" /> Manual</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
              <p className="text-xs text-zinc-500">
                Showing <span className="font-bold text-zinc-900">{startRow}</span>–
                <span className="font-bold text-zinc-900">{endRow}</span> of{' '}
                <span className="font-bold text-zinc-900">{filtered.length}</span> records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="text-zinc-600" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} className="text-zinc-600" />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {showPunchModal && (
        <Modal title="Punch Attendance" onClose={() => { setShowPunchModal(false); resetGeoState(); }}>
          <div className="p-5 space-y-4">
            <div className="flex items-center bg-zinc-100 rounded-xl p-1">
              <button type="button" onClick={() => setPunchMode('in')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${punchMode === 'in' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                <LogIn size={16} />
                Punch In
              </button>
              <button type="button" onClick={() => setPunchMode('out')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${punchMode === 'out' ? 'bg-amber-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
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
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Time</label>
              <input type="time" value={punchTime} onChange={(e) => setPunchTime(e.target.value)}
                className={inputClassName} />
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
                    : punchMode === 'in'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'}`}>
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
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Auto-mark Absent After</label>
              <input type="time" value={settings.absentAfterTime}
                onChange={(e) => setSettings(s => ({ ...s, absentAfterTime: e.target.value }))}
                className={inputClassName} />
              <p className="text-xs text-zinc-400 mt-1">Employees with no punch-in by this time are marked absent.</p>
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
    </div>
  );
}
