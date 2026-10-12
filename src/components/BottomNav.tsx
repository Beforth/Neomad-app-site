import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, UserCircle, FileText, Users, Settings as SettingsIcon, CalendarCheck, Wallet, Banknote, CalendarOff, CalendarClock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isNavItemActive } from '../lib/navActive';
import { BottomNav as UiBottomNav } from '@/components/ui/bottom-nav';

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    if (!user) return null;

    const isEmployee = user.role === 'staff' || user.role === 'delivery_boy';

    const tabs = isEmployee
        ? [
            { label: 'Dashboard', icon: LayoutDashboard, path: '/hrms/dashboard', roles: ['staff', 'delivery_boy'] },
            { label: 'Attendance', icon: CalendarCheck, path: '/hrms/attendance', roles: ['staff', 'delivery_boy'] },
            { label: 'Expenses', icon: Wallet, path: '/hrms/expenses', roles: ['staff', 'delivery_boy'] },
            { label: 'Leave', icon: CalendarOff, path: '/hrms/leave', roles: ['staff', 'delivery_boy'] },
            { label: 'Shifts', icon: CalendarClock, path: '/hrms/my-shifts', roles: ['staff', 'delivery_boy'] },
            { label: 'Payroll', icon: Banknote, path: '/hrms/payroll', roles: ['staff', 'delivery_boy'] },
        ]
        : [
            { label: 'Home', icon: LayoutDashboard, path: '/', roles: ['admin', 'manager', 'delivery_boy', 'staff'] },
            { label: 'Tasks', icon: Package, path: '/tasks', roles: ['admin', 'manager'] },
            { label: 'Invoices', icon: FileText, path: '/invoices', roles: ['admin', 'manager', 'delivery_boy', 'staff'] },
            { label: 'Users', icon: Users, path: '/users', roles: ['admin'] },
            { label: 'Settings', icon: SettingsIcon, path: '/settings', roles: ['admin'] },
            { label: 'Profile', icon: UserCircle, path: '/profile', roles: ['admin', 'manager', 'delivery_boy', 'staff'] },
        ];

    const filteredTabs = tabs.filter(tab => tab.roles.includes(user.role));

    const active = filteredTabs.find((tab) => isNavItemActive(tab.path, location.pathname));

    return (
        <UiBottomNav
            className="fixed inset-x-0 bottom-0 z-40"
            value={active?.path ?? ''}
            onValueChange={(path) => navigate(path)}
            items={filteredTabs.map((tab) => ({ id: tab.path, label: tab.label, icon: <tab.icon /> }))}
        />
    );
}
