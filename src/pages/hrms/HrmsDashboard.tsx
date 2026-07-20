import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, UserCheck, UserX, Receipt, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUsers } from '../../lib/api';

export default function HrmsDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      if (token) {
        const data = await getUsers(token);
        setStats({
          total: data.length,
          active: data.filter((u: any) => u.is_active).length,
          inactive: data.filter((u: any) => !u.is_active).length,
        });
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">HRMS Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Overview of your workforce</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Total Staff', value: stats.total, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: stats.active, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Inactive', value: stats.inactive, icon: UserX, color: 'bg-zinc-100 text-zinc-500' },
          { label: 'Pending Expenses', value: '—', icon: Receipt, color: 'bg-rose-50 text-rose-600' },
          { label: 'Departments', value: '—', icon: LayoutDashboard, color: 'bg-purple-50 text-purple-600' },
          { label: 'This Month', value: '—', icon: TrendingUp, color: 'bg-cyan-50 text-cyan-600' },
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

      <div className="bg-white border border-zinc-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4">
          <LayoutDashboard size={28} className="text-zinc-300" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 mb-1">Coming Soon</h2>
        <p className="text-sm text-zinc-400 max-w-xs">
          Detailed analytics, attendance trends, and workforce insights will appear here.
        </p>
      </div>
    </div>
  );
}
