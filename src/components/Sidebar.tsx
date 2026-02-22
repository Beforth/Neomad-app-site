import { 
  LayoutDashboard, FileText, MapPin, BarChart3, Users, 
  UserCircle, LogOut, Menu, X, Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { mockApi } from '../lib/mockApi';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [unread, setUnread] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const refresh = () => {
      const all = mockApi.getNotifications();
      const mine = all.filter((n: any) =>
        n.targets.includes('all') ||
        n.targets.includes(user?.role || '')
      );
      const count = mine.filter((n: any) => !(n.readBy || []).includes(user?.id)).length;
      setUnread(count);
    };
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [user?.id, user?.role]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['admin', 'manager'] },
    { icon: FileText, label: 'Invoices', path: '/invoices', roles: ['admin', 'manager'] },
    { icon: MapPin, label: 'Live Tracking', path: '/tracking', roles: ['admin', 'manager'] },
    { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['admin', 'manager'] },
    { icon: Users, label: 'User Management', path: '/users', roles: ['admin'] },
    { icon: Bell, label: 'Notifications', path: '/notifications', roles: ['admin'] },
    { icon: UserCircle, label: 'Profile', path: '/profile', roles: ['admin', 'manager'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl border border-zinc-200 shadow-sm">
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <motion.aside initial={false} animate={{ width: isOpen ? 240 : 0 }}
        className="fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-zinc-200 text-zinc-600 overflow-hidden flex flex-col shadow-sm lg:shadow-none">
        <div className="p-5 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">M</div>
            <div>
              <span className="text-zinc-900 font-bold text-base block leading-none">BeForth</span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">Management</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {filteredItems.map(item => (
            <Link key={item.path} to={item.path} onClick={() => { window.innerWidth < 1024 && setIsOpen(false); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap group ${
                location.pathname === item.path
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              }`}>
              <div className="relative">
                <item.icon size={18} className={location.pathname === item.path ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-900'} />
                {item.path === '/notifications' && unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </div>
              <span className="font-medium text-sm tracking-tight flex-1">{item.label}</span>
              {item.path === '/notifications' && unread > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full leading-none">
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2.5 mb-4 px-1">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-zinc-600 border border-zinc-200 shadow-sm">
              {user?.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-900 truncate tracking-tight">{user?.username}</p>
              <p className="text-[10px] text-zinc-400 truncate capitalize font-medium">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all group text-sm font-medium">
            <LogOut size={18} className="group-hover:text-red-600" />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
