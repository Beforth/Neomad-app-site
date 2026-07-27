import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, ToggleLeft, ToggleRight, ArrowLeft, Inbox } from 'lucide-react';

interface LeavePeriodItem {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  holidayListId: number | null;
}

interface HolidayItem {
  id: number;
  name: string;
  date: string;
}

interface HolidayList {
  id: number;
  name: string;
  fromDate: string;
  toDate: string;
  holidays: HolidayItem[];
}

export default function LeavePeriodDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const period = useMemo(() => {
    try {
      const stored = localStorage.getItem('leavePeriods');
      const periods: LeavePeriodItem[] = stored ? JSON.parse(stored) : [];
      return periods.find((p) => p.id === Number(id)) || null;
    } catch {
      return null;
    }
  }, [id]);

  const holidayList = useMemo(() => {
    if (!period?.holidayListId) return null;
    try {
      const stored = localStorage.getItem('holidayLists');
      const lists: HolidayList[] = stored ? JSON.parse(stored) : [];
      return lists.find((h) => h.id === period.holidayListId) || null;
    } catch {
      return null;
    }
  }, [period]);

  if (!period) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Leave period not found</h3>
          <p className="text-xs text-zinc-400 mb-4">The leave period doesn't exist.</p>
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
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{period.label}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Leave period details</p>
          </div>
          {period.isActive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600">
              <ToggleRight size={12} /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500">
              <ToggleLeft size={12} /> Inactive
            </span>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Start Date', value: period.startDate },
          { label: 'End Date', value: period.endDate },
          { label: 'Duration', value: `${(() => {
            const s = new Date(period.startDate);
            const e = new Date(period.endDate);
            const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return `${days} days`;
          })()}` },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-zinc-900 leading-none">{stat.value}</p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {holidayList ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-zinc-900 text-sm">{holidayList.name}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {holidayList.fromDate} → {holidayList.toDate}
                <span className="mx-1.5">·</span>
                {holidayList.holidays?.length ?? 0} holidays
              </p>
            </div>
          </div>

          {holidayList.holidays && holidayList.holidays.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Holiday Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {holidayList.holidays
                      .slice()
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((h, i) => (
                        <motion.tr
                          key={h.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-zinc-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-zinc-500">{h.date}</td>
                          <td className="px-4 py-3 text-xs font-bold text-zinc-900">{h.name}</td>
                        </motion.tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-zinc-100">
                {holidayList.holidays
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((h) => (
                    <div key={h.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{h.name}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{h.date}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mb-2">
                <Inbox size={20} className="text-zinc-300" />
              </div>
              <p className="text-xs text-zinc-400">No holidays added yet</p>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm p-6 text-center"
        >
          <p className="text-xs text-zinc-400">No holiday list linked to this period</p>
        </motion.div>
      )}
    </div>
  );
}
