import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronLeft, ChevronRight, Plus, X, Search, CheckCircle2,
  Clock, Users, CalendarDays, Trash2, Edit2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUsers, mapBackendRoleToFrontend } from '../../lib/api';
import type { DailyShiftAllocation, ShiftType, ShiftSettings } from '../../lib/api';
import { DEFAULT_SHIFT_SETTINGS } from '../../lib/api';
import {
  listShiftTypes,
  listShiftCalendar,
  createShiftAssignment,
  deleteShiftAssignment,
  getHrmsSettings,
  updateHrmsSettings,
  workingDaysInRange,
} from '../../lib/hrmsShifts';
import SearchableSelect from '../../components/SearchableSelect';

import Modal from '../../components/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, selectClass } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  arrived: 'Arrived',
  not_arrived: 'Not Arrived',
  on_the_way: 'On The Way',
  late: 'Late',
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-secondary text-foreground/70 border-border',
  arrived: 'bg-accent text-accent-foreground border-primary/20',
  not_arrived: 'bg-destructive/10 text-destructive border-destructive/20',
  on_the_way: 'bg-warning/10 text-warning border-warning/25',
  late: 'bg-destructive/10 text-destructive border-destructive/20',
};

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ShiftAssign() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, token } = useAuth();
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const activeView: 'calendar' | 'roster' = location.pathname.endsWith('/roster') ? 'roster' : 'calendar';
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [allocations, setAllocations] = useState<DailyShiftAllocation[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [settings, setSettings] = useState<ShiftSettings>({ ...DEFAULT_SHIFT_SETTINGS });
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rosterStatusFilter, setRosterStatusFilter] = useState('all');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const calendarDays = useMemo(() => {
    const start = getMonday(monthStart(new Date(currentYear, currentMonth)));
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(addDays(start, i));
    return days;
  }, [currentYear, currentMonth]);

  const gridFrom = useMemo(() => formatDate(calendarDays[0]), [calendarDays]);
  const gridTo = useMemo(() => formatDate(calendarDays[41]), [calendarDays]);

  const reloadCalendar = useCallback(async () => {
    if (!token) return;
    const days = await listShiftCalendar(token, gridFrom, gridTo);
    setAllocations(days);
  }, [token, gridFrom, gridTo]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [types, hrmsSettings, staff, days] = await Promise.all([
          listShiftTypes(token),
          getHrmsSettings(token),
          getUsers(token),
          listShiftCalendar(token, gridFrom, gridTo),
        ]);
        if (cancelled) return;
        setShiftTypes(types);
        setSettings(hrmsSettings);
        setAllStaff(staff.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.email.split('@')[0],
          email: u.email,
          role: mapBackendRoleToFrontend(u.role_codes),
        })));
        setAllocations(days);
      } catch (e) {
        if (!cancelled) showToast(e instanceof Error ? e.message : 'Failed to load shift assignments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, gridFrom, gridTo]);

  const defaultShift = useMemo(() => {
    if (settings.defaultShiftTypeId == null) return null;
    return shiftTypes.find(s => s.id === settings.defaultShiftTypeId) || null;
  }, [settings.defaultShiftTypeId, shiftTypes]);

  const weeks = useMemo(() => {
    const w: Date[][] = [];
    for (let i = 0; i < 6; i++) w.push(calendarDays.slice(i * 7, i * 7 + 7));
    return w;
  }, [calendarDays]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return allStaff;
    const q = searchQuery.toLowerCase();
    return allStaff.filter(s => s.name.toLowerCase().includes(q));
  }, [allStaff, searchQuery]);

  const allocationsForDate = (date: Date) => {
    const ds = formatDate(date);
    const inMonth = date.getMonth() === currentMonth;
    return allocations.filter(a => a.date === ds && inMonth);
  };

  const todayAllocations = useMemo(() => {
    const ts = todayStr();
    return allocations.filter(a => a.date === ts);
  }, [allocations]);

  const staffIdsAllocatedToday = useMemo(() => new Set(todayAllocations.map(a => a.staff_id)), [todayAllocations]);

  const unallocatedStaff = useMemo(() => {
    return filteredStaff.filter(s => !staffIdsAllocatedToday.has(s.id));
  }, [filteredStaff, staffIdsAllocatedToday]);

  const staffForDate = useMemo(() => {
    if (!selectedDate) return [];
    const ds = formatDate(selectedDate);
    const allocatedIds = new Set(allocations.filter(a => a.date === ds).map(a => a.staff_id));
    return allStaff.map(s => {
      const alloc = allocations.find(a => a.date === ds && a.staff_id === s.id);
      return { ...s, allocation: alloc || null, isAllocated: allocatedIds.has(s.id) };
    });
  }, [allocations, selectedDate, allStaff]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const goToToday = () => {
    const d = new Date();
    setCurrentMonth(d.getMonth());
    setCurrentYear(d.getFullYear());
  };

  const createOneDayAssignment = async (staffId: number, date: string) => {
    if (!token || !defaultShift) throw new Error('No default shift configured in Settings');
    await createShiftAssignment(token, {
      staff_id: staffId,
      shift_type_id: defaultShift.id,
      location: 'Office',
      status: 'active',
      schedule_type: 'fixed',
      frequency_weeks: 1,
      working_days: workingDaysInRange(date, date),
      effective_from: date,
      effective_to: date,
      is_active: true,
    });
  };

  const removeAllocation = async (alloc: DailyShiftAllocation) => {
    if (!token) return;
    try {
      await deleteShiftAssignment(token, alloc.id);
      await reloadCalendar();
      showToast('Allocation removed');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove allocation');
    }
  };

  const handleDefaultShiftChange = async (v: string) => {
    if (!token) return;
    const defaultShiftTypeId = v ? parseInt(v, 10) : null;
    const prev = settings;
    setSettings(s => ({ ...s, defaultShiftTypeId }));
    try {
      const updated = await updateHrmsSettings(token, { default_shift_type_id: defaultShiftTypeId });
      setSettings(updated);
    } catch (e) {
      setSettings(prev);
      showToast(e instanceof Error ? e.message : 'Failed to update default shift');
    }
  };

  const assignDefaultToAll = async () => {
    if (!defaultShift) { showToast('No default shift configured in Settings'); return; }
    if (!token) return;
    const ts = todayStr();
    try {
      await Promise.all(unallocatedStaff.map(s => createOneDayAssignment(s.id, ts)));
      await reloadCalendar();
      showToast(`Assigned default shift to ${unallocatedStaff.length} employee(s)`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to assign default shift');
      try { await reloadCalendar(); } catch { /* ignore */ }
    }
  };

  const assignDefaultToStaff = (staff: { id: number; name: string }, date?: string) => {
    const ds = date || todayStr();
    const shiftParam = defaultShift ? `&shiftId=${defaultShift.id}` : '';
    navigate(`/hrms/shifts/assign/new?staffId=${staff.id}${shiftParam}&date=${ds}`);
  };

  const toggleRosterAllocation = async (row: { id: number; name: string; allocation: DailyShiftAllocation | null }) => {
    if (!canManage || !token || togglingId !== null) return;
    setTogglingId(row.id);
    try {
      if (row.allocation) {
        await deleteShiftAssignment(token, row.allocation.id);
        await reloadCalendar();
        showToast(`Unallocated shift for ${row.name}`);
      } else {
        if (!defaultShift) {
          navigate(`/hrms/shifts/assign/new?staffId=${row.id}&date=${todayStr()}`);
          return;
        }
        await createOneDayAssignment(row.id, todayStr());
        await reloadCalendar();
        showToast(`Allocated shift (${defaultShift.name}) for ${row.name}`);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update shift allocation');
    } finally {
      setTogglingId(null);
    }
  };

  const rosterRows = useMemo(() => {
    const ts = todayStr();
    return allStaff.map(s => {
      const alloc = allocations.find(a => a.staff_id === s.id && a.date === ts) || null;
      return { ...s, allocation: alloc };
    }).filter(row => {
      if (rosterStatusFilter === 'all') return true;
      if (rosterStatusFilter === 'unallocated') return !row.allocation;
      const st = row.allocation?.status || 'scheduled';
      return !!row.allocation && st === rosterStatusFilter;
    });
  }, [allStaff, allocations, rosterStatusFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Shift Assignments</h1>
          <p className="text-[13px] text-muted-foreground">Manage date-wise shift allocations</p>
        </div>
        <Card className="p-12 text-center text-sm text-muted-foreground/70" >
          Loading shift assignments…
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-foreground text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-primary" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Shift Assignments</h1>
        <p className="text-[13px] text-muted-foreground">Manage date-wise shift allocations</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Segmented value={String(activeView)} onValueChange={(v) => { ({ ['calendar']: (() => navigate('/hrms/shifts/assign/calendar')), ['roster']: (() => navigate('/hrms/shifts/assign/roster')) } as Record<string, () => void>)[v]?.(); }} options={[
  { value: 'calendar', label: <><CalendarDays size={16} /> Calendar Grid</> },
  { value: 'roster', label: <><Users size={16} /> Today's Roster</> }
]} />
        {canManage && (
          <Button variant="outline" onClick={() => navigate('/hrms/shifts/assign/new')}
            >
            <Plus size={16} /> Assign Shift
          </Button>
        )}
      </div>

      <Card className="overflow-hidden" >
        <div className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2"><Users size={16} /> Default Shift</h3>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Default shift for unallocated employees</p>
          </div>
          <div className="flex items-center gap-2 min-w-[200px]">
            <SearchableSelect
              value={settings.defaultShiftTypeId != null ? String(settings.defaultShiftTypeId) : ''}
              onChange={handleDefaultShiftChange}
              placeholder="No default shift"
              disabled={!canManage}
              options={shiftTypes.filter(st => st.is_active).map(st => ({ value: String(st.id), label: `${st.name} (${st.start_time} - ${st.end_time})` }))}
            />
            {settings.defaultShiftTypeId != null && defaultShift && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Using: <strong className="text-foreground/85">{defaultShift.name}</strong>
              </span>
            )}
          </div>
        </div>
      </Card>

      {activeView === 'calendar' && (
        <div className="space-y-4">
          <Card className="flex items-center gap-3 flex-wrap px-4 py-3" >
            <Button variant="ghost" size="icon-sm" onClick={prevMonth} >
              <ChevronLeft size={18} />
            </Button>
            <Input className="cursor-pointer w-auto" type="month" value={`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`}
              onChange={e => { const [y, m] = e.target.value.split('-').map(Number); setCurrentYear(y); setCurrentMonth(m - 1); }}
               />
            <Button variant="ghost" size="icon-sm" onClick={nextMonth} >
              <ChevronRight size={18} />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToToday}
              >
              Today
            </Button>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={16} />
              <Input className="w-full pl-10 pr-4" type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search employee..."
                 />
            </div>
          </Card>

          <Card className="overflow-hidden" >
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-7 border-b border-border bg-muted/50">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(name => (
                    <div key={name} className="px-2 py-2 text-xs font-medium text-muted-foreground/70 text-center">{name}</div>
                  ))}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 border-b border-border last:border-0">
                    {week.map((day, di) => {
                      const allocs = allocationsForDate(day);
                      const isToday = isSameDay(day, new Date());
                      const inMonth = day.getMonth() === currentMonth;
                      const isWeekend = di >= 5;
                      return (
                        <div key={di}
                          onClick={() => setSelectedDate(day)}
                          className={`min-h-[80px] border-r border-border last:border-r-0 p-1.5 cursor-pointer transition-colors hover:bg-muted ${isToday ? 'bg-accent/30' : ''}  ${!inMonth ? 'opacity-40' : ''}`}>
                          <div className={`text-[11px] font-semibold mb-1 ${isToday ? 'bg-foreground text-white w-6 h-6 rounded-full flex items-center justify-center' : isWeekend ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-0.5">
                            {allocs.slice(0, 3).map(a => (
                              <div key={`${a.id}-${a.staff_id}`} title={`${a.staff_name} - ${a.shift_type_name}`}
                                className="text-[11px] leading-tight px-1 py-0.5 rounded bg-secondary text-foreground/85 truncate font-medium">
                                {a.staff_name.split(' ')[0]} {a.shift_type_name.slice(0, 4)}
                              </div>
                            ))}
                            {allocs.length > 3 && (
                              <div className="text-[11px] text-muted-foreground/70 font-medium px-1">+{allocs.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {canManage && unallocatedStaff.length > 0 && (
            <Card className="overflow-hidden" >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Users size={16} /> Unallocated Today</h3>
                  <p className="text-xs text-muted-foreground/70">{unallocatedStaff.length} employee(s) without shift assignment</p>
                </div>
                {defaultShift && (
                  <Button variant="outline" size="sm" onClick={assignDefaultToAll}
                    >
                    <Plus size={14} /> Assign Default ({defaultShift.name})
                  </Button>
                )}
              </div>
              <div className="divide-y divide-border">
                {unallocatedStaff.map(s => (
                  <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-border text-foreground/70 flex items-center justify-center text-[11px] font-semibold">
                        {s.name[0]}
                      </div>
                      <span className="text-sm font-medium text-foreground/85">{s.name}</span>
                      <Badge>{s.role}</Badge>
                    </div>
                    {defaultShift && (
                      <button onClick={() => assignDefaultToStaff(s)}
                        className="text-xs text-primary hover:text-accent-foreground font-medium transition-colors">
                        Assign Default
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeView === 'roster' && (
        <Card className="overflow-hidden" >
          <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-foreground">Today's Roster</h3>
              <p className="text-xs text-muted-foreground/70">{todayStr()} — {allStaff.length} employees</p>
            </div>
            <div className="flex items-center gap-2">
              {!defaultShift && (
                <p className="text-xs text-warning">No default shift set</p>
              )}
              <select value={rosterStatusFilter} onChange={e => setRosterStatusFilter(e.target.value)}
                className={selectClass}>
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="unallocated">Unallocated</option>
              </select>
              {canManage && defaultShift && (
                <Button variant="outline" size="sm" onClick={assignDefaultToAll}
                  >
                  <Plus size={12} /> Assign Default
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left uppercase">Employee</TableHead>
                  <TableHead className="text-left uppercase">Status</TableHead>
                  <TableHead className="text-left uppercase">Shift</TableHead>
                  <TableHead className="text-left uppercase">Check In</TableHead>
                  <TableHead className="text-left uppercase">Check Out</TableHead>
                  <TableHead className="text-left uppercase">Late</TableHead>
                  <TableHead className="text-left uppercase">Break</TableHead>
                  {canManage && <TableHead className="text-left uppercase">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rosterRows.map(row => (
                  <TableRow key={row.id} className="">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-foreground text-white flex items-center justify-center text-xs font-semibold shrink-0">
                          {row.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{row.name}</p>
                          <p className="text-[11px] text-muted-foreground/70">{row.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <button
                          onClick={() => toggleRosterAllocation(row)}
                          disabled={togglingId === row.id}
                          title={row.allocation ? "Click to Unallocate shift" : (defaultShift ? `Click to Allocate default shift (${defaultShift.name})` : "Click to Assign shift")}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            row.allocation
                              ? `${STATUS_STYLES[row.allocation.status] || 'bg-secondary text-foreground/85 border-border'} hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20`
                              : 'bg-muted text-muted-foreground/70 border-border hover:bg-accent hover:text-accent-foreground hover:border-primary/20'
                          } ${togglingId === row.id ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${row.allocation ? 'bg-primary' : 'bg-input'}`}></span>
                          {row.allocation ? (STATUS_LABELS[row.allocation.status] || row.allocation.status) : 'Unallocated'}
                        </button>
                      ) : row.allocation ? (
                        <Badge className={`capitalize ${STATUS_STYLES[row.allocation.status] || ''}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                          {STATUS_LABELS[row.allocation.status] || row.allocation.status}
                        </Badge>
                      ) : (
                        <Badge>
                          <span className="w-1.5 h-1.5 rounded-full bg-input"></span>
                          Unallocated
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground/70">
                      {row.allocation ? (
                        <Badge>
                          <Clock size={10} /> {row.allocation.shift_type_name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell><span className="text-sm text-muted-foreground/70">—</span></TableCell>
                    <TableCell><span className="text-sm text-muted-foreground/70">—</span></TableCell>
                    <TableCell><span className="text-sm text-muted-foreground/70">—</span></TableCell>
                    <TableCell><span className="text-sm text-muted-foreground/70">—</span></TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {row.allocation && (
                            <>
                              <Button variant="ghost" size="icon-sm" onClick={() => navigate('/hrms/shifts/assign/new?allocId=' + row.allocation!.id)}
                                title="Edit Allocation"
                                ><Edit2 size={14} /></Button>
                              <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={() => removeAllocation(row.allocation!)}
                                title="Remove Allocation"
                                ><Trash2 size={14} /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {rosterRows.length === 0 && (
                  <TableRow><TableCell colSpan={canManage ? 8 : 7} className="text-center text-muted-foreground/70">No employees found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {selectedDate && (
        <Modal title={formatDateLabel(selectedDate)} onClose={() => setSelectedDate(null)} wide>
          <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
            {staffForDate.filter(s => s.isAllocated).length === 0 && (
              <p className="text-sm text-muted-foreground/70 text-center py-4">No allocations for this date.</p>
            )}
            {staffForDate.filter(s => s.isAllocated).map(s => (
              <div key={s.id} className="flex items-center justify-between bg-muted border border-border rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-foreground text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {s.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.allocation?.shift_type_name || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {s.allocation && (
                    <span className={`px-2 py-0.5 rounded font-semibold capitalize border ${STATUS_STYLES[s.allocation.status] || ''}`}>
                      {STATUS_LABELS[s.allocation.status]}
                    </span>
                  )}
                  <span>In: —</span>
                  <span>Out: —</span>
                  {canManage && s.allocation && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => { navigate('/hrms/shifts/assign/new?allocId=' + s.allocation!.id); setSelectedDate(null); }}
                        ><Edit2 size={14} /></Button>
                      <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={() => { removeAllocation(s.allocation!); }}
                        ><Trash2 size={14} /></Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {staffForDate.filter(s => !s.isAllocated).length > 0 && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground/70 mb-2 uppercase tracking-wider">Unallocated</p>
                {staffForDate.filter(s => !s.isAllocated).slice(0, 10).map(s => (
                  <div key={s.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-[11px] font-semibold">
                        {s.name[0]}
                      </div>
                      <span className="text-xs text-muted-foreground">{s.name}</span>
                    </div>
                    {canManage && (
                      <button onClick={() => {
                        assignDefaultToStaff(s, formatDate(selectedDate));
                        setSelectedDate(null);
                      }}
                        className="text-xs text-primary hover:text-accent-foreground font-medium">
                        Assign Default
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
