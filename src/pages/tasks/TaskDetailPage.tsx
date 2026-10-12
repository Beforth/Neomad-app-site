import { useEffect, useRef, useState } from 'react';
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
  CheckCircle2,
  Upload,
  Camera,
  Loader2,
  FileImage,
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
import { Card } from '@/components/ui/card';

export default function TaskDetailPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { taskId: taskIdParam } = useParams<{ taskId: string }>();
  const taskId = parseTaskRouteId(taskIdParam);
  const { task, loading, error, reload } = useTaskLoader(token, taskId);

  const [assignees, setAssignees] = useState<AssigneeLike[]>([]);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // ── Complete / Photo ──
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completeSuccess, setCompleteSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

  const handleMarkComplete = async () => {
    if (!token || !task) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      await api.updateTask(token, task.id, { status: 'completed' });
      setCompleteSuccess(true);
      await reload();
    } catch (e) {
      setCompleteError(api.normalizeFetchError(e, 'Failed to mark complete'));
    } finally {
      setCompleting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !task) return;
    setUploading(true);
    setCompleteError(null);
    try {
      await api.uploadTaskPhoto(token, task.id, file);
      await reload();
    } catch (e) {
      setCompleteError(api.normalizeFetchError(e, 'Failed to upload photo'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const isAssignee = task?.assigned_to != null && task.assigned_to === user?.id;
  const canComplete = task && (isAdminOrManager || isAssignee) && task.status !== 'completed' && task.status !== 'cancelled';

  if (taskId == null) {
    return (
      <TaskSectionFrame context="Invalid task link.">
        <div className={`p-8 ${taskInnerCardClassName()}`}>
          <p className="text-sm text-foreground/70">This task URL is not valid.</p>
          <Link to="/tasks" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            Back to tasks
          </Link>
        </div>
      </TaskSectionFrame>
    );
  }

  if (loading) {
    return (
      <TaskSectionFrame context="Loading task details…">
        <div className={`p-12 text-center text-muted-foreground/70 text-sm animate-pulse ${taskInnerCardClassName()}`}>
          Loading…
        </div>
      </TaskSectionFrame>
    );
  }

  if (error || !task) {
    return (
      <TaskSectionFrame context={error || 'Task not found.'}>
        <div className={`p-8 ${taskInnerCardClassName()}`}>
          <p className="text-sm text-destructive">{error || 'Task not found.'}</p>
          <Link to="/tasks" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            Back to tasks
          </Link>
        </div>
      </TaskSectionFrame>
    );
  }

  const err = localError || completeError;

  return (
    <TaskSectionFrame
      context={
        <>
          <span className="text-muted-foreground font-medium">{task.task_number}</span>
          <span className="mx-2 text-muted-foreground/50">·</span>
          <span>{task.title}</span>
        </>
      }
      right={
        <div className="flex flex-wrap gap-2">
          {canComplete && !completeSuccess ? (
            <button
              type="button"
              onClick={handleMarkComplete}
              disabled={completing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 shadow-sm shadow-primary/20"
            >
              <CheckCircle2 size={16} /> {completing ? 'Completing…' : 'Mark Complete'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(`/tasks/${task.id}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Pencil size={16} /> Edit
          </button>
          <button
            type="button"
            onClick={() => navigate(`/tasks/${task.id}/delete`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-destructive/20 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/15"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      }
    >
      {err ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm mb-4">{err}</div>
      ) : null}
      {completeSuccess ? (
        <div className="bg-accent border border-primary/20 text-accent-foreground px-4 py-3 rounded-md text-sm mb-4 flex items-center gap-2">
          <CheckCircle2 size={16} /> Task marked as completed.
        </div>
      ) : null}

      <div className={taskInnerCardClassName()}>
        <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center border border-border shrink-0">
              <ClipboardCheck size={20} className="text-muted-foreground/70" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-foreground leading-tight truncate">{task.title}</h3>
              <p className="text-xs font-medium text-muted-foreground/70">{task.task_number}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                  <List size={12} /> Task Description
                </label>
                <div className="text-sm text-foreground/70 bg-muted/50 p-4 rounded-xl border border-border leading-relaxed font-medium min-h-[100px]">
                  {task.description || 'No additional details for this task.'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                  <MapPin size={12} /> Delivery Destination
                </label>
                <div className="flex items-start gap-3 p-3.5 bg-muted/50 rounded-xl border border-border">
                  <Building size={16} className="text-muted-foreground/70 mt-0.5 shrink-0" />
                  <span className="text-sm font-semibold text-foreground/85">Nashik Partner Hub — MH</span>
                </div>
              </div>

              {/* ── Completion photo ── */}
              {canComplete || task.status === 'completed' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                    <Camera size={12} /> Completion Photo
                  </label>
                  {task.photo_url ? (
                    <div className="rounded-xl overflow-hidden border border-border bg-secondary max-h-48">
                      <img
                        src={task.photo_url}
                        alt="Task completion photo"
                        className="w-full h-full max-h-48 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="bg-muted/50 p-4 rounded-xl border border-border border-dashed">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full flex flex-col items-center gap-2 text-muted-foreground/70 hover:text-foreground/70 transition-colors disabled:opacity-50"
                      >
                        {uploading ? (
                          <Loader2 size={24} className="animate-spin" />
                        ) : (
                          <Upload size={24} />
                        )}
                        <span className="text-xs font-semibold">{uploading ? 'Uploading…' : 'Upload photo'}</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-[13px] file:font-medium hover:file:bg-accent"
                        onChange={handlePhotoUpload}
                      />
                    </div>
                  )}
                  {task.completed_at && (
                    <p className="text-[11px] text-primary font-medium">
                      Completed: {new Date(task.completed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground/70">Live Status</label>
                <div
                  className={`w-fit flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold text-xs capitalize ${TASK_STATUS_COLORS[task.status] ?? 'bg-secondary text-foreground/85'} border border-current/10`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  {task.status}
                </div>
              </div>

              <Card className="overflow-hidden" >
                <div className="p-4 border-b border-border bg-muted/30">
                  <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase mb-3">Assigned to</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground border border-border shrink-0">
                      {(() => {
                        const n = displayAssigneeName(task, assignees);
                        return n === 'Unassigned' ? '?' : (n[0]?.toUpperCase() ?? '?');
                      })()}
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <SearchableSelect
                        value={task.assigned_to != null ? String(task.assigned_to) : ''}
                        onChange={(v) => void handleAssigneeChange(v)}
                        disabled={updatingAssignee || task.status === 'completed'}
                        className="w-full"
                        options={[
                          { value: '', label: 'Unassigned' },
                          ...assignees.map((u) => ({ value: String(u.id), label: u.full_name ?? u.email })),
                        ]}
                      />
                      {updatingAssignee ? <p className="text-[11px] text-muted-foreground/70 mt-1">Updating…</p> : null}
                      <p className="text-[11px] text-muted-foreground mt-1 font-medium">{displayAssigneeName(task, assignees)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground/70 font-semibold flex items-center gap-1.5">
                      <Clock size={12} /> Created
                    </span>
                    <span className="text-xs font-semibold text-foreground/85">{new Date(task.created_at).toLocaleString()}</span>
                  </div>
                  {task.completed_at ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-primary font-semibold flex items-center gap-1.5">
                        <CheckCircle2 size={12} /> Completed
                      </span>
                      <span className="text-xs font-semibold text-accent-foreground">{new Date(task.completed_at).toLocaleString()}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground/70 font-semibold flex items-center gap-1.5">
                      <Hash size={12} /> Reference
                    </span>
                    <span className="text-xs font-semibold text-foreground/85">{task.task_number}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TaskSectionFrame>
  );
}
