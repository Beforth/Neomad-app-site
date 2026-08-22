import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Calendar, Plus, Search, XCircle, ToggleLeft, ToggleRight,
  Pencil, Trash2, X, CheckCircle2, Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listLeavePeriods, updateLeavePeriod, deleteLeavePeriod } from '../../lib/hrmsLeave';

interface LeavePeriodItem {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function LeavePeriod() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [periods, setPeriods] = useState<LeavePeriodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<LeavePeriodItem | null>(null);

  const reloadPeriods = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await listLeavePeriods(token);
      setPeriods(
        data.map((p) => ({
          id: p.id,
          label: p.label,
          startDate: p.start_date,
          endDate: p.end_date,
          isActive: p.is_active,
        }))
      );
    } catch (e) {
      console.error('Failed to load leave periods:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { reloadPeriods(); }, [reloadPeriods]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    const q = searchDebounced.toLowerCase().trim();
    if (!q) return periods;
    return periods.filter((p) => p.label.toLowerCase().includes(q));
  }, [periods, searchDebounced]);

  const activePeriod = periods.find((p) => p.isActive);

  async function toggleActive(id: number) {
    if (!token) return;
    try {
      await updateLeavePeriod(token, id, { is_active: true });
      await reloadPeriods();
    } catch (e) {
      console.error('Failed to toggle active period:', e);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !token) return;
    try {
      await deleteLeavePeriod(token, deleteTarget.id);
      await reloadPeriods();
    } catch (e) {
      console.error('Failed to delete leave period:', e);
    } finally {
      setDeleteTarget(null);
    }
  }

  const statCards = [
    { label: 'Total Periods', value: periods.length, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Period', value: activePeriod?.label || 'None', icon: ToggleRight, color: 'bg-emerald-50 text-emerald-600', small: true },
  ];

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Leave Period</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Manage leave cycles and financial years</p>
        </div>
        <button onClick={() => navigate('/hrms/leave/period/new')} className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
          <Plus size={14} />Add Period
        </button>
      </motion.header>

      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card, i) => (
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
              <p className={`${card.small ? 'text-sm' : 'text-lg'} font-extrabold text-zinc-900 leading-none truncate`}>
                {card.value}
              </p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">
                {card.label}
              </p>
            </div>
          </motion.div>
        ))}
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
            placeholder="Search periods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
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
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                {['Period', 'Start Date', 'End Date', 'Status', 'Actions'].map((label) => (
                  <th key={label} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => navigate(`/hrms/leave/period/${p.id}`)}
                  className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-xs font-bold text-zinc-900">{p.label}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{p.startDate}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{p.endDate}</td>
                  <td className="px-4 py-3">
                    {p.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600">
                        <ToggleRight size={12} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500">
                        <ToggleLeft size={12} /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/hrms/leave/period/edit/${p.id}`)}
                        className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      {!p.isActive && (
                        <button
                          onClick={() => toggleActive(p.id)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Set Active"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-zinc-100">
          {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/hrms/leave/period/edit/${p.id}`)}
                className="p-4 space-y-2 cursor-pointer"
              >
              <div className="flex items-start justify-between">
                <p className="text-xs font-bold text-zinc-900">{p.label}</p>
                {p.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                <span>{p.startDate}</span>
                <span>→</span>
                <span>{p.endDate}</span>
              </div>
              <div className="flex items-center gap-1 pt-1">
                <button
                  onClick={() => navigate(`/hrms/leave/period/edit/${p.id}`)}
                  className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
                {!p.isActive && (
                  <button
                    onClick={() => toggleActive(p.id)}
                    className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Set Active"
                  >
                    <CheckCircle2 size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)} role="dialog" aria-modal="true">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 relative">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="absolute top-6 right-6 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-zinc-900">Delete leave period?</h3>
              <p className="text-sm text-zinc-600 mt-2">
                <span className="font-semibold text-zinc-800">{deleteTarget.label}</span>
              </p>
              <p className="text-xs text-red-600 font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-zinc-50/80">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
