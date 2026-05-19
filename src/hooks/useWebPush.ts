import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateWebPushToken } from '../lib/api';
import { APP_NOTIFICATIONS_UPDATED_EVENT, NEW_INVOICE_EVENT, appApi } from '../lib/appApi';
import {
  getWebPushRegistrationToken,
  isWebPushConfigured,
  onForegroundMessage,
} from '../lib/webPush';

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

/**
 * Registers FCM for admin/manager desktop web sessions and syncs token with the API.
 * Requires `.env` Firebase + VAPID **public** key and backend `FCM_SERVICE_ACCOUNT_JSON`.
 */
export function useWebPush() {
  const { user, token } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
  }, []);

  useEffect(() => {
    if (!isWebPushConfigured()) return;

    const unsub = onForegroundMessage(({ title, body, data }) => {
      const t = title || 'Neomed';
      const b = body || '';
      const notificationId = data?.notification_id;

      if (notificationId) {
        const existing = appApi.getNotifications().some((n: any) => String(n.notificationId) === String(notificationId));
        if (!existing) {
          appApi.saveNotification({
            title: t,
            message: b,
            targets: ['admin', 'manager'],
            priority: 'important',
            sentBy: 'System',
            isSystem: true,
            notificationId,
          });
        }
      } else {
        appApi.saveNotification({
          title: t,
          message: b,
          targets: ['admin', 'manager'],
          priority: 'important',
          sentBy: 'System',
          isSystem: true,
        });
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(t, { body: b, icon: '/favicon.ico' });
        } catch {
          /* ignore */
        }
      }
      audioRef.current?.play().catch(() => {});

      if (data?.type === 'new_invoice' && data?.invoice_json) {
        try {
          const inv = JSON.parse(String(data.invoice_json));
          window.dispatchEvent(
            new CustomEvent(NEW_INVOICE_EVENT, {
              detail: { invoice: inv, notification_id: notificationId },
            })
          );
          window.dispatchEvent(new CustomEvent(APP_NOTIFICATIONS_UPDATED_EVENT));
        } catch {
          /* ignore */
        }
      }
    });

    return () => {
      unsub?.();
    };
  }, []);

  useEffect(() => {
    if (!isWebPushConfigured() || !user || !token) return;
    if (user.role !== 'admin' && user.role !== 'manager') return;

    let cancelled = false;

    const run = async () => {
      try {
        if (!('serviceWorker' in navigator)) return;
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        if (Notification.permission !== 'granted') return;

        const fcm = await getWebPushRegistrationToken();
        if (cancelled || !fcm) return;
        await updateWebPushToken(token, fcm);
      } catch {
        /* missing env, blocked permission, or API error */
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, token]);
}
