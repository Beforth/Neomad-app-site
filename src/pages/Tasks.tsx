import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Search, Eye, XCircle, ChevronLeft, ChevronRight,
    Plus, ClipboardCheck, Building, Hash, Banknote,
    UserPlus, Package, Filter, LayoutGrid, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mockApi } from '../lib/mockApi';

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    assigned: 'bg-blue-100 text-blue-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
};

export default function Tasks() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Create task state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createData, setCreateData] = useState({
        task_name: '',
        assigned_to: ''
    });
    const [creating, setCreating] = useState(false);
    const [availableAssignees, setAvailableAssignees] = useState<any[]>([]);

    useEffect(() => {
        mockApi.getUsers().then(users => {
            const filtered = users.filter((u: any) => u.role === 'delivery_boy' || u.role === 'manager');
            setAvailableAssignees(filtered);
        });
    }, []);

    const fetchTasks = () => {
        setLoading(true);
        mockApi.getInvoices(user).then(data => {
            // For the Tasks page, we treat all invoices as tasks
            // We filter to only show items that look like tasks (started with TASK-)
            const taskOnly = data.filter((inv: any) => inv.invoice_number.startsWith('TASK-'));
            setTasks(taskOnly);
            setLoading(false);
        });
    };

    useEffect(() => { fetchTasks(); }, [user]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await mockApi.createTask({
                task_name: createData.task_name,
                assigned_to: createData.assigned_to ? Number(createData.assigned_to) : undefined,
            });
            setShowCreateModal(false);
            setCreateData({ task_name: '', assigned_to: '' });
            fetchTasks();
        } finally {
            setCreating(false);
        }
    };

    const filtered = tasks.filter(task => {
        const matchSearch = search === '' ||
            task.hospital_name.toLowerCase().includes(search.toLowerCase());
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
                    <button onClick={() => setShowCreateModal(true)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-100">
                        <Plus size={16} /> New Task
                    </button>
                </div>
            </header>

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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-zinc-400 text-sm">Loading tasks...</div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-12 text-center">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
                            <Package size={32} />
                        </div>
                        <p className="text-zinc-500 font-medium">No tasks found</p>
                        <p className="text-xs text-zinc-400 mt-1">Try creating a new task</p>
                    </div>
                ) : filtered.map((task, i) => (
                    <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors uppercase text-lg">{task.hospital_name}</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{task.invoice_number}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize ${STATUS_COLORS[task.status]}`}>
                                {task.status}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-500">Assigned To</span>
                                <span className="font-medium text-zinc-700">
                                    {availableAssignees.find(a => a.id === task.assigned_to)?.name || <span className="text-zinc-300 italic">Unassigned</span>}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-50">
                                <div className="flex items-center gap-1.5 text-zinc-400">
                                    <Clock size={12} />
                                    <span>{new Date(task.created_at).toLocaleDateString()}</span>
                                </div>
                                <button className="text-emerald-500 font-bold hover:underline">View Details</button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

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
                                            <UserPlus size={12} /> Assign To (Optional)
                                        </label>
                                        <select value={createData.assigned_to}
                                            onChange={e => setCreateData({ ...createData, assigned_to: e.target.value })}
                                            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer">
                                            <option value="">Keep Pending (Unassigned)</option>
                                            {availableAssignees.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
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
                                        className="flex-3 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {creating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : 'Create & Assign'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
