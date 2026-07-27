import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Save, Plus, Trash2, Calendar } from 'lucide-react';

interface HolidayItem {
  id: number;
  name: string;
  date: string;
}

const inputClass = "w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all";

export default function LeaveHolidayList() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');

  function addHoliday() {
    if (!holidayDate.trim() || !holidayName.trim()) return;
    const newId = holidays.length > 0 ? Math.max(...holidays.map((h) => h.id)) + 1 : 1;
    setHolidays((prev) => [...prev, { id: newId, name: holidayName.trim(), date: holidayDate }]);
    setHolidayDate('');
    setHolidayName('');
  }

  function removeHoliday(id: number) {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const stored = localStorage.getItem('holidayLists');
    const lists = stored ? JSON.parse(stored) : [];
    const newId = lists.length > 0 ? Math.max(...lists.map((h: any) => h.id)) + 1 : 1;
    lists.push({ id: newId, name: name.trim(), fromDate, toDate, holidays });
    localStorage.setItem('holidayLists', JSON.stringify(lists));

    navigate('/hrms/leave/period/new');
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => navigate('/hrms/leave/period/new')}
          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Holiday List</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Create a holiday list for optional leaves</p>
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
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Holiday List Name *</label>
                  <input type="text" required value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. FY 2026–2027 Holidays"
                    className={inputClass} />
                </div>
              </div>
              <div className="border-t lg:border-t-0 lg:border-l border-zinc-200 pt-4 lg:pt-0 lg:pl-6 space-y-4">
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
            </div>

            <div className="border-t border-zinc-200 px-5 py-4 flex items-center gap-3">
              <Calendar size={16} className="text-zinc-400" />
              <span className="text-xs text-zinc-500">Total Holidays:</span>
              <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg bg-zinc-900 text-[11px] font-bold text-white px-2">
                {holidays.length}
              </span>
            </div>

            <div className="border-t border-zinc-200 p-5 space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Add Holidays</p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Date</label>
                  <input type="date" value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className={inputClass} />
                </div>
                <div className="flex-[2]">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Holiday Name</label>
                  <input type="text" value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="e.g. Diwali"
                    className={inputClass} />
                </div>
                <button type="button" onClick={addHoliday}
                  disabled={!holidayDate.trim() || !holidayName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                  <Plus size={14} /> Add
                </button>
              </div>

              {holidays.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {holidays
                    .slice()
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((h) => (
                      <div key={h.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-zinc-500 w-[100px]">{h.date}</span>
                          <span className="text-xs font-bold text-zinc-900">{h.name}</span>
                        </div>
                        <button type="button" onClick={() => removeHoliday(h.id)}
                          className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 p-5 flex gap-3">
              <button type="button" onClick={() => navigate('/hrms/leave/period/new')}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Save size={16} /> Create
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
