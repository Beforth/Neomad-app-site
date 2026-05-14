import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';

function firebaseConfigFromEnv() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  if (!apiKey) return null;
  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
    measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || undefined,
  };
}

let _app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const config = firebaseConfigFromEnv();
  if (!config) return null;
  if (!_app) {
    _app = initializeApp(config);
  }
  return _app;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (!(await isSupported())) return null;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return getMessaging(app);
  } catch {
    return null;
  }
}

/** Subscribe to foreground FCM messages (tab in focus; SW handles background). */
export function onForegroundMessage(
  cb: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
): (() => void) | undefined {
  const app = getFirebaseApp();
  if (!app) return undefined;
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      const data = payload.data || {};
      cb({
        title: payload.notification?.title || data.title,
        body: payload.notification?.body || data.body,
        data: data as Record<string, string>,
      });
    });
  } catch {
    return undefined;
  }
}

export async function getWebPushRegistrationToken(): Promise<string | null> {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey) return null;
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    return await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
  } catch {
    return null;
  }
}

export function isWebPushConfigured(): boolean {
  return Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_VAPID_KEY);
}
