import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_NOTIFICATIONS_UPDATED_EVENT, appApi } from '../lib/appApi';
import { isWebPushConfigured } from '../lib/webPush';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);

  const load = () => {
    if (!user) return;
    const all = appApi.getNotifications();
    const mine = all.filter((n: any) =>
      n.targets.includes('all') || n.targets.includes(user.role || '')
    );
    setNotifications(mine);
  };

  useEffect(() => {
    const onUpdated = () => load();
    window.addEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    if (isWebPushConfigured()) {
      load();
      return () => {
        window.removeEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
      };
    }
    load();
    const t = setInterval(load, 5000);
    return () => {
      clearInterval(t);
      window.removeEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    };
  }, [user?.id, user?.role]);

  const unread = notifications.filter(n => !(n.readBy || []).includes(user?.id)).length;

  return (
    <div className="relative">
      <button
        onClick={() => navigate('/notifications')}
        className="relative p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-all"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
