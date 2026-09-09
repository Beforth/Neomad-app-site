import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Plus, Trash2, Calendar, Wand2, Search, Sparkles, CheckSquare, Square, X, Pencil, ArrowLeft, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listHolidayLists, getHolidayList, createHolidayList, updateHolidayList, deleteHolidayList, HolidayListOut } from '../../lib/hrmsLeave';
import SearchableSelect from '../../components/SearchableSelect';

interface HolidayItem {
  id: number;
  name: string;
  date: string;
}

const PAGE_SIZE = 10;
const inputClass = "w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all";

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Holiday Lists</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Manage company holiday schedules and official rest days</p>
          </div>
          <button
            onClick={() => navigate('/hrms/leave/holiday-list/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={16} /> New Holiday List
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
            <input
              type="text"
              placeholder="Search holiday lists..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setListPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
            />
          </div>
        </div>

        {/* Holiday Lists Table */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-zinc-400 font-medium">Loading holiday lists...</div>
          ) : filteredHolidayLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
                <Inbox size={24} className="text-zinc-300" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">{holidayLists.length === 0 ? 'No holiday lists created yet' : 'No matching holiday lists'}</h3>
              <p className="text-xs text-zinc-400 max-w-xs">{holidayLists.length === 0 ? 'Click "New Holiday List" above to create your first company holiday schedule.' : 'Try adjusting your search query.'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Holiday List Name</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">From Date</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">To Date</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Holidays</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {pagedHolidayLists.map((hl, i) => (
                      <motion.tr
                        key={hl.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-zinc-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs font-bold text-zinc-900 cursor-pointer hover:text-zinc-700" onClick={() => navigate(`/hrms/leave/holiday-list/edit/${hl.id}`)}>
                          {hl.name}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{hl.from_date || '—'}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{hl.to_date || '—'}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {(hl.holidays || []).length} Holidays
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/hrms/leave/holiday-list/edit/${hl.id}`)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Holiday List"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteId(hl.id)}
                              className="p-1.5 text-rose-600 bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Holiday List"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* List Pagination */}
              <div className="px-4 py-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 bg-zinc-50/30">
                <div className="flex items-center gap-3">
                  <span>
                    Showing {filteredHolidayLists.length === 0 ? 0 : (listPage - 1) * listPageSize + 1}–{Math.min(listPage * listPageSize, filteredHolidayLists.length)} of {filteredHolidayLists.length} holiday lists
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <span>Per page:</span>
                    <select
                      value={listPageSize}
                      onChange={(e) => { setListPageSize(Number(e.target.value)); setListPage(1); }}
                      className="bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-xs font-semibold text-zinc-700 outline-none cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    disabled={listPage === 1}
                    className="p-1 rounded hover:bg-zinc-200 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-bold text-zinc-700 px-2">{listPage} / {listTotalPages}</span>
                  <button
                    onClick={() => setListPage((p) => Math.min(listTotalPages, p + 1))}
                    disabled={listPage === listTotalPages}
                    className="p-1 rounded hover:bg-zinc-200 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteId !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-zinc-900">Delete Holiday List?</h3>
                  <p className="text-xs text-zinc-500">This action will delete the holiday list permanently. This cannot be undone.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDeleteId(null)}
                    className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteList}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                </div>
              </motion.div>
            </div>
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
        <button
          onClick={() => navigate('/hrms/leave/holiday-list')}
          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            {isEditMode ? 'Edit Holiday List' : 'New Holiday List'}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Frappe-style Holiday List builder with automatic weekly off generator</p>
        </div>
      </motion.div>

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200">
          {errorMsg}
        </div>
      )}

      {infoMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium border border-emerald-200">
          {infoMsg}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm">
          <form onSubmit={handleSave}>
            {/* Header Basic Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-5">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Holiday List Name *</label>
                <input type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. FY 2026–2027 Holidays"
                  className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">From Date *</label>
                <input type="date" required value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">To Date *</label>
                <input type="date" required value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={inputClass} />
              </div>
            </div>

            {/* Weekly Off Generator */}
            <div className="border-t border-zinc-200 p-5 bg-zinc-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <Wand2 size={16} className="text-zinc-800" />
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Add Weekly Holidays (Weekly Off)</h3>
              </div>
              <p className="text-xs text-zinc-500">Automatically generate weekly rest days between From Date and To Date.</p>
              
              <div className="flex flex-wrap items-end gap-3 pt-1">
                <div className="w-[180px]">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Weekly Off Day</label>
                  <SearchableSelect
                    value={weeklyOff}
                    onChange={setWeeklyOff}
                    options={DAYS_OF_WEEK.map((d) => ({ value: d.value, label: d.label }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={addWeeklyHolidays}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  <Plus size={14} /> Add to Holidays
                </button>
              </div>
            </div>

            {/* Fixed National & State Holidays */}
            <div className="border-t border-zinc-200 p-5 bg-zinc-50/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-zinc-900" />
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Fixed National & State Holidays</h3>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">Select and add fixed calendar holidays (Gandhi Jayanti, Ambedkar Jayanti, Shiv Jayanti, Republic Day, etc.)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFixedPanel((v) => !v)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  <Sparkles size={14} /> Add Fixed National Holidays
                </button>
              </div>

              <AnimatePresence>
                {showFixedPanel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900">Select Holidays to Include</span>
                        <button
                          type="button"
                          onClick={toggleSelectAllFixed}
                          className="text-[11px] text-zinc-900 font-bold hover:underline cursor-pointer"
                        >
                          {selectedFixedHolidays.length === FIXED_NATIONAL_HOLIDAYS.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFixedPanel(false)}
                        className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
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
                                ? 'bg-zinc-100 border-zinc-300 text-zinc-900 shadow-2xs font-semibold'
                                : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50/50'
                            }`}
                          >
                            {checked ? (
                              <CheckSquare size={16} className="text-zinc-900 shrink-0" />
                            ) : (
                              <Square size={16} className="text-zinc-300 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className={`text-[10px] font-mono font-bold block leading-none ${checked ? 'text-zinc-700' : 'text-zinc-400'}`}>
                                {h.monthDay}
                              </span>
                              <span className={`text-xs block mt-0.5 truncate ${checked ? 'font-bold text-zinc-900' : 'font-medium text-zinc-700'}`}>
                                {h.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowFixedPanel(false)}
                        className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={addSelectedFixedHolidays}
                        disabled={selectedFixedHolidays.length === 0}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Plus size={14} /> Add to Holidays ({selectedFixedHolidays.length})
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Manual Holiday Addition */}
            <div className="border-t border-zinc-200 p-5 space-y-3">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Add Specific Festival / Local Holiday</h3>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[160px]">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Holiday Date</label>
                  <input type="date" value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className={inputClass} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Holiday Name / Description</label>
                  <input type="text" value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="e.g. Diwali, Independence Day"
                    className={inputClass} />
                </div>
                <button type="button" onClick={addHoliday}
                  disabled={!holidayDate.trim() || !holidayName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer">
                  <Plus size={14} /> Add Row
                </button>
              </div>
            </div>

            {/* Holidays Table & Controls */}
            <div className="border-t border-zinc-200 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-900">Holidays List</span>
                  <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-md bg-zinc-900 text-[11px] font-bold text-white px-2">
                    {holidays.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-[180px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={12} />
                    <input
                      type="text"
                      placeholder="Search table..."
                      value={tableSearch}
                      onChange={(e) => { setTableSearch(e.target.value); setTablePage(1); }}
                      className="w-full pl-8 pr-3 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-xs outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                  {holidays.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllHolidays}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-bold px-3 py-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-200 cursor-pointer"
                    >
                      <Trash2 size={12} /> Clear Table
                    </button>
                  )}
                </div>
              </div>

              {filteredHolidays.length > 0 ? (
                <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest w-12">#</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest w-36">Date</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest w-32">Day</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Holiday Name</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 bg-white">
                        {pagedHolidays.map((h, i) => {
                          const globalIdx = (tablePage - 1) * tablePageSize + i + 1;
                          const d = new Date(h.date + 'T00:00:00');
                          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                          return (
                            <tr key={h.id} className="hover:bg-zinc-50/70 transition-colors">
                              <td className="px-4 py-2.5 text-xs text-zinc-400 font-mono">{globalIdx}</td>
                              <td className="px-4 py-2.5 text-xs font-semibold text-zinc-900">{h.date}</td>
                              <td className="px-4 py-2.5 text-xs font-medium text-zinc-500">{dayName}</td>
                              <td className="px-4 py-2.5 text-xs font-bold text-zinc-900">{h.name}</td>
                              <td className="px-4 py-2.5 text-right">
                                <button type="button" onClick={() => removeHoliday(h.id)}
                                  className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Form Inner Table Pagination */}
                  <div className="px-4 py-2.5 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500 bg-zinc-50/50">
                    <div className="flex items-center gap-3">
                      <span>
                        Showing {filteredHolidays.length === 0 ? 0 : (tablePage - 1) * tablePageSize + 1}–{Math.min(tablePage * tablePageSize, filteredHolidays.length)} of {filteredHolidays.length} holidays
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <span>Per page:</span>
                        <select
                          value={tablePageSize}
                          onChange={(e) => { setTablePageSize(Number(e.target.value)); setTablePage(1); }}
                          className="bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-xs font-semibold text-zinc-700 outline-none cursor-pointer"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                        disabled={tablePage === 1}
                        className="p-1 rounded hover:bg-zinc-200 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="font-bold text-zinc-700 px-2">{tablePage} / {tableTotalPages}</span>
                      <button
                        type="button"
                        onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}
                        disabled={tablePage === tableTotalPages}
                        className="p-1 rounded hover:bg-zinc-200 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-zinc-50/50 border border-dashed border-zinc-200 rounded-xl">
                  <Calendar className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-zinc-600">No holidays added to this list yet.</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Use "Add to Holidays" or "Add Fixed National Holidays" above to generate dates or add custom dates.</p>
                </div>
              )}
            </div>

            {/* Footer Form Buttons */}
            <div className="border-t border-zinc-200 p-5 flex gap-3">
              <button type="button" onClick={() => navigate('/hrms/leave/holiday-list')}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={saving || !name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                <Save size={16} /> {saving ? 'Saving...' : isEditMode ? 'Update Holiday List' : 'Create Holiday List'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
