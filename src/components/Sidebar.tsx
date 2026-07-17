import {
  LayoutDashboard, FileText, MapPin, BarChart3, Users,
  UserCircle, LogOut, Menu, X, Bell, Package, History, Settings as SettingsIcon,
  ChevronDown, Truck, CalendarCheck, Clock, Receipt, Trophy, Check,
  Wallet, Banknote, CalendarOff, CalendarClock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NOTIFICATIONS_UPDATED_EVENT, appApi } from '../lib/appApi';
import { isNavItemActive } from '../lib/navActive';

const DELIVERY_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['admin', 'manager'] },
  { icon: Package, label: 'Tasks', path: '/tasks', roles: ['admin', 'manager'] },
  { icon: FileText, label: 'Invoices', path: '/invoices', roles: ['admin', 'manager'] },
  { icon: MapPin, label: 'Live Tracking', path: '/tracking', roles: ['admin', 'manager'] },
  { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['admin', 'manager'] },
  { icon: History, label: 'Audit Logs', path: '/logs', roles: ['admin', 'manager'] },
  { icon: Users, label: 'User Management', path: '/users', roles: ['admin'] },
  { icon: Bell, label: 'Notifications', path: '/notifications', roles: ['admin'] },
  { icon: SettingsIcon, label: 'Settings', path: '/settings', roles: ['admin'] },
  { icon: UserCircle, label: 'Profile', path: '/profile', roles: ['admin', 'manager'] },
];

const HRMS_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/hrms/dashboard', roles: ['admin', 'manager'] },
  { icon: CalendarCheck, label: 'Attendance', path: '/hrms/attendance', roles: ['admin', 'manager'] },
  { icon: Users, label: 'Staff', path: '/hrms/staff', roles: ['admin', 'manager'] },
  { icon: Wallet, label: 'Expenses', path: '/hrms/expenses', roles: ['admin', 'manager'] },
  { icon: Trophy, label: 'Incentives', path: '/hrms/incentives', roles: ['admin', 'manager'] },
  { icon: Banknote, label: 'Payroll', path: '/hrms/payroll', roles: ['admin', 'manager'] },
  { icon: CalendarOff, label: 'Leave', path: '/hrms/leave', roles: ['admin', 'manager'] },
  { icon: CalendarClock, label: 'Shifts', path: '/hrms/shifts', roles: ['admin', 'manager'] },
  { icon: UserCircle, label: 'Profile', path: '/profile', roles: ['admin', 'manager'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { activeApp, setActiveApp } = useApp();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [unread, setUnread] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const canSwitch = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    const refresh = () => {
      const all = appApi.getNotifications();
      const mine = all.filter((n: any) =>
        n.targets.includes('all') ||
        n.targets.includes(user?.role || '')
      );
      const count = mine.filter((n: any) => !(n.readBy || []).includes(user?.id)).length;
      setUnread(count);
    };
    const onUpdated = () => refresh();
    window.addEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    refresh();
    const t = setInterval(refresh, 5000);
    return () => {
      clearInterval(t);
      window.removeEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = activeApp === 'hrms' ? HRMS_ITEMS : DELIVERY_ITEMS;
  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  const handleAppSwitch = (app: 'delivery' | 'hrms') => {
    setActiveApp(app);
    setSwitcherOpen(false);
    if (app === 'hrms') {
      navigate('/hrms/attendance');
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl border border-zinc-200 shadow-sm">
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <motion.aside initial={false} animate={{ width: isOpen ? 240 : 0 }}
        className="fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-zinc-200 text-zinc-600 overflow-hidden flex flex-col shadow-sm lg:shadow-none lg:h-screen">
        {/* Header with App Switcher */}
        <div className="p-5 mb-2">
          <div className="flex items-center gap-2.5">
            <img src="/app_icon.png" alt="Neomed" className="w-8 h-8 rounded-lg shadow-sm" />
            <div className="flex-1 min-w-0">
              <span className="text-zinc-900 font-bold text-base block leading-none">Neomed</span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">Management</span>
            </div>
            {canSwitch && (
              <div className="relative" ref={switcherRef}>
                <button
                  onClick={() => setSwitcherOpen(!switcherOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    switcherOpen
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
                  }`}
                >
                  {activeApp === 'delivery' ? (
                    <Truck size={16} />
                  ) : (
                    <CalendarCheck size={16} />
                  )}
                  <ChevronDown size={12} className={`transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {switcherOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl shadow-zinc-200/50 py-1.5 z-50"
                    >
                      <button
                        onClick={() => handleAppSwitch('delivery')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                          activeApp === 'delivery'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <Truck size={16} />
                        <span className="text-sm font-medium flex-1">Delivery App</span>
                        {activeApp === 'delivery' && <Check size={14} className="text-emerald-500" />}
                      </button>
                      <button
                        onClick={() => handleAppSwitch('hrms')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                          activeApp === 'hrms'
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <CalendarCheck size={16} />
                        <span className="text-sm font-medium flex-1">HRMS</span>
                        {activeApp === 'hrms' && <Check size={14} className="text-blue-500" />}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {filteredItems.map(item => {
            const active = isNavItemActive(item.path, location.pathname);
            return (
              <Link key={item.path} to={item.path} onClick={() => { window.innerWidth < 1024 && setIsOpen(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap group ${active
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}>
                <div className="relative">
                  {item.icon && <item.icon size={18} className={active ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-900'} />}
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
            );
          })}
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
