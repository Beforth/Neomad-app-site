import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  FileText,
  UserPlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as api from '../lib/api';
import { TASKS_PAGE_SUBTITLE, TASKS_PAGE_TITLE } from '../components/tasks/TaskSectionFrame';
import { TASK_STATUS_COLORS, assigneeName, type AssigneeLike } from './tasks/taskShared';
import { formatDateTimeIST } from '../lib/timeUtils';
import SearchableSelect from '../components/SearchableSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { Segmented } from '@/components/ui/segmented';

export default function Tasks() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState<api.ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [availableAssignees, setAvailableAssignees] = useState<AssigneeLike[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({ task_name: '', assigned_to: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const s = location.state as { openTaskCreate?: boolean } | undefined;
    if (!s?.openTaskCreate) return;
    setShowCreateModal(true);
    setCreateError(null);
    navigate('/tasks', { replace: true, state: {} });
  }, [location.state, navigate]);

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

  const closeCreateModal = () => {
    if (creating) return;
    setShowCreateModal(false);
    setCreateError(null);
    setCreateData({ task_name: '', assigned_to: '', description: '' });
  };

  useEffect(() => {
    if (!showCreateModal || creating) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setShowCreateModal(false);
      setCreateError(null);
      setCreateData({ task_name: '', assigned_to: '', description: '' });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showCreateModal, creating]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api.createTask(token, {
        title: createData.task_name.trim() || 'New Task',
        description: createData.description.trim() || undefined,
        assigned_to: createData.assigned_to ? Number(createData.assigned_to) : undefined,
      });
      setShowCreateModal(false);
      setCreateData({ task_name: '', assigned_to: '', description: '' });
      fetchTasks();
    } catch (err) {
      setCreateError(api.normalizeFetchError(err, 'Failed to create task'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={TASKS_PAGE_TITLE} description={TASKS_PAGE_SUBTITLE} actions={<>
<div className="flex items-center gap-3 self-start sm:self-auto">
          <Segmented
            value={viewMode}
            onValueChange={(v) => setViewMode(v as typeof viewMode)}
            options={[
              { value: 'grid', label: <LayoutGrid /> },
              { value: 'table', label: <List /> },
            ]}
          />
          <Button size="sm"
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
            
          >
            <Plus size={16} /> New Task
          </Button>
        </div>
</>} />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-destructive hover:text-destructive font-semibold">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
          <Input data-search="" className="w-full pl-9 pr-4"
            type="text"
            placeholder="Search tasks by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            
          />
        </div>
        <SearchableSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'assigned', label: 'Assigned' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          className="min-w-[150px]"
        />
        {(search || statusFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
            }}
            className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1"
          >
            <XCircle size={12} />
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground/70 text-sm animate-pulse flex flex-col items-center gap-2">
          <Clock className="animate-spin text-border" size={24} />
          Loading tasks...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/50">
            <Package size={32} />
          </div>
          <p className="text-muted-foreground font-medium">No tasks found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Try creating a new task</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-card p-5 rounded-xl border border-border shadow-[0_1px_2px_rgb(0_0_0/0.03)] hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <button
                  type="button"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="text-left"
                >
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors uppercase text-lg">{task.title}</h3>
                  <p className="text-xs font-medium text-muted-foreground/70 mt-0.5">{task.task_number}</p>
                </button>
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize ${TASK_STATUS_COLORS[task.status] ?? 'bg-secondary text-foreground/85'}`}>
                  {task.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Assigned To</span>
                  <span className="font-medium text-foreground/85">
                    {assigneeName(availableAssignees, task.assigned_to ?? undefined) === 'Unassigned' ? (
                      <span className="text-muted-foreground/50 italic">Unassigned</span>
                    ) : (
                      assigneeName(availableAssignees, task.assigned_to ?? undefined)
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-muted-foreground/70">
                    <Clock size={12} />
                    <span>{formatDateTimeIST(task.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => navigate(`/tasks/${task.id}`)} className="text-primary font-semibold hover:underline">
                      View
                    </button>
                    <button type="button" onClick={() => navigate(`/tasks/${task.id}/edit`)} className="text-warning font-semibold hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => navigate(`/tasks/${task.id}/delete`)} className="text-destructive font-semibold hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden overflow-x-auto" >
          <Table>
            <TableHeader>
              <TableRow>
                {['ID', 'Task Name', 'Status', 'Assigned To', 'Created Date', 'Actions'].map((h) => (
                  <TableHead key={h} className="uppercase whitespace-nowrap">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((task, i) => (
                <motion.tr
                  key={task.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className="border-b transition-colors hover:bg-muted/70 cursor-pointer"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <TableCell className="font-semibold text-muted-foreground/70">{task.task_number}</TableCell>
                  <TableCell>
                    <p className="text-xs font-semibold text-foreground">{task.title}</p>
                    {task.description ? <p className="text-[11px] text-muted-foreground/70 line-clamp-1">{task.description}</p> : null}
                  </TableCell>
                  <TableCell>
                    <Badge className={`capitalize ${TASK_STATUS_COLORS[task.status] ?? 'bg-secondary text-foreground/85'}`}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground/70">
                    {assigneeName(availableAssignees, task.assigned_to ?? undefined) === 'Unassigned' ? (
                      <span className="text-muted-foreground/50 italic">Unassigned</span>
                    ) : (
                      assigneeName(availableAssignees, task.assigned_to ?? undefined)
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground/70">{formatDateTimeIST(task.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" className="hover:text-warning hover:bg-warning/10"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${task.id}/edit`);
                        }}
                        
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${task.id}/delete`);
                        }}
                        
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AnimatePresence>
        {showCreateModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-create-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-border bg-muted/50 flex items-center justify-between shrink-0">
                <div>
                  <h2 id="task-create-title" className="text-xl font-semibold text-foreground">
                    Create New Task
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Add a new generic task for delivery</p>
                </div>
                <Button variant="ghost" size="icon-sm"
                  type="button"
                  onClick={() => closeCreateModal()}
                  disabled={creating}
                  
                  aria-label="Cancel"
                >
                  <XCircle size={24} />
                </Button>
              </div>

              {createError ? (
                <div className="mx-6 mt-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">{createError}</div>
              ) : null}

              <form onSubmit={handleCreateTask} className="p-6 space-y-5 overflow-y-auto">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                      <Package size={12} /> Task Name
                    </label>
                    <Input className="w-full"
                      required
                      type="text"
                      placeholder="e.g. Get Coffee or Visit Client"
                      value={createData.task_name}
                      onChange={(e) => setCreateData({ ...createData, task_name: e.target.value })}
                      
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                      <FileText size={12} /> Task Description
                    </label>
                    <Textarea className="w-full"
                      rows={3}
                      placeholder="Provide details about the task..."
                      value={createData.description}
                      onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                      
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                      <UserPlus size={12} /> Assign To (Optional)
                    </label>
                    <SearchableSelect
                      value={createData.assigned_to}
                      onChange={(v) => setCreateData({ ...createData, assigned_to: v })}
                      className="w-full"
                      options={[
                        { value: '', label: 'Keep Pending (Unassigned)' },
                        ...availableAssignees.map((u) => ({
                          value: String(u.id),
                          label: u.full_name ?? u.email ?? u.name ?? String(u.id),
                        })),
                      ]}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" size="lg" className="flex-1"
                    type="button"
                    onClick={() => closeCreateModal()}
                    disabled={creating}
                    
                  >
                    Cancel
                  </Button>
                  <Button size="lg"
                    type="submit"
                    disabled={creating}
                    
                  >
                    {creating ? (
                      <>
                        <Spinner className="size-4"  />
                        Creating…
                      </>
                    ) : (
                      'Create Task'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
