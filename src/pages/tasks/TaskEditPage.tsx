import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../lib/api';
import { TaskSectionFrame, taskInnerCardClassName } from '../../components/tasks/TaskSectionFrame';
import { parseTaskRouteId, type AssigneeLike } from './taskShared';
import { useTaskLoader } from './useTaskLoader';

export default function TaskEditPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { taskId: taskIdParam } = useParams<{ taskId: string }>();
  const taskId = parseTaskRouteId(taskIdParam);
  const { task, loading, error, reload } = useTaskLoader(token, taskId);

  const [assignees, setAssignees] = useState<AssigneeLike[]>([]);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    status: 'pending',
    assigned_to: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getUsers(token, { role_code: 'delivery' })
      .then((users) => setAssignees(users))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!task) return;
    setEditData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'pending',
      assigned_to: task.assigned_to != null ? String(task.assigned_to) : '',
    });
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || task == null || taskId == null) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.updateTask(token, task.id, {
        title: editData.title.trim() || task.title,
        description: editData.description.trim() || undefined,
        status: editData.status,
        assigned_to: editData.assigned_to === '' ? null : Number(editData.assigned_to),
      });
      await reload();
      navigate(`/tasks/${task.id}`, { replace: true });
    } catch (err) {
      setSaveError(api.normalizeFetchError(err, 'Failed to update task'));
    } finally {
      setSaving(false);
    }
  };

  if (taskId == null) {
    return (
      <TaskSectionFrame context="Invalid task.">
        <div className={`p-8 ${taskInnerCardClassName()}`}>
          <Link to="/tasks" className="text-sm font-bold text-emerald-600 hover:underline">
            Back to tasks
          </Link>
        </div>
      </TaskSectionFrame>
    );
  }

  if (loading) {
    return (
      <TaskSectionFrame context="Loading task…">
        <div className={`p-12 text-center text-zinc-400 text-sm animate-pulse ${taskInnerCardClassName()}`}>Loading…</div>
      </TaskSectionFrame>
    );
  }

  if (error || !task) {
    return (
      <TaskSectionFrame context={error || 'Task not found.'}>
        <div className={`p-8 ${taskInnerCardClassName()}`}>
          <p className="text-sm text-red-700">{error || 'Not found'}</p>
          <Link to="/tasks" className="mt-4 inline-block text-sm font-bold text-emerald-600 hover:underline">
            Back to tasks
          </Link>
        </div>
      </TaskSectionFrame>
    );
  }

  return (
    <TaskSectionFrame context={`${task.task_number} · ${task.title}`}>
      <div className={taskInnerCardClassName()}>
        <div className="p-5 border-b border-zinc-100">
          <h3 className="text-lg font-bold text-zinc-900">Edit Task</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{task.task_number}</p>
        </div>

        {saveError ? (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">{saveError}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Title</label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="Task title"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Description</label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Status</label>
            <select
              value={editData.status}
              onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Assigned to</label>
            <select
              value={editData.assigned_to}
              onChange={(e) => setEditData((d) => ({ ...d, assigned_to: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="">Unassigned</option>
              {assignees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.email}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="flex-1 min-w-[120px] py-2.5 border border-zinc-200 rounded-xl font-bold text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-w-[120px] py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              Save
            </button>
          </div>
        </form>
      </div>
    </TaskSectionFrame>
  );
}
