import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardCheck,
  Building,
  Hash,
  List,
  MapPin,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../lib/api';
import { TaskSectionFrame, taskInnerCardClassName } from '../../components/tasks/TaskSectionFrame';
import {
  TASK_STATUS_COLORS,
  displayAssigneeName,
  parseTaskRouteId,
  type AssigneeLike,
} from './taskShared';
import { useTaskLoader } from './useTaskLoader';
import SearchableSelect from '../../components/SearchableSelect';

export default function TaskDetailPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { taskId: taskIdParam } = useParams<{ taskId: string }>();
  const taskId = parseTaskRouteId(taskIdParam);
  const { task, loading, error, reload } = useTaskLoader(token, taskId);

  const [assignees, setAssignees] = useState<AssigneeLike[]>([]);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getUsers(token, { role_code: 'delivery' })
      .then((users) => setAssignees(users))
      .catch(() => {});
  }, [token]);

  const handleAssigneeChange = async (assignedTo: string) => {
    if (!token || task == null) return;
    setUpdatingAssignee(true);
    setLocalError(null);
    try {
      const value = assignedTo === '' ? null : Number(assignedTo);
      await api.updateTask(token, task.id, { assigned_to: value });
      await reload();
    } catch (e) {
      setLocalError(api.normalizeFetchError(e, 'Failed to update assignee'));
    } finally {
      setUpdatingAssignee(false);
    }
  };

  if (taskId == null) {
    return (
      <TaskSectionFrame context="Invalid task link.">
        <div className={`p-8 ${taskInnerCardClassName()}`}>
          <p className="text-sm text-zinc-600">This task URL is not valid.</p>
          <Link to="/tasks" className="mt-4 inline-block text-sm font-bold text-emerald-600 hover:underline">
            Back to tasks
          </Link>
        </div>
      </TaskSectionFrame>
    );
  }

  if (loading) {
    return (
      <TaskSectionFrame context="Loading task details…">
        <div className={`p-12 text-center text-zinc-400 text-sm animate-pulse ${taskInnerCardClassName()}`}>
          Loading…
        </div>
      </TaskSectionFrame>
    );
  }

  if (error || !task) {
    return (
      <TaskSectionFrame context={error || 'Task not found.'}>
        <div className={`p-8 ${taskInnerCardClassName()}`}>
          <p className="text-sm text-red-700">{error || 'Task not found.'}</p>
          <Link to="/tasks" className="mt-4 inline-block text-sm font-bold text-emerald-600 hover:underline">
            Back to tasks
          </Link>
        </div>
      </TaskSectionFrame>
    );
  }

  const err = localError;

  return (
    <TaskSectionFrame
      context={
        <>
          <span className="text-zinc-500 font-medium">{task.task_number}</span>
          <span className="mx-2 text-zinc-300">·</span>
          <span>{task.title}</span>
        </>
      }
      right={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(`/tasks/${task.id}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50"
          >
            <Pencil size={16} /> Edit
          </button>
          <button
            type="button"
            onClick={() => navigate(`/tasks/${task.id}/delete`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      }
    >
      {err ? (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm mb-4">{err}</div>
      ) : null}

      <div className={taskInnerCardClassName()}>
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100 shrink-0">
              <ClipboardCheck size={20} className="text-zinc-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-zinc-900 leading-tight truncate">{task.title}</h3>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{task.task_number}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <List size={12} /> Task Description
                </label>
                <div className="text-sm text-zinc-600 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100/50 leading-relaxed font-medium min-h-[100px]">
                  {task.description || 'No additional details project for this task.'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin size={12} /> Delivery Destination
                </label>
                <div className="flex items-start gap-3 p-3.5 bg-zinc-50/50 rounded-2xl border border-zinc-100/50">
                  <Building size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                  <span className="text-sm font-semibold text-zinc-700">Nashik Partner Hub — MH</span>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live Status</label>
                <div
                  className={`w-fit flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs capitalize ${TASK_STATUS_COLORS[task.status] ?? 'bg-zinc-100 text-zinc-700'} border border-current/10`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  {task.status}
                </div>
              </div>

              <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-zinc-50 bg-zinc-50/30">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-3">Assigned to</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 border border-zinc-200 shrink-0">
                      {(() => {
                        const n = displayAssigneeName(task, assignees);
                        return n === 'Unassigned' ? '?' : (n[0]?.toUpperCase() ?? '?');
                      })()}
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <SearchableSelect
                        value={task.assigned_to != null ? String(task.assigned_to) : ''}
                        onChange={(v) => void handleAssigneeChange(v)}
                        disabled={updatingAssignee}
                        className="w-full"
                        options={[
                          { value: '', label: 'Unassigned' },
                          ...assignees.map((u) => ({ value: String(u.id), label: u.full_name ?? u.email })),
                        ]}
                      />
                      {updatingAssignee ? <p className="text-[10px] text-zinc-400 mt-1">Updating…</p> : null}
                      <p className="text-[11px] text-zinc-500 mt-1 font-medium">{displayAssigneeName(task, assignees)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1.5">
                      <Clock size={12} /> Created
                    </span>
                    <span className="text-xs font-bold text-zinc-700">{new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1.5">
                      <Hash size={12} /> Reference
                    </span>
                    <span className="text-xs font-bold text-zinc-700">{task.task_number}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TaskSectionFrame>
  );
}
