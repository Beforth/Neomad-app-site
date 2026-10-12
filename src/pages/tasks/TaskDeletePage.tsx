import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../lib/api';
import { TaskSectionFrame, taskInnerCardClassName } from '../../components/tasks/TaskSectionFrame';
import { parseTaskRouteId } from './taskShared';
import { useTaskLoader } from './useTaskLoader';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

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
          <Link to="/tasks" className="text-sm font-semibold text-primary hover:underline">
            Back to tasks
          </Link>
        </div>
      </TaskSectionFrame>
    );
  }

  if (loading) {
    return (
      <TaskSectionFrame context="Loading…">
        <div className={`p-12 text-center text-muted-foreground/70 text-sm animate-pulse ${taskInnerCardClassName()}`}>Loading…</div>
      </TaskSectionFrame>
    );
  }

  if (error || !task) {
    return (
      <TaskSectionFrame context={error || 'Task not found.'}>
        <div className={`p-8 ${taskInnerCardClassName()}`}>
          <p className="text-sm text-destructive">{error || 'Not found'}</p>
          <Link to="/tasks" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
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
          <span className="text-foreground">{task.title}</span> ({task.task_number}).
        </>
      }
    >
      <div className={`p-6 max-w-md ${taskInnerCardClassName()}`}>
        <p className="font-semibold text-foreground">Delete this task?</p>
        <p className="text-sm text-muted-foreground mt-1">
          {task.title} ({task.task_number})
        </p>

        {deleteError ? (
          <div className="mt-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">{deleteError}</div>
        ) : null}

        <div className="flex flex-wrap gap-3 mt-5">
          <Button variant="outline" className="flex-1 min-w-[120px]"
            type="button"
            onClick={() => navigate(`/tasks/${task.id}`)}
            
          >
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1 min-w-[120px]"
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            
          >
            {deleting ? (
              <Spinner className="size-4"  />
            ) : (
              <Trash2 size={16} />
            )}
            Delete
          </Button>
        </div>
      </div>
    </TaskSectionFrame>
  );
}