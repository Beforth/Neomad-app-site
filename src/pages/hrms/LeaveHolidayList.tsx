import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Plus, Trash2, Calendar, Wand2, Search, Sparkles, CheckSquare, Square, X, Pencil, ArrowLeft, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listHolidayLists, getHolidayList, createHolidayList, updateHolidayList, deleteHolidayList, HolidayListOut } from '../../lib/hrmsLeave';
import SearchableSelect from '../../components/SearchableSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, fieldClass, selectClass } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface HolidayItem {
  id: number;
  name: string;
  date: string;
}

const PAGE_SIZE = 10;
const inputClass = fieldClass;

const DAYS_OF_WEEK = [
  { value: 'Sunday', label: 'Sunday', dayIndex: 0 },
  { value: 'Monday', label: 'Monday', dayIndex: 1 },
  { value: 'Tuesday', label: 'Tuesday', dayIndex: 2 },
  { value: 'Wednesday', label: 'Wednesday', dayIndex: 3 },
  { value: 'Thursday', label: 'Thursday', dayIndex: 4 },
  { value: 'Friday', label: 'Friday', dayIndex: 5 },
  { value: 'Saturday', label: 'Saturday', dayIndex: 6 },
];

const FIXED_NATIONAL_HOLIDAYS = [
  { monthDay: '01-26', name: 'Republic Day' },
  { monthDay: '02-19', name: 'Chhatrapati Shivaji Maharaj Jayanti (Shiv Jayanti)' },
  { monthDay: '04-14', name: 'Dr. B.R. Ambedkar Jayanti' },
  { monthDay: '05-01', name: 'Maharashtra Day / International Workers Day' },
  { monthDay: '08-15', name: 'Independence Day' },
  { monthDay: '10-02', name: 'Mahatma Gandhi Jayanti' },
  { monthDay: '12-25', name: 'Christmas Day' },
];

export default function LeaveHolidayList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const isFormMode = location.pathname.endsWith('/new') || !!id;
  const isEditMode = !!id;

  const [holidayLists, setHolidayLists] = useState<HolidayListOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);

  // Form State
  const [editingId, setEditingId] = useState<number | null>(id ? parseInt(id, 10) : null);
  const [name, setName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [weeklyOff, setWeeklyOff] = useState('Sunday');
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [saving, setSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Delete modal state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [showFixedPanel, setShowFixedPanel] = useState(false);
  const [selectedFixedHolidays, setSelectedFixedHolidays] = useState<string[]>(
    FIXED_NATIONAL_HOLIDAYS.map((h) => h.monthDay)
  );

  const showInfo = (msg: string) => { setInfoMsg(msg); setTimeout(() => setInfoMsg(''), 3000); };

  const fetchLists = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await listHolidayLists(token);
      setHolidayLists(res);
    } catch (err: any) {
      console.error('Failed to load holiday lists:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  useEffect(() => {
    if (isEditMode && id && token) {
      const listId = parseInt(id, 10);
      setEditingId(listId);
      getHolidayList(token, listId)
        .then((data) => {
          setName(data.name || '');
          setFromDate(data.from_date || '');
          setToDate(data.to_date || '');
          setHolidays(
            (data.holidays || []).map((h, idx) => ({
              id: h.id || idx + 1,
              name: h.name,
              date: h.date,
            }))
          );
        })
        .catch((err) => setErrorMsg(err.message || 'Failed to load holiday list'));
    } else if (!isEditMode) {
      setEditingId(null);
      setName('');
      setFromDate('');
      setToDate('');
      setHolidays([]);
    }
  }, [id, isEditMode, token]);

  const toggleSelectFixed = (monthDay: string) => {
    setSelectedFixedHolidays((prev) =>
      prev.includes(monthDay)
        ? prev.filter((m) => m !== monthDay)
        : [...prev, monthDay]
    );
  };

  const toggleSelectAllFixed = () => {
    if (selectedFixedHolidays.length === FIXED_NATIONAL_HOLIDAYS.length) {
      setSelectedFixedHolidays([]);
    } else {
      setSelectedFixedHolidays(FIXED_NATIONAL_HOLIDAYS.map((h) => h.monthDay));
    }
  };

  function addWeeklyHolidays() {
    setErrorMsg('');
    if (!fromDate || !toDate) {
      setErrorMsg('Please select From Date and To Date before adding weekly holidays.');
      return;
    }
    const start = new Date(fromDate + 'T00:00:00');
    const end = new Date(toDate + 'T00:00:00');
    if (end < start) {
      setErrorMsg('To Date must be on or after From Date.');
      return;
    }

    const matchedDay = DAYS_OF_WEEK.find((d) => d.value === weeklyOff);
    if (!matchedDay) return;

    const targetDayIndex = matchedDay.dayIndex;
    const existingDates = new Set(holidays.map((h) => h.date));
    const newItems: HolidayItem[] = [];

    const curr = new Date(start);
    let counter = Date.now();

    while (curr <= end) {
      if (curr.getDay() === targetDayIndex) {
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        if (!existingDates.has(dateStr)) {
          existingDates.add(dateStr);
          newItems.push({
            id: counter++,
            name: `${weeklyOff} (Weekly Off)`,
            date: dateStr,
          });
        }
      }
      curr.setDate(curr.getDate() + 1);
    }

    if (newItems.length === 0) {
      showInfo(`No new ${weeklyOff} dates found in the selected range.`);
      return;
    }

    setHolidays((prev) => [...prev, ...newItems]);
    showInfo(`Added ${newItems.length} ${weeklyOff} weekly off days to the list.`);
  }

  function addSelectedFixedHolidays() {
    setErrorMsg('');
    if (!fromDate || !toDate) {
      setErrorMsg('Please select From Date and To Date before adding fixed national holidays.');
      return;
    }
    const start = new Date(fromDate + 'T00:00:00');
    const end = new Date(toDate + 'T00:00:00');
    if (end < start) {
      setErrorMsg('To Date must be on or after From Date.');
      return;
    }
    if (selectedFixedHolidays.length === 0) {
      setErrorMsg('Please select at least one fixed holiday.');
      return;
    }

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const existingDates = new Set(holidays.map((h) => h.date));
    const newItems: HolidayItem[] = [];
    let counter = Date.now() + 1000;

    const targets = FIXED_NATIONAL_HOLIDAYS.filter((h) => selectedFixedHolidays.includes(h.monthDay));

    for (let yr = startYear; yr <= endYear; yr++) {
      for (const h of targets) {
        const dateStr = `${yr}-${h.monthDay}`;
        const itemDate = new Date(dateStr + 'T00:00:00');
        if (itemDate >= start && itemDate <= end && !existingDates.has(dateStr)) {
          existingDates.add(dateStr);
          newItems.push({
            id: counter++,
            name: h.name,
            date: dateStr,
          });
        }
      }
    }

    if (newItems.length === 0) {
      showInfo('No new selected fixed national holidays fall in the selected date range.');
      setShowFixedPanel(false);
      return;
    }

    setHolidays((prev) => [...prev, ...newItems]);
    showInfo(`Added ${newItems.length} selected fixed national/state holidays to the table.`);
    setShowFixedPanel(false);
  }

  function addHoliday() {
    if (!holidayDate.trim() || !holidayName.trim()) return;
    if (holidays.some((h) => h.date === holidayDate)) {
      setErrorMsg(`A holiday on ${holidayDate} already exists in the list.`);
      return;
    }
    setErrorMsg('');
    const newId = holidays.length > 0 ? Math.max(...holidays.map((h) => h.id)) + 1 : Date.now();
    setHolidays((prev) => [...prev, { id: newId, name: holidayName.trim(), date: holidayDate }]);
    setHolidayDate('');
    setHolidayName('');
  }

  function removeHoliday(id: number) {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  }

  function clearAllHolidays() {
    setHolidays([]);
    showInfo('Holidays table cleared.');
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !token) return;
    setSaving(true);
    setErrorMsg('');

    try {
      if (editingId) {
        await updateHolidayList(token, editingId, {
          name: name.trim(),
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          holidays: holidays.map((h) => ({ name: h.name, date: h.date })),
        });
      } else {
        await createHolidayList(token, {
          name: name.trim(),
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          holidays: holidays.map((h) => ({ name: h.name, date: h.date })),
        });
      }
      await fetchLists();
      navigate('/hrms/leave/holiday-list');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save holiday list');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteList = async () => {
    if (!deleteId || !token) return;
    try {
      await deleteHolidayList(token, deleteId);
      setDeleteId(null);
      await fetchLists();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete holiday list');
    }
  };

  const filteredHolidayLists = useMemo(() => {
    return holidayLists.filter((hl) =>
      hl.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [holidayLists, search]);

  const listTotalPages = Math.ceil(filteredHolidayLists.length / listPageSize) || 1;
  const pagedHolidayLists = useMemo(() => {
    const start = (listPage - 1) * listPageSize;
    return filteredHolidayLists.slice(start, start + listPageSize);
  }, [filteredHolidayLists, listPage, listPageSize]);

  const filteredHolidays = useMemo(() => {
    return holidays
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((h) => {
        if (!tableSearch.trim()) return true;
        const q = tableSearch.toLowerCase();
        return h.name.toLowerCase().includes(q) || h.date.includes(q);
      });
  }, [holidays, tableSearch]);

  const tableTotalPages = Math.ceil(filteredHolidays.length / tablePageSize) || 1;
  const pagedHolidays = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return filteredHolidays.slice(start, start + tablePageSize);
  }, [filteredHolidays, tablePage, tablePageSize]);

  // LIST VIEW
  if (!isFormMode) {
    return (
      <div className="space-y-6">
        <PageHeader title="Holiday Lists" description="Manage company holiday schedules and official rest days" actions={<>
<Button variant="dark" size="sm" className="cursor-pointer"
            onClick={() => navigate('/hrms/leave/holiday-list/new')}
            
          >
            <Plus size={16} /> New Holiday List
          </Button>
</>} />

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={15} />
            <Input data-search="" className="w-full pl-9 pr-4"
              type="text"
              placeholder="Search holiday lists..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setListPage(1); }}
              
            />
          </div>
        </div>

        {/* Holiday Lists Table */}
        <Card className="overflow-hidden" >
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground/70 font-medium">Loading holiday lists...</div>
          ) : filteredHolidayLists.length === 0 ? (
            <EmptyState icon={<Inbox />} title={holidayLists.length === 0 ? 'No holiday lists created yet' : 'No matching holiday lists'} description={holidayLists.length === 0 ? 'Click "New Holiday List" above to create your first company holiday schedule.' : 'Try adjusting your search query.'} className="border-0" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="uppercase">Holiday List Name</TableHead>
                      <TableHead className="uppercase">From Date</TableHead>
                      <TableHead className="uppercase">To Date</TableHead>
                      <TableHead className="uppercase">Total Holidays</TableHead>
                      <TableHead className="uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedHolidayLists.map((hl, i) => (
                      <motion.tr
                        key={hl.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b transition-colors hover:bg-muted/70"
                      >
                        <TableCell className="font-semibold text-foreground cursor-pointer" onClick={() => navigate(`/hrms/leave/holiday-list/edit/${hl.id}`)}>
                          {hl.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{hl.from_date || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{hl.to_date || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="success" >
                            {(hl.holidays || []).length} Holidays
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon-sm" className="cursor-pointer"
                              onClick={() => navigate(`/hrms/leave/holiday-list/edit/${hl.id}`)}
                              
                              title="Edit Holiday List"
                            >
                              <Pencil size={15} />
                            </Button>
                            <Button variant="ghost" size="icon-sm" className="cursor-pointer text-destructive bg-destructive/10"
                              onClick={() => setDeleteId(hl.id)}
                              
                              title="Delete Holiday List"
                            >
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* List Pagination */}
              <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
                <div className="flex items-center gap-3">
                  <span>
                    Showing {filteredHolidayLists.length === 0 ? 0 : (listPage - 1) * listPageSize + 1}–{Math.min(listPage * listPageSize, filteredHolidayLists.length)} of {filteredHolidayLists.length} holiday lists
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                    <span>Per page:</span>
                    <select
                      value={listPageSize}
                      onChange={(e) => { setListPageSize(Number(e.target.value)); setListPage(1); }}
                      className={selectClass}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" className="cursor-pointer"
                    onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    disabled={listPage === 1}
                    
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="font-semibold text-foreground/85 px-2">{listPage} / {listTotalPages}</span>
                  <Button variant="ghost" size="icon-sm" className="cursor-pointer"
                    onClick={() => setListPage((p) => Math.min(listTotalPages, p + 1))}
                    disabled={listPage === listTotalPages}
                    
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteId !== null && (
            <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-sm">
<DialogTitle className="sr-only">Dialog</DialogTitle>
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-semibold text-foreground">Delete Holiday List?</h3>
                  <p className="text-xs text-muted-foreground">This action will delete the holiday list permanently. This cannot be undone.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" size="sm" className="flex-1 cursor-pointer"
                    onClick={() => setDeleteId(null)}
                    
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1 cursor-pointer"
                    onClick={handleDeleteList}
                    
                  >
                    Yes, Delete
                  </Button>
                </div>
              </DialogContent>
</Dialog>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // FORM VIEW (NEW / EDIT)
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Button variant="ghost" size="icon-sm" className="cursor-pointer"
          onClick={() => navigate('/hrms/leave/holiday-list')}
          
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {isEditMode ? 'Edit Holiday List' : 'New Holiday List'}
          </h1>
          <p className="text-[13px] text-muted-foreground">Frappe-style Holiday List builder with automatic weekly off generator</p>
        </div>
      </motion.div>

      {errorMsg && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs font-medium border border-destructive/20">
          {errorMsg}
        </div>
      )}

      {infoMsg && (
        <div className="p-3 bg-accent text-accent-foreground rounded-xl text-xs font-medium border border-primary/20">
          {infoMsg}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <form onSubmit={handleSave}>
            {/* Header Basic Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-5">
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Holiday List Name *</label>
                <Input type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. FY 2026–2027 Holidays"
                   />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">From Date *</label>
                <Input type="date" required value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                   />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">To Date *</label>
                <Input type="date" required value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                   />
              </div>
            </div>

            {/* Weekly Off Generator */}
            <div className="border-t border-border p-5 bg-muted/50 space-y-3">
              <div className="flex items-center gap-2">
                <Wand2 size={16} className="text-foreground" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Add Weekly Holidays (Weekly Off)</h3>
              </div>
              <p className="text-xs text-muted-foreground">Automatically generate weekly rest days between From Date and To Date.</p>
              
              <div className="flex flex-wrap items-end gap-3 pt-1">
                <div className="w-[180px]">
                  <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Weekly Off Day</label>
                  <SearchableSelect
                    value={weeklyOff}
                    onChange={setWeeklyOff}
                    options={DAYS_OF_WEEK.map((d) => ({ value: d.value, label: d.label }))}
                  />
                </div>
                <Button variant="dark" size="sm" className="cursor-pointer"
                  type="button"
                  onClick={addWeeklyHolidays}
                  
                >
                  <Plus size={14} /> Add to Holidays
                </Button>
              </div>
            </div>

            {/* Fixed National & State Holidays */}
            <div className="border-t border-border p-5 bg-muted/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-foreground" />
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Fixed National & State Holidays</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Select and add fixed calendar holidays (Gandhi Jayanti, Ambedkar Jayanti, Shiv Jayanti, Republic Day, etc.)</p>
                </div>
                <Button variant="dark" size="sm" className="cursor-pointer"
                  type="button"
                  onClick={() => setShowFixedPanel((v) => !v)}
                  
                >
                  <Sparkles size={14} /> Add Fixed National Holidays
                </Button>
              </div>

              <AnimatePresence>
                {showFixedPanel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 bg-card border border-border rounded-xl p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)] space-y-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">Select Holidays to Include</span>
                        <button
                          type="button"
                          onClick={toggleSelectAllFixed}
                          className="text-[11px] text-foreground font-semibold hover:underline cursor-pointer"
                        >
                          {selectedFixedHolidays.length === FIXED_NATIONAL_HOLIDAYS.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFixedPanel(false)}
                        className="text-muted-foreground/70 hover:text-foreground/85 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {FIXED_NATIONAL_HOLIDAYS.map((h) => {
                        const checked = selectedFixedHolidays.includes(h.monthDay);
                        return (
                          <div
                            key={h.monthDay}
                            onClick={() => toggleSelectFixed(h.monthDay)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition-all ${
                              checked
                                ? 'bg-secondary border-input text-foreground shadow-2xs font-semibold'
                                : 'bg-card border-border text-foreground/70 hover:border-input hover:bg-muted/50'
                            }`}
                          >
                            {checked ? (
                              <CheckSquare size={16} className="text-foreground shrink-0" />
                            ) : (
                              <Square size={16} className="text-muted-foreground/50 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className={`text-[11px] font-mono font-semibold block leading-none ${checked ? 'text-foreground/85' : 'text-muted-foreground/70'}`}>
                                {h.monthDay}
                              </span>
                              <span className={`text-xs block mt-0.5 truncate ${checked ? 'font-bold text-foreground' : 'font-medium text-foreground/85'}`}>
                                {h.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                      <Button variant="secondary" size="sm" className="cursor-pointer"
                        type="button"
                        onClick={() => setShowFixedPanel(false)}
                        
                      >
                        Cancel
                      </Button>
                      <Button variant="dark" size="sm" className="cursor-pointer"
                        type="button"
                        onClick={addSelectedFixedHolidays}
                        disabled={selectedFixedHolidays.length === 0}
                        
                      >
                        <Plus size={14} /> Add to Holidays ({selectedFixedHolidays.length})
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Manual Holiday Addition */}
            <div className="border-t border-border p-5 space-y-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Add Specific Festival / Local Holiday</h3>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[160px]">
                  <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Holiday Date</label>
                  <Input type="date" value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                     />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Holiday Name / Description</label>
                  <Input type="text" value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="e.g. Diwali, Independence Day"
                     />
                </div>
                <Button variant="dark" size="sm" className="shrink-0 cursor-pointer" type="button" onClick={addHoliday}
                  disabled={!holidayDate.trim() || !holidayName.trim()}
                  >
                  <Plus size={14} /> Add Row
                </Button>
              </div>
            </div>

            {/* Holidays Table & Controls */}
            <div className="border-t border-border p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-foreground">Holidays List</span>
                  <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-md bg-foreground text-[11px] font-semibold text-white px-2">
                    {holidays.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-[180px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={12} />
                    <Input data-search="" className="w-full pl-8 pr-3"
                      type="text"
                      placeholder="Search table..."
                      value={tableSearch}
                      onChange={(e) => { setTableSearch(e.target.value); setTablePage(1); }}
                      
                    />
                  </div>
                  {holidays.length > 0 && (
                    <Button variant="outline" size="xs" className="cursor-pointer text-destructive hover:text-destructive bg-destructive/10 hover:bg-destructive/15 border-destructive/20"
                      type="button"
                      onClick={clearAllHolidays}
                      
                    >
                      <Trash2 size={12} /> Clear Table
                    </Button>
                  )}
                </div>
              </div>

              {filteredHolidays.length > 0 ? (
                <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="uppercase w-12">#</TableHead>
                          <TableHead className="uppercase w-36">Date</TableHead>
                          <TableHead className="uppercase w-32">Day</TableHead>
                          <TableHead className="uppercase">Holiday Name</TableHead>
                          <TableHead className="uppercase text-right w-16">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedHolidays.map((h, i) => {
                          const globalIdx = (tablePage - 1) * tablePageSize + i + 1;
                          const d = new Date(h.date + 'T00:00:00');
                          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                          return (
                            <TableRow key={h.id} className="">
                              <TableCell className="text-muted-foreground/70 font-mono">{globalIdx}</TableCell>
                              <TableCell className="font-semibold text-foreground">{h.date}</TableCell>
                              <TableCell className="font-medium text-muted-foreground">{dayName}</TableCell>
                              <TableCell className="font-semibold text-foreground">{h.name}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon-sm" className="cursor-pointer hover:text-destructive hover:bg-destructive/10" type="button" onClick={() => removeHoliday(h.id)}
                                  >
                                  <Trash2 size={14} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Form Inner Table Pagination */}
                  <div className="px-4 py-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span>
                        Showing {filteredHolidays.length === 0 ? 0 : (tablePage - 1) * tablePageSize + 1}–{Math.min(tablePage * tablePageSize, filteredHolidays.length)} of {filteredHolidays.length} holidays
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                        <span>Per page:</span>
                        <select
                          value={tablePageSize}
                          onChange={(e) => { setTablePageSize(Number(e.target.value)); setTablePage(1); }}
                          className={selectClass}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" className="cursor-pointer"
                        type="button"
                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                        disabled={tablePage === 1}
                        
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <span className="font-semibold text-foreground/85 px-2">{tablePage} / {tableTotalPages}</span>
                      <Button variant="ghost" size="icon-sm" className="cursor-pointer"
                        type="button"
                        onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}
                        disabled={tablePage === tableTotalPages}
                        
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-muted/50 border border-dashed border-border rounded-xl">
                  <Calendar className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground/70">No holidays added to this list yet.</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Use "Add to Holidays" or "Add Fixed National Holidays" above to generate dates or add custom dates.</p>
                </div>
              )}
            </div>

            {/* Footer Form Buttons */}
            <div className="border-t border-border p-5 flex gap-3">
              <Button variant="secondary" className="flex-1 cursor-pointer" type="button" onClick={() => navigate('/hrms/leave/holiday-list')}
                >
                Cancel
              </Button>
              <Button variant="dark" className="flex-1 cursor-pointer" type="submit" disabled={saving || !name.trim()}
                >
                <Save size={16} /> {saving ? 'Saving...' : isEditMode ? 'Update Holiday List' : 'Create Holiday List'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
