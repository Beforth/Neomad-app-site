import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { APP_NOTIFICATIONS_UPDATED_EVENT, appApi } from '../lib/appApi';
import { isWebPushConfigured } from '../lib/webPush';

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Professional chime

export function useNotifications() {
    const { user } = useAuth();
    const useFirebase = isWebPushConfigured();
    const lastNotifId = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Permission request
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Prepare audio
        audioRef.current = new Audio(NOTIFICATION_SOUND);
    }, []);

    useEffect(() => {
        if (!user || useFirebase) return;

        const checkNewNotifications = () => {
            const all = appApi.getNotifications();
            const mine = all.filter((n: any) =>
                (n.targets.includes('all') || n.targets.includes(user.role)) &&
                !(n.readBy || []).includes(user.id)
            );

            if (mine.length > 0) {
                const newest = mine[0];
                if (lastNotifId.current === null) {
                    // Initialize on mount without alerting for old unread ones
                    lastNotifId.current = newest.id;
                    return;
                }

                if (newest.id > lastNotifId.current) {
                    lastNotifId.current = newest.id;

                    // Play Sound
                    audioRef.current?.play().catch(() => { });

                    // Show System Notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(newest.title, {
                            body: newest.message,
                            icon: '/favicon.ico',
                        });
                    }
                }
            }
        };

        const interval = setInterval(checkNewNotifications, 5000);
        const onUpdated = () => checkNewNotifications();
        window.addEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
        return () => {
            clearInterval(interval);
            window.removeEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
        };
    }, [user, useFirebase]);
}
