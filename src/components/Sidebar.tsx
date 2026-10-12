import {
  LayoutDashboard, FileText, MapPin, BarChart3, Users,
  UserCircle, Bell, Package, History, Settings as SettingsIcon,
  ChevronsUpDown, Truck, CalendarCheck, Wallet, Banknote, CalendarOff, CalendarClock,
  Building2, Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_NOTIFICATIONS_UPDATED_EVENT, appApi } from '../lib/appApi';
import { isNavItemActive } from '../lib/navActive';
import { Sidebar as UiSidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarItem } from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export interface NavChildItem {
  label: string;
  path: string;
}

export interface NavItem {
  icon?: typeof LayoutDashboard;
  label: string;
  path?: string;
  roles: string[];
  children?: NavChildItem[];
}

export const DELIVERY_ITEMS: NavItem[] = [
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

export const HRMS_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/hrms/dashboard', roles: ['admin', 'manager', 'staff', 'delivery_boy'] },
  { icon: CalendarCheck, label: 'Attendance', path: '/hrms/attendance', roles: ['admin', 'manager', 'staff', 'delivery_boy'] },
  { icon: Users, label: 'Staff', path: '/hrms/staff', roles: ['admin', 'manager'] },
  { icon: Building2, label: 'Departments', path: '/hrms/departments', roles: ['admin', 'manager'] },
  { icon: Wallet, label: 'Expenses', roles: ['admin', 'manager', 'staff', 'delivery_boy'], children: [
    { label: 'Business Claims', path: '/hrms/expenses' },
    { label: 'Salary Advances', path: '/hrms/expenses?tab=advances' },
  ]},
  { icon: Banknote, label: 'Payroll', path: '/hrms/payroll', roles: ['staff', 'delivery_boy'] },
  { icon: Banknote, label: 'Payroll', roles: ['admin', 'manager'], children: [
    { label: 'Pay Cycles', path: '/hrms/payroll' },
    { label: 'Structures', path: '/hrms/payroll/structures' },
    { label: 'Settings', path: '/hrms/payroll/settings' },
  ]},
  { icon: CalendarOff, label: 'Leave', roles: ['admin', 'manager'], children: [
    // { label: 'Apply', path: '/hrms/leave/apply' },
    { label: 'Requests', path: '/hrms/leave/requests' },
    { label: 'Type', path: '/hrms/leave/type' },
    { label: 'Policy', path: '/hrms/leave/policy' },
    { label: 'Period', path: '/hrms/leave/period' },
    { label: 'Holiday List', path: '/hrms/leave/holiday-list' },
  ]},
  { icon: CalendarOff, label: 'Leave', path: '/hrms/leave', roles: ['staff', 'delivery_boy'] },
  { icon: CalendarClock, label: 'My Shifts', path: '/hrms/my-shifts', roles: ['staff', 'delivery_boy'] },
  { icon: CalendarClock, label: 'Shifts', path: '/hrms/shifts', roles: ['admin', 'manager'] },
  { icon: UserCircle, label: 'Profile', path: '/profile', roles: ['admin', 'manager'] },
];

const GROUP_BY_LABEL: Record<string, string> = {
  Dashboard: 'Overview', Attendance: 'Overview',
  Tasks: 'Operations', Invoices: 'Operations', 'Live Tracking': 'Operations',
  Reports: 'Insights', 'Audit Logs': 'Insights',
  'User Management': 'Admin', Notifications: 'Admin', Settings: 'Admin',
  Staff: 'People', Departments: 'People', Leave: 'People', Shifts: 'People', 'My Shifts': 'People',
  Expenses: 'Finance', Payroll: 'Finance',
};
const GROUP_ORDER = ['Overview', 'Operations', 'Insights', 'People', 'Finance', 'Admin'];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { activeApp, setActiveApp } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const canSwitch = user?.role === 'admin' || user?.role === 'manager';
  const isEmployee = user?.role === 'staff' || user?.role === 'delivery_boy';

  // Employees are always in the HRMS app
  useEffect(() => {
    if (isEmployee && activeApp !== 'hrms') setActiveApp('hrms');
  }, [isEmployee, activeApp, setActiveApp]);

  useEffect(() => {
    const refresh = () => {
      const all = appApi.getNotifications();
      const mine = all.filter((n: any) => n.targets.includes('all') || n.targets.includes(user?.role || ''));
      setUnread(mine.filter((n: any) => !(n.readBy || []).includes(user?.id)).length);
    };
    window.addEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    refresh();
    return () => {
      window.removeEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [user?.id, user?.role]);

  const menuItems = (isEmployee || activeApp === 'hrms') ? HRMS_ITEMS : DELIVERY_ITEMS;
  const filteredItems = menuItems.filter((item) => item.roles.includes(user?.role || ''));

  const handleAppSwitch = (app: 'delivery' | 'hrms') => {
    setActiveApp(app);
    navigate(app === 'hrms' ? '/hrms/attendance' : '/');
  };

  return (
    <UiSidebar className="print:hidden">
      <SidebarHeader>
        <img src="/app_icon.png" alt="Neomed" className="size-7 shrink-0 rounded-md" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold group-data-[collapsed=true]:hidden">Neomed</span>
        {canSwitch && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Switch app"
                className="grid group-data-[collapsed=true]:hidden size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <ChevronsUpDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onSelect={() => handleAppSwitch('delivery')}>
                <Truck /> Delivery App {activeApp === 'delivery' && <Check className="ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleAppSwitch('hrms')}>
                <CalendarCheck /> HRMS {activeApp === 'hrms' && <Check className="ml-auto text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        {GROUP_ORDER.map((group) => {
          const items = filteredItems.filter((i) => i.label !== 'Profile' && (GROUP_BY_LABEL[i.label] ?? 'Overview') === group);
          if (!items.length) return null;
          return (
            <SidebarGroup key={group} label={group}>
              {items.map((item) => {
                const IconCmp = item.icon;
                const icon = IconCmp ? <IconCmp /> : undefined;
                if (item.children?.length) {
                  return (
                    <SidebarItem
                      key={item.label + (item.children[0]?.path ?? '')}
                      icon={icon}
                      label={item.label}
                      items={item.children.map((c) => ({
                        label: c.label,
                        active: location.pathname === c.path.split('?')[0] && (!c.path.includes('?') || location.search === c.path.slice(c.path.indexOf('?'))),
                        onClick: () => navigate(c.path),
                      }))}
                    />
                  );
                }
                return (
                  <SidebarItem
                    key={item.path}
                    icon={icon}
                    label={item.label}
                    active={isNavItemActive(item.path || '', location.pathname)}
                    badge={item.path === '/notifications' && unread > 0 ? unread : undefined}
                    onClick={() => navigate(item.path!)}
                  />
                );
              })}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarItem
          icon={<UserCircle />}
          label="Profile"
          active={location.pathname === '/profile'}
          onClick={() => navigate('/profile')}
        />
      </SidebarFooter>
    </UiSidebar>
  );
}
