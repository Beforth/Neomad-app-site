import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockApi } from '../lib/mockApi';

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Professional chime

export function useNotifications() {
    const { user } = useAuth();
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
        if (!user) return;

        const checkNewNotifications = () => {
            const all = mockApi.getNotifications();
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
                            icon: '/logo192.png', // Assuming we'll add this for PWA
                        });
                    }
                }
            }
        };

        const interval = setInterval(checkNewNotifications, 5000);
        return () => clearInterval(interval);
    }, [user]);
}
