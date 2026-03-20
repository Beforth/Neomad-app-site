import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../lib/api';
import { TaskSectionFrame, taskInnerCardClassName } from '../../components/tasks/TaskSectionFrame';
import { parseTaskRouteId } from './taskShared';
import { useTaskLoader } from './useTaskLoader';

export default function TaskDeletePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { taskId: taskIdParam } = useParams<{ taskId: string }>();
  const taskId = parseTaskRouteId(taskIdParam);
  const { task, loading, error } = useTaskLoader(token, taskId);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!token || task == null) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteTask(token, task.id);
      navigate('/tasks', { replace: true });
    } catch (err) {
      setDeleteError(api.normalizeFetchError(err, 'Failed to delete task'));
    } finally {
      setDeleting(false);
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
      <TaskSectionFrame context="Loading…">
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
    <TaskSectionFrame
      context={
        <>
          This action cannot be undone. You are about to delete{' '}
          <span className="text-zinc-900">{task.title}</span> ({task.task_number}).
        </>
      }
    >
      <div className={`p-6 max-w-md ${taskInnerCardClassName()}`}>
        <p className="font-bold text-zinc-900">Delete this task?</p>
        <p className="text-sm text-zinc-500 mt-1">
          {task.title} ({task.task_number})
        </p>

        {deleteError ? (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">{deleteError}</div>
        ) : null}

        <div className="flex flex-wrap gap-3 mt-5">
          <button
            type="button"
            onClick={() => navigate(`/tasks/${task.id}`)}
            className="flex-1 min-w-[120px] py-2.5 border border-zinc-200 rounded-xl font-bold text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="flex-1 min-w-[120px] py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Delete
          </button>
        </div>
      </div>
    </TaskSectionFrame>
  );
}