import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  XCircle,
  Plus,
  Package,
  LayoutGrid,
  Clock,
  List,
  Pencil,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import * as api from '../lib/api';
import { TASKS_PAGE_SUBTITLE, TASKS_PAGE_TITLE } from '../components/tasks/TaskSectionFrame';
import { TASK_STATUS_COLORS, assigneeName, type AssigneeLike } from './tasks/taskShared';

export default function Tasks() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<api.ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [availableAssignees, setAvailableAssignees] = useState<AssigneeLike[]>([]);

  useEffect(() => {
    if (!token) return;
    api
      .getUsers(token, { role_code: 'delivery' })
      .then((users) => setAvailableAssignees(users))
      .catch(() => {});
  }, [token]);

  const fetchTasks = () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    api
      .getTasks(token, { page_size: 100 })
      .then((res) => {
        setError(null);
        setTasks(res.items);
      })
      .catch((e) => setError(api.normalizeFetchError(e, 'Failed to load tasks')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const filtered = tasks.filter((task) => {
    const matchSearch = search === '' || task.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{TASKS_PAGE_TITLE}</h1>
          <p className="text-xs text-zinc-500 font-medium">{TASKS_PAGE_SUBTITLE}</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              <List size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/tasks/new')}
            className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-100"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input
            type="text"
            placeholder="Search tasks by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(search || statusFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
            }}
            className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1"
          >
            <XCircle size={12} />
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-zinc-400 text-sm animate-pulse flex flex-col items-center gap-2">
          <Clock className="animate-spin text-zinc-200" size={24} />
          Loading tasks...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
            <Package size={32} />
          </div>
          <p className="text-zinc-500 font-medium">No tasks found</p>
          <p className="text-xs text-zinc-400 mt-1">Try creating a new task</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <button
                  type="button"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="text-left"
                >
                  <h3 className="font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors uppercase text-lg">{task.title}</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{task.task_number}</p>
                </button>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize ${TASK_STATUS_COLORS[task.status] ?? 'bg-zinc-100 text-zinc-700'}`}>
                  {task.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Assigned To</span>
                  <span className="font-medium text-zinc-700">
                    {assigneeName(availableAssignees, task.assigned_to ?? undefined) === 'Unassigned' ? (
                      <span className="text-zinc-300 italic">Unassigned</span>
                    ) : (
                      assigneeName(availableAssignees, task.assigned_to ?? undefined)
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-50">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Clock size={12} />
                    <span>{new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => navigate(`/tasks/${task.id}`)} className="text-emerald-500 font-bold hover:underline">
                      View
                    </button>
                    <button type="button" onClick={() => navigate(`/tasks/${task.id}/edit`)} className="text-amber-600 font-bold hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => navigate(`/tasks/${task.id}/delete`)} className="text-red-500 font-bold hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                {['ID', 'Task Name', 'Status', 'Assigned To', 'Created Date', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((task, i) => (
                <motion.tr
                  key={task.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <td className="px-4 py-3 text-xs font-bold text-zinc-400">{task.task_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-zinc-900">{task.title}</p>
                    {task.description ? <p className="text-[10px] text-zinc-400 line-clamp-1">{task.description}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${TASK_STATUS_COLORS[task.status] ?? 'bg-zinc-100 text-zinc-700'}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {assigneeName(availableAssignees, task.assigned_to ?? undefined) === 'Unassigned' ? (
                      <span className="text-zinc-300 italic">Unassigned</span>
                    ) : (
                      assigneeName(availableAssignees, task.assigned_to ?? undefined)
                    )}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-zinc-400">{new Date(task.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${task.id}/edit`);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${task.id}/delete`);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
