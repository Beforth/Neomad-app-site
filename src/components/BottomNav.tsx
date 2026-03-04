import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, UserCircle, Bell, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    if (!user) return null;

    const tabs = [
        { label: 'Home', icon: LayoutDashboard, path: '/', roles: ['admin', 'manager', 'delivery_boy', 'staff'] },
        { label: 'Tasks', icon: Package, path: '/tasks', roles: ['admin', 'manager'] },
        { label: 'Notifs', icon: Bell, path: '/notifications', roles: ['admin', 'manager', 'delivery_boy', 'staff'] },
        { label: 'Users', icon: Users, path: '/users', roles: ['admin'] },
        { label: 'Profile', icon: UserCircle, path: '/profile', roles: ['admin', 'manager', 'delivery_boy', 'staff'] },
    ];

    const filteredTabs = tabs.filter(tab => tab.roles.includes(user.role));

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-zinc-100 flex items-center justify-around px-2 pb-safe-bottom h-16 z-50">
            {filteredTabs.map(tab => {
                const isActive = location.pathname === tab.path;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.path}
                        onClick={() => navigate(tab.path)}
                        className={`flex flex-col items-center justify-center flex-1 gap-1 transition-all ${isActive ? 'text-emerald-500 font-bold' : 'text-zinc-400 font-medium'
                            }`}
                    >
                        <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-emerald-50' : ''}`}>
                            <Icon size={20} className={isActive ? 'animate-in zoom-in-50 duration-300' : ''} />
                        </div>
                        <span className="text-[10px] tracking-tight">{tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
