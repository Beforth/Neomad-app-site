import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Users, UserCheck, UserX, CalendarOff, ChevronRight, Filter } from 'lucide-react';

const DEPARTMENTS = ['All Departments', 'Delivery', 'Operations', 'Warehouse', 'Office Admin'];

const MOCK_STAFF = [
  { id: 1, name: 'Ravi Kumar', email: 'ravi@neomed.com', phone: '+91 98765 43210', department: 'Delivery', role: 'Staff', status: 'active', joined: 'Jan 15, 2024' },
  { id: 2, name: 'Priya Sharma', email: 'priya@neomed.com', phone: '+91 98765 43211', department: 'Operations', role: 'Lead', status: 'active', joined: 'Mar 8, 2023' },
  { id: 3, name: 'Amit Tandon', email: 'amit@neomed.com', phone: '+91 98765 43212', department: 'Warehouse', role: 'Staff', status: 'on_leave', joined: 'Jun 20, 2024' },
  { id: 4, name: 'Sneha Patil', email: 'sneha@neomed.com', phone: '+91 98765 43213', department: 'Office Admin', role: 'Staff', status: 'active', joined: 'Sep 1, 2023' },
  { id: 5, name: 'Vikram Joshi', email: 'vikram@neomed.com', phone: '+91 98765 43214', department: 'Delivery', role: 'Staff', status: 'active', joined: 'Feb 10, 2024' },
  { id: 6, name: 'Meena Devi', email: 'meena@neomed.com', phone: '+91 98765 43215', department: 'Warehouse', role: 'Staff', status: 'inactive', joined: 'Apr 5, 2023' },
  { id: 7, name: 'Arjun Nair', email: 'arjun@neomed.com', phone: '+91 98765 43216', department: 'Operations', role: 'Staff', status: 'active', joined: 'Nov 12, 2023' },
  { id: 8, name: 'Kavita Reddy', email: 'kavita@neomed.com', phone: '+91 98765 43217', department: 'Delivery', role: 'Staff', status: 'active', joined: 'Jul 22, 2024' },
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  inactive: 'bg-zinc-50 text-zinc-500 border-zinc-100',
  on_leave: 'bg-amber-50 text-amber-700 border-amber-100',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
};

export default function Staff() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [showFilter, setShowFilter] = useState(false);

  const filtered = MOCK_STAFF.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = department === 'All Departments' || s.department === department;
    return matchSearch && matchDept;
  });

  const total = MOCK_STAFF.length;
  const active = MOCK_STAFF.filter((s) => s.status === 'active').length;
  const inactive = MOCK_STAFF.filter((s) => s.status === 'inactive').length;
  const onLeave = MOCK_STAFF.filter((s) => s.status === 'on_leave').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Staff</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your team members</p>
        </div>
        <Link to="/hrms/staff/new"
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={16} />Add Staff
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: active, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Inactive', value: inactive, icon: UserX, color: 'bg-zinc-100 text-zinc-500' },
          { label: 'On Leave', value: onLeave, icon: CalendarOff, color: 'bg-amber-50 text-amber-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-lg font-extrabold text-zinc-900 leading-none">{stat.value}</p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-zinc-300" />
        </div>
        <div className="relative">
          <button onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${department !== 'All Departments' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
            <Filter size={14} />
            <span className="hidden sm:inline">{department === 'All Departments' ? 'Department' : department}</span>
          </button>
          {showFilter && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 z-20">
              {DEPARTMENTS.map((d) => (
                <button key={d} onClick={() => { setDepartment(d); setShowFilter(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${department === d ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Department</th>
                <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Role</th>
                <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Joined</th>
                <th className="w-10 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((staff) => (
                <tr key={staff.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {staff.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{staff.name}</p>
                        <p className="text-xs text-zinc-400">{staff.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-600">{staff.department}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-600">{staff.role}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${STATUS_STYLES[staff.status]}`}>
                      {STATUS_LABELS[staff.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{staff.joined}</td>
                  <td className="px-5 py-3.5">
                    <Link to={`/hrms/staff/${staff.id}`} className="p-1.5 text-zinc-300 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-zinc-400">No staff members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-zinc-50">
          {filtered.map((staff) => (
            <Link key={staff.id} to={`/hrms/staff/${staff.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {staff.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{staff.name}</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${STATUS_STYLES[staff.status]}`}>
                    {STATUS_LABELS[staff.status]}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{staff.department} • {staff.role}</p>
              </div>
              <ChevronRight size={16} className="text-zinc-300 shrink-0" />
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-zinc-400">No staff members found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
