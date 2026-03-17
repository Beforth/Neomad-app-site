import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Search, Eye, XCircle, ChevronLeft, ChevronRight,
    Plus, ClipboardCheck, Building, Hash, Banknote,
    UserPlus, Package, Filter, LayoutGrid, Clock, List, FileText,
    MapPin, Download, Pencil, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as api from '../lib/api';

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    assigned: 'bg-blue-100 text-blue-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
};

/** Assignee display name (API users: full_name/email; fallback username). */
function assigneeName(assignees: any[], assignedToId: number | undefined): string {
    const a = assignees.find(x => x.id === assignedToId);
    return (a?.full_name ?? a?.email ?? a?.name ?? a?.username ?? '') || 'Unassigned';
}

/** First letter for avatar (safe). */
function assigneeInitial(assignees: any[], assignedToId: number | undefined): string {
    const name = assigneeName(assignees, assignedToId);
    return name !== 'Unassigned' ? (name[0]?.toUpperCase() ?? '?') : '?';
}

export default function Tasks() {
    const { user, token } = useAuth();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [selectedTask, setSelectedTask] = useState<any>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createData, setCreateData] = useState({
        task_name: '',
        assigned_to: '',
        description: ''
    });
    const [creating, setCreating] = useState(false);
    const [availableAssignees, setAvailableAssignees] = useState<any[]>([]);
    const [updatingAssignee, setUpdatingAssignee] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<any>(null);
    const [editData, setEditData] = useState({ title: '', description: '', status: 'pending', assigned_to: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    const [taskToDelete, setTaskToDelete] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!token) return;
        api.getUsers(token, { role_code: 'delivery' })
            .then(users => setAvailableAssignees(users))
            .catch(() => { /* assignees optional */ });
    }, [token]);

    const fetchTasks = () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        api.getTasks(token, { page_size: 100 })
            .then(res => {
                setError(null);
                setTasks(res.items);
            })
            .catch(e => setError(api.normalizeFetchError(e, 'Failed to load tasks')))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTasks(); }, [token]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setCreating(true);
        setError(null);
        try {
            await api.createTask(token, {
                title: createData.task_name.trim() || 'New Task',
                description: createData.description.trim() || undefined,
                assigned_to: createData.assigned_to ? Number(createData.assigned_to) : undefined,
            });
            setShowCreateModal(false);
            setCreateData({ task_name: '', assigned_to: '', description: '' });
            fetchTasks();
        } catch (e) {
            setError(api.normalizeFetchError(e, 'Failed to create task'));
        } finally {
            setCreating(false);
        }
    };

    const openEditModal = (task: any) => {
        setTaskToEdit(task);
        setEditData({
            title: task.title || '',
            description: task.description || '',
            status: task.status || 'pending',
            assigned_to: task.assigned_to != null ? String(task.assigned_to) : '',
        });
        setShowEditModal(true);
    };

    const handleEditTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !taskToEdit) return;
        setSavingEdit(true);
        setError(null);
        try {
            const updated = await api.updateTask(token, taskToEdit.id, {
                title: editData.title.trim() || taskToEdit.title,
                description: editData.description.trim() || undefined,
                status: editData.status,
                assigned_to: editData.assigned_to === '' ? null : Number(editData.assigned_to),
            });
            setTasks(prev => prev.map(t => t.id === taskToEdit.id ? { ...t, ...updated } : t));
            if (selectedTask?.id === taskToEdit.id) setSelectedTask(prev => prev ? { ...prev, ...updated } : null);
            setShowEditModal(false);
            setTaskToEdit(null);
        } catch (e) {
            setError(api.normalizeFetchError(e, 'Failed to update task'));
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteTask = async () => {
        if (!token || !taskToDelete) return;
        setDeleting(true);
        setError(null);
        try {
            await api.deleteTask(token, taskToDelete.id);
            setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
            if (selectedTask?.id === taskToDelete.id) setSelectedTask(null);
            setShowEditModal(false);
            setTaskToEdit(null);
            setTaskToDelete(null);
        } catch (e) {
            setError(api.normalizeFetchError(e, 'Failed to delete task'));
        } finally {
            setDeleting(false);
        }
    };

    const handleAssigneeChange = async (taskId: number, assignedTo: string) => {
        if (!token) return;
        setUpdatingAssignee(true);
        setError(null);
        try {
            const value = assignedTo === '' ? null : Number(assignedTo);
            const updated = await api.updateTask(token, taskId, { assigned_to: value });
            setSelectedTask(prev => prev && prev.id === taskId ? { ...prev, assigned_to: updated.assigned_to, assignee_name: updated.assignee_name } : prev);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: updated.assigned_to, assignee_name: updated.assignee_name } : t));
        } catch (e) {
            setError(api.normalizeFetchError(e, 'Failed to update assignee'));
        } finally {
            setUpdatingAssignee(false);
        }
    };

    const filtered = tasks.filter(task => {
        const matchSearch = search === '' ||
            task.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || task.status === statusFilter;
        return matchSearch && matchStatus;
    });

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Tasks</h1>
                    <p className="text-xs text-zinc-500 font-medium">Create and manage generic tasks</p>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="flex bg-zinc-100 p-1 rounded-xl">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-400 hover:text-zinc-600'}`}>
                            <LayoutGrid size={16} />
                        </button>
                        <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-400 hover:text-zinc-600'}`}>
                            <List size={16} />
                        </button>
                    </div>
                    <button onClick={() => setShowCreateModal(true)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-100">
                        <Plus size={16} /> New Task
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">Dismiss</button>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                    <input type="text" placeholder="Search tasks by name..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer">
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                {(search || statusFilter !== 'all') && (
                    <button onClick={() => { setSearch(''); setStatusFilter('all'); }}
                        className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1">
                        <XCircle size={12} />Clear
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
                        <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                            className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors uppercase text-lg">{task.title}</h3>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{task.task_number}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize ${STATUS_COLORS[task.status]}`}>
                                    {task.status}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-500">Assigned To</span>
                                    <span className="font-medium text-zinc-700">
                                        {assigneeName(availableAssignees, task.assigned_to) === 'Unassigned' ? <span className="text-zinc-300 italic">Unassigned</span> : assigneeName(availableAssignees, task.assigned_to)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-50">
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                        <Clock size={12} />
                                        <span>{new Date(task.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setSelectedTask(task)} className="text-emerald-500 font-bold hover:underline">View</button>
                                        <button onClick={() => openEditModal(task)} className="text-amber-600 font-bold hover:underline">Edit</button>
                                        <button onClick={() => setTaskToDelete(task)} className="text-red-500 font-bold hover:underline">Delete</button>
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
                                {['ID', 'Task Name', 'Status', 'Assigned To', 'Created Date', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {filtered.map((task, i) => (
                                <motion.tr key={task.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }}
                                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => setSelectedTask(task)}>
                                    <td className="px-4 py-3 text-xs font-bold text-zinc-400">{task.task_number}</td>
                                    <td className="px-4 py-3">
                                        <p className="text-xs font-bold text-zinc-900">{task.title}</p>
                                        {task.description && <p className="text-[10px] text-zinc-400 line-clamp-1">{task.description}</p>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${STATUS_COLORS[task.status]}`}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-zinc-600">
                                        {assigneeName(availableAssignees, task.assigned_to) === 'Unassigned' ? <span className="text-zinc-300 italic">Unassigned</span> : assigneeName(availableAssignees, task.assigned_to)}
                                    </td>
                                    <td className="px-4 py-3 text-[10px] text-zinc-400">{new Date(task.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }} className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="View"> <Eye size={14} /> </button>
                                            <button onClick={(e) => { e.stopPropagation(); openEditModal(task); }} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit"> <Pencil size={14} /> </button>
                                            <button onClick={(e) => { e.stopPropagation(); setTaskToDelete(task); }} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete"> <Trash2 size={14} /> </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Task Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-100 flex flex-col">
                            <div className="p-6 border-b border-zinc-50 bg-zinc-50/50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-zinc-900">Create New Task</h3>
                                    <p className="text-xs text-zinc-500 font-medium">Add a new generic task for delivery</p>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors text-zinc-400">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTask} className="p-6 space-y-5">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Package size={12} /> Task Name
                                        </label>
                                        <input required type="text" placeholder="e.g. Get Coffee or Visit Client" value={createData.task_name}
                                            onChange={e => setCreateData({ ...createData, task_name: e.target.value })}
                                            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText size={12} /> Task Description
                                        </label>
                                        <textarea rows={3} placeholder="Provide details about the task..." value={createData.description}
                                            onChange={e => setCreateData({ ...createData, description: e.target.value })}
                                            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium resize-none" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <UserPlus size={12} /> Assign To (Optional)
                                        </label>
                                        <select value={createData.assigned_to}
                                            onChange={e => setCreateData({ ...createData, assigned_to: e.target.value })}
                                            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer">
                                            <option value="">Keep Pending (Unassigned)</option>
                                            {availableAssignees.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name ?? u.email} ({u.role_codes?.[0] ?? 'delivery'})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-3 border border-zinc-200 rounded-xl font-bold text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={creating}
                                        className="flex-2 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {creating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : 'Create Task'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Task Details Modal */}
            <AnimatePresence>
                {selectedTask && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-100 flex flex-col max-h-[85vh]">
                            
                            {/* Simple Clean Header */}
                            <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                                        <ClipboardCheck size={20} className="text-zinc-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-zinc-900 leading-tight">{selectedTask.title}</h3>
                                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{selectedTask.task_number}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEditModal(selectedTask)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-500 hover:text-emerald-600" title="Edit task">
                                        <Pencil size={18} />
                                    </button>
                                    <button onClick={() => setTaskToDelete(selectedTask)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-500 hover:text-red-600" title="Delete task">
                                        <Trash2 size={18} />
                                    </button>
                                    <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-zinc-50 rounded-xl transition-colors text-zinc-400">
                                        <XCircle size={22} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Core Info */}
                                    <div className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <List size={12} /> Task Description
                                            </label>
                                            <div className="text-sm text-zinc-600 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100/50 leading-relaxed font-medium min-h-[100px]">
                                                {selectedTask.description || 'No additional details project for this task.'}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <MapPin size={12} /> Delivery Destination
                                            </label>
                                            <div className="flex items-start gap-3 p-3.5 bg-zinc-50/50 rounded-2xl border border-zinc-100/50">
                                                <Building size={16} className="text-zinc-400 mt-0.5" />
                                                <span className="text-sm font-semibold text-zinc-700">Nashik Partner Hub — MH</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Logistics & Assignment */}
                                    <div className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live Status</label>
                                            <div className={`w-fit flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs capitalize ${STATUS_COLORS[selectedTask.status]} border border-current/10`}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                {selectedTask.status}
                                            </div>
                                        </div>

                                        <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="p-4 border-b border-zinc-50 bg-zinc-50/30">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-3">Assigned to</p>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 border border-zinc-200 shrink-0">
                                                        {assigneeInitial(availableAssignees, selectedTask.assigned_to)}
                                                    </div>
                                                    <div className="flex-1 min-w-[180px]">
                                                        <select
                                                            value={selectedTask.assigned_to ?? ''}
                                                            onChange={e => handleAssigneeChange(selectedTask.id, e.target.value)}
                                                            disabled={updatingAssignee}
                                                            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
                                                        >
                                                            <option value="">Unassigned</option>
                                                            {availableAssignees.map(u => (
                                                                <option key={u.id} value={u.id}>{u.full_name ?? u.email}</option>
                                                            ))}
                                                        </select>
                                                        {updatingAssignee && <p className="text-[10px] text-zinc-400 mt-1">Updating…</p>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1.5"><Clock size={12} /> Created</span>
                                                    <span className="text-xs font-bold text-zinc-700">{new Date(selectedTask.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1.5"><Hash size={12} /> Reference</span>
                                                    <span className="text-xs font-bold text-zinc-700">{selectedTask.task_number}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 bg-zinc-50/50 border-t border-zinc-100 flex gap-3 shrink-0">
                                <button onClick={() => setSelectedTask(null)}
                                    className="flex-1 px-5 py-2.5 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors">
                                    Dismiss
                                </button>
                                <button onClick={() => selectedTask && openEditModal(selectedTask)}
                                    className="flex-1 px-5 py-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2">
                                    <Pencil size={16} /> Edit
                                </button>
                                <button onClick={() => selectedTask && setTaskToDelete(selectedTask)}
                                    className="flex-1 px-5 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Task Modal */}
            <AnimatePresence>
                {showEditModal && taskToEdit && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-zinc-100 overflow-hidden">
                            <div className="p-5 border-b border-zinc-100">
                                <h3 className="text-lg font-bold text-zinc-900">Edit Task</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">{taskToEdit.task_number}</p>
                            </div>
                            <form onSubmit={handleEditTask} className="p-5 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Title</label>
                                    <input type="text" value={editData.title} onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        placeholder="Task title" required />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Description</label>
                                    <textarea value={editData.description} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                                        rows={3} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                                        placeholder="Optional description" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Status</label>
                                    <select value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}
                                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer">
                                        <option value="pending">Pending</option>
                                        <option value="assigned">Assigned</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Assigned to</label>
                                    <select value={editData.assigned_to} onChange={e => setEditData(d => ({ ...d, assigned_to: e.target.value }))}
                                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer">
                                        <option value="">Unassigned</option>
                                        {availableAssignees.map(u => (
                                            <option key={u.id} value={u.id}>{u.full_name ?? u.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => { setShowEditModal(false); setTaskToEdit(null); }}
                                        className="flex-1 py-2.5 border border-zinc-200 rounded-xl font-bold text-sm text-zinc-600 hover:bg-zinc-50">Cancel</button>
                                    <button type="submit" disabled={savingEdit}
                                        className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {savingEdit ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null} Save
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete confirmation */}
            <AnimatePresence>
                {taskToDelete && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-zinc-100">
                            <p className="font-bold text-zinc-900">Delete this task?</p>
                            <p className="text-sm text-zinc-500 mt-1">{taskToDelete.title} ({taskToDelete.task_number})</p>
                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setTaskToDelete(null)}
                                    className="flex-1 py-2.5 border border-zinc-200 rounded-xl font-bold text-sm text-zinc-600 hover:bg-zinc-50">Cancel</button>
                                <button onClick={() => handleDeleteTask()}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {deleting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={16} />} Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
