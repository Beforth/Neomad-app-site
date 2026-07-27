import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Save } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';

interface LeavePeriodItem {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  holidayListId: number | null;
}

const initialPeriods: LeavePeriodItem[] = [
  { id: 1, label: 'FY 2025–2026', startDate: '2025-04-01', endDate: '2026-03-31', isActive: false, holidayListId: null },
  { id: 2, label: 'FY 2026–2027', startDate: '2026-04-01', endDate: '2027-03-31', isActive: true, holidayListId: null },
];

function loadPeriods(): LeavePeriodItem[] {
  try {
    const stored = localStorage.getItem('leavePeriods');
    return stored ? JSON.parse(stored) : initialPeriods;
  } catch {
    return initialPeriods;
  }
}

const inputClass = "w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all";

export default function LeavePeriodForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [holidayListId, setHolidayListId] = useState('');
  const [holidayOptions, setHolidayOptions] = useState<{ value: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('holidayLists');
      const lists = stored ? JSON.parse(stored) : [];
      setHolidayOptions([
        ...lists.map((h: any) => ({ value: String(h.id), label: h.name })),
        { value: '__create__', label: '+ Create Holiday List' },
      ]);
    } catch {
      setHolidayOptions([{ value: '__create__', label: '+ Create Holiday List' }]);
    }
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const periods = loadPeriods();
    const item = periods.find((p) => p.id === Number(id));
    if (!item) { setNotFound(true); return; }
    setLabel(item.label);
    setStartDate(item.startDate);
    setEndDate(item.endDate);
    setIsActive(item.isActive);
    setHolidayListId(item.holidayListId ? String(item.holidayListId) : '');
  }, [id, isEdit]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !startDate || !endDate) return;
    setSaving(true);

    const periods = loadPeriods();
    if (isEdit) {
      const idx = periods.findIndex((p) => p.id === Number(id));
      if (idx >= 0) {
        const upd = { ...periods[idx], label: label.trim(), startDate, endDate, isActive, holidayListId: holidayListId ? Number(holidayListId) : null };
        if (upd.isActive) {
          periods.forEach((p) => p.isActive = false);
        }
        periods[idx] = upd;
      }
    } else {
      const newId = Math.max(...periods.map((p) => p.id), 0) + 1;
      if (isActive) {
        periods.forEach((p) => p.isActive = false);
      }
      periods.push({ id: newId, label: label.trim(), startDate, endDate, isActive, holidayListId: holidayListId ? Number(holidayListId) : null });
    }
    localStorage.setItem('leavePeriods', JSON.stringify(periods));
    setSaving(false);
    navigate('/hrms/leave/period');
  };

  const handleHolidayChange = (val: string) => {
    if (val === '__create__') {
      navigate('/hrms/leave/period/holidays/new');
      return;
    }
    setHolidayListId(val);
  };

  if (notFound) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Leave period not found</h3>
          <p className="text-xs text-zinc-400 mb-4">The leave period you're trying to edit doesn't exist.</p>
          <button onClick={() => navigate('/hrms/leave/period')}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
            Back to Leave Periods
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => navigate('/hrms/leave/period')}
          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{isEdit ? 'Edit Leave Period' : 'New Leave Period'}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{isEdit ? 'Update the leave cycle details' : 'Create a new leave cycle'}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm">
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Period Label *</label>
                  <input type="text" required value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. FY 2027–2028"
                    className={inputClass} />
                </div>
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${isActive ? 'bg-zinc-900' : 'border-2 border-zinc-400 hover:border-zinc-600'}`}>
                      <input type="checkbox" checked={isActive}
                        onChange={() => setIsActive((v) => !v)}
                        className="sr-only" />
                      {isActive && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                          className="w-3 h-3 pointer-events-none">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-zinc-700">Set as Active Period</span>
                  </label>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Holidays for Optional Leaves</label>
                  <SearchableSelect
                    value={holidayListId}
                    onChange={handleHolidayChange}
                    options={holidayOptions}
                    placeholder="Select or create"
                  />
                  {isEdit && holidayListId && (() => {
                    const stored = localStorage.getItem('holidayLists');
                    const lists = stored ? JSON.parse(stored) : [];
                    const found = lists.find((h: any) => String(h.id) === holidayListId);
                    if (!found) return null;
                    return (
                      <div className="mt-2 text-[11px] text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100">
                        <span className="font-medium text-zinc-700">{found.name}</span>
                        <span className="mx-1.5">·</span>
                        <span>{found.holidays?.length ?? 0} holidays</span>
                        {found.fromDate && found.toDate && (
                          <>
                            <span className="mx-1.5">·</span>
                            <span>{found.fromDate} → {found.toDate}</span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="border-t lg:border-t-0 lg:border-l border-zinc-200 pt-4 lg:pt-0 lg:pl-6 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Start Date *</label>
                  <input type="date" required value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">End Date *</label>
                  <input type="date" required value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass} />
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-200 p-5 flex gap-3">
              <button type="button" onClick={() => navigate('/hrms/leave/period')}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving || !label.trim() || !startDate || !endDate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Period'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
