import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../lib/api';
import { TaskSectionFrame, taskInnerCardClassName } from '../../components/tasks/TaskSectionFrame';
import { parseTaskRouteId, type AssigneeLike } from './taskShared';
import { useTaskLoader } from './useTaskLoader';
import SearchableSelect from '../../components/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input, Textarea } from '@/components/ui/input';

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
          <Link to="/tasks" className="text-sm font-semibold text-primary hover:underline">
            Back to tasks
          </Link>
        </div>
      </TaskSectionFrame>
    );
  }

  if (loading) {
    return (
      <TaskSectionFrame context="Loading task…">
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
    <TaskSectionFrame context={`${task.task_number} · ${task.title}`}>
      <div className={taskInnerCardClassName()}>
        <div className="p-5 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Edit Task</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{task.task_number}</p>
        </div>

        {saveError ? (
          <div className="mx-5 mt-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">{saveError}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground/70 block mb-1.5">Title</label>
            <Input className="w-full"
              type="text"
              value={editData.title}
              onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))}
              
              placeholder="Task title"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground/70 block mb-1.5">Description</label>
            <Textarea className="w-full"
              value={editData.description}
              onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
              rows={3}
              
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground/70 block mb-1.5">Status</label>
            <SearchableSelect
              value={editData.status}
              onChange={(v) => setEditData((d) => ({ ...d, status: v }))}
              className="w-full"
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground/70 block mb-1.5">Assigned to</label>
            <SearchableSelect
              value={editData.assigned_to}
              onChange={(v) => setEditData((d) => ({ ...d, assigned_to: v }))}
              className="w-full"
              options={[
                { value: '', label: 'Unassigned' },
                ...assignees.map((u) => ({ value: String(u.id), label: u.full_name ?? u.email })),
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" className="flex-1 min-w-[120px]"
              type="button"
              onClick={() => navigate(`/tasks/${task.id}`)}
              
            >
              Cancel
            </Button>
            <Button className="flex-1 min-w-[120px]"
              type="submit"
              disabled={saving}
              
            >
              {saving ? (
                <Spinner className="size-4"  />
              ) : null}
              Save
            </Button>
          </div>
        </form>
      </div>
    </TaskSectionFrame>
  );
}
