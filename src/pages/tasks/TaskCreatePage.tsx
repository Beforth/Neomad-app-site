import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Package, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../lib/api';
import { TaskSectionFrame, taskInnerCardClassName } from '../../components/tasks/TaskSectionFrame';
import type { AssigneeLike } from './taskShared';

export default function TaskCreatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [createData, setCreateData] = useState({
    task_name: '',
    assigned_to: '',
    description: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<AssigneeLike[]>([]);

  useEffect(() => {
    if (!token) return;
    api
      .getUsers(token, { role_code: 'delivery' })
      .then((users) => setAssignees(users))
      .catch(() => {});
  }, [token]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.createTask(token, {
        title: createData.task_name.trim() || 'New Task',
        description: createData.description.trim() || undefined,
        assigned_to: createData.assigned_to ? Number(createData.assigned_to) : undefined,
      });
      navigate(`/tasks/${created.id}`, { replace: true });
    } catch (err) {
      setError(api.normalizeFetchError(err, 'Failed to create task'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <TaskSectionFrame context="Add a new generic task for delivery.">
      <div className={taskInnerCardClassName()}>
        <div className="p-6 border-b border-zinc-50 bg-zinc-50/50">
          <h3 className="text-xl font-bold text-zinc-900">Create New Task</h3>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Fill in the details below</p>
        </div>

        {error ? (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">{error}</div>
        ) : null}

        <form onSubmit={handleCreateTask} className="p-6 space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={12} /> Task Name
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Get Coffee or Visit Client"
                value={createData.task_name}
                onChange={(e) => setCreateData({ ...createData, task_name: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={12} /> Task Description
              </label>
              <textarea
                rows={3}
                placeholder="Provide details about the task..."
                value={createData.description}
                onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus size={12} /> Assign To (Optional)
              </label>
              <select
                value={createData.assigned_to}
                onChange={(e) => setCreateData({ ...createData, assigned_to: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
              >
                <option value="">Keep Pending (Unassigned)</option>
                {assignees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ?? u.email} ({(u as { role_codes?: string[] }).role_codes?.[0] ?? 'delivery'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="flex-1 min-w-[120px] py-3 border border-zinc-200 rounded-xl font-bold text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-[2] min-w-[160px] py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </TaskSectionFrame>
  );
}
