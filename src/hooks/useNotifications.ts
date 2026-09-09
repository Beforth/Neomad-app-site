import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { APP_NOTIFICATIONS_UPDATED_EVENT, appApi } from '../lib/appApi';
import { getAttendanceRequests, AttendanceRequestOut } from '../lib/hrmsApi';
import { isWebPushConfigured } from '../lib/webPush';
import { triggerAttendanceToast } from '../components/ToastManager';

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Professional chime

export function useNotifications() {
    const { user } = useAuth();
    const useFirebase = isWebPushConfigured();
    const lastNotifId = useRef<number | null>(null);
    const lastReqStatuses = useRef<Record<number, string>>({});
    const isFirstReqCheck = useRef<boolean>(true);
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
            if (!useFirebase) {
                const all = appApi.getUserNotifications(user);
                const mine = all.filter((n: any) => !(n.readBy || []).includes(user.id));

                if (mine.length > 0) {
                    const newest = mine[0];
                    if (lastNotifId.current === null) {
                        lastNotifId.current = newest.id;
                    } else if (newest.id > lastNotifId.current) {
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
            }
        };

        const checkAttendanceRequests = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const requests: AttendanceRequestOut[] = await getAttendanceRequests(token);
                if (isFirstReqCheck.current) {
                    // Populate initial cache on mount without firing toast popups
                    requests.forEach((r) => {
                        lastReqStatuses.current[r.id] = r.status;
                    });
                    isFirstReqCheck.current = false;
                    return;
                }

                for (const r of requests) {
                    const prevStatus = lastReqStatuses.current[r.id];
                    const currStatus = r.status;

                    if (prevStatus === 'pending' && (currStatus === 'approved' || currStatus === 'rejected')) {
                        const isApprove = currStatus === 'approved';
                        const title = isApprove ? 'Attendance Request Approved' : 'Attendance Request Rejected';
                        const dateLabel = r.from_date === r.to_date ? r.from_date : `${r.from_date} to ${r.to_date}`;
                        const message = isApprove
                            ? `Your attendance request for ${dateLabel} has been approved by ${r.resolved_by_name || 'Admin'}.`
                            : `Your attendance request for ${dateLabel} was rejected.`;

                        // Trigger Pop-up Toast Notification on user's screen
                        triggerAttendanceToast({
                            type: isApprove ? 'approved' : 'rejected',
                            title,
                            message,
                            notes: r.notes || undefined,
                        });

                        // Play Sound
                        audioRef.current?.play().catch(() => { });

                        // Show Web System Notification
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification(title, {
                                body: message,
                                icon: '/favicon.ico',
                            });
                        }

                        // Save into local notification store as well
                        appApi.saveNotification({
                            title,
                            message: `${message}${r.notes ? ` (Note: ${r.notes})` : ''}`,
                            targets: [String(r.user_id)],
                            priority: 'important',
                            sentBy: r.resolved_by_name || 'Admin',
                            status: currStatus,
                        });
                    }

                    lastReqStatuses.current[r.id] = currStatus;
                }
            } catch {
                // Ignore transient network errors during background check
            }
        };

        checkNewNotifications();
        checkAttendanceRequests();

        const onUpdated = () => {
            checkNewNotifications();
            checkAttendanceRequests();
        };

        window.addEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
        window.addEventListener('focus', onUpdated);
        return () => {
            window.removeEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
            window.removeEventListener('focus', onUpdated);
        };
    }, [user, useFirebase]);
}

