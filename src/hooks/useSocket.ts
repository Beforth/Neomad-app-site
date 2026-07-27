import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWsBaseUrl, patchDeliveryLocationHttp } from '../lib/api';
import {
  APP_NOTIFICATIONS_UPDATED_EVENT,
  NEW_INVOICE_EVENT,
  appApi,
  type NewInvoiceEventDetail,
} from '../lib/appApi';

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export interface LocationUpdateMessage {
  type: 'location_update';
  user_id: number;
  full_name?: string | null;
  email?: string | null;
  lat: number;
  lng: number;
  status: string;
  speed_mps?: number | null;
  heading?: number | null;
  battery_percent?: number | null;
  last_location_at?: string | null;
}

/**
 * Subscribes admin/manager browsers to `/ws/tracking` (JWT query param).
 * Handles location_update, new_invoice, and delivery_user_offline messages
 * through a single shared WebSocket connection per browser tab.
 */
const WS_RECONNECT_MIN_MS = 1000;
const WS_RECONNECT_MAX_MS = 30000;

type TrackingHandler = (msg: LocationUpdateMessage) => void;

interface SharedTrackingConn {
  ws: WebSocket | null;
  connected: boolean;
  listeners: Set<TrackingHandler>;
  refCount: number;
  audio: HTMLAudioElement;
}

let _sharedConn: SharedTrackingConn | null = null;

function _getSharedConn(): SharedTrackingConn {
  if (!_sharedConn) {
    _sharedConn = {
      ws: null,
      connected: false,
      listeners: new Set(),
      refCount: 0,
      audio: new Audio(NOTIFICATION_SOUND),
    };
  }
  return _sharedConn;
}

function _handleTrackingMessage(msg: Record<string, unknown>) {
  if (msg.type === 'location_update') {
    const shared = _getSharedConn();
    const locMsg = msg as unknown as LocationUpdateMessage;
    shared.listeners.forEach((fn) => fn(locMsg));
    return;
  }
  if (msg.type === 'delivery_user_offline') {
    const name =
      (typeof msg.full_name === 'string' && msg.full_name.trim()) ||
      (typeof msg.email === 'string' ? msg.email : 'Delivery user');
    const title = `${name} went offline`;
    const message =
      msg.reason === 'disconnect'
        ? 'Delivery app disconnected or network/mobile may be off.'
        : 'The delivery user ended their shift from the app.';
    appApi.saveNotification({
      title,
      message,
      targets: ['admin', 'manager'],
      priority: 'important',
      sentBy: 'System',
      isSystem: true,
    });
    window.dispatchEvent(new CustomEvent(APP_NOTIFICATIONS_UPDATED_EVENT));
    _getSharedConn().audio.play().catch(() => {});
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body: message, icon: '/favicon.ico' });
      } catch { /* ignore */ }
    }
    return;
  }
  if (msg.type === 'new_invoice' && msg.invoice && typeof msg.invoice === 'object') {
    const inv = msg.invoice as NewInvoiceEventDetail['invoice'];
    const detail: NewInvoiceEventDetail = {
      invoice: inv,
      notification_id:
        typeof msg.notification_id === 'string' ? msg.notification_id : undefined,
    };
    const shouldAlert = dispatchNewInvoiceAlert(detail);
    if (!shouldAlert) return;
    _getSharedConn().audio.play().catch(() => {});
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`New invoice — ${inv.invoice_number}`, {
          body: `${inv.hospital_name} — ₹${Number(inv.amount || 0).toLocaleString('en-IN')}`,
          icon: '/favicon.ico',
        });
      } catch { /* ignore */ }
    }
  }
}

export function useTrackingSocket(enabled: boolean) {
  const { token, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Set<TrackingHandler>>(new Set());

  const subscribe = useCallback((fn: TrackingHandler) => {
    handlersRef.current.add(fn);
    // Sync to shared connection listeners
    const shared = _getSharedConn();
    shared.listeners.add(fn);
    return () => {
      handlersRef.current.delete(fn);
      shared.listeners.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !token || !user) return;
    if (user.role !== 'admin' && user.role !== 'manager') return;

    const shared = _getSharedConn();
    shared.refCount++;

    // If this is the first reference, open the WebSocket
    if (shared.refCount === 1) {
      const base = getWsBaseUrl();
      const wsUrl = `${base}/ws/tracking?token=${encodeURIComponent(token)}`;

      let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
      let reconnectDelayMs = WS_RECONNECT_MIN_MS;
      let closedByCleanup = false;

      const connect = () => {
        if (closedByCleanup) return;
        const ws = new WebSocket(wsUrl);
        shared.ws = ws;

        ws.onopen = () => {
          shared.connected = true;
          setConnected(true);
          reconnectDelayMs = WS_RECONNECT_MIN_MS;
        };
        ws.onclose = () => {
          shared.connected = false;
          setConnected(false);
          if (!closedByCleanup) {
            const wait = reconnectDelayMs;
            reconnectDelayMs = Math.min(reconnectDelayMs * 2, WS_RECONNECT_MAX_MS);
            reconnectTimer = setTimeout(connect, wait);
          }
        };
        ws.onerror = () => {
          shared.connected = false;
          setConnected(false);
          try { ws?.close(); } catch { /* noop */ }
        };
        ws.onmessage = (ev: MessageEvent<string>) => {
          try {
            const msg = JSON.parse(ev.data) as Record<string, unknown>;
            _handleTrackingMessage(msg);
          } catch { /* ignore malformed */ }
        };
      };

      if ('Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission();
      }

      connect();

      // Store cleanup on shared conn for when refCount reaches 0
      (shared as any)._cleanup = () => {
        closedByCleanup = true;
        if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
        if (shared.ws && (shared.ws.readyState === WebSocket.OPEN || shared.ws.readyState === WebSocket.CONNECTING)) {
          shared.ws.close();
        }
        shared.ws = null;
        shared.connected = false;
      };
    } else {
      // Already connected — just sync connected state
      setConnected(shared.connected);
    }

    return () => {
      shared.refCount--;
      if (shared.refCount <= 0) {
        shared.refCount = 0;
        (shared as any)._cleanup?.();
        shared.listeners.clear();
      }
    };
  }, [enabled, token, user?.role]);

  return { connected, subscribe };
}

function dispatchNewInvoiceAlert(detail: NewInvoiceEventDetail): boolean {
  const inv = detail.invoice;
  const title = `New invoice — ${inv.invoice_number}`;
  const message = `${inv.hospital_name} — ₹${Number(inv.amount || 0).toLocaleString('en-IN')}`;
  if (
    detail.notification_id &&
    appApi.getNotifications().some((n: any) => String(n.notificationId) === String(detail.notification_id))
  ) {
    return false;
  }

  appApi.saveNotification({
    title,
    message,
    targets: ['admin', 'manager', 'delivery_boy'],
    priority: 'important',
    sentBy: 'System',
    isSystem: true,
    notificationId: detail.notification_id,
    invoiceId: inv.id,
  });

  window.dispatchEvent(new CustomEvent(NEW_INVOICE_EVENT, { detail }));
  window.dispatchEvent(new CustomEvent(APP_NOTIFICATIONS_UPDATED_EVENT));
  return true;
}

/** @deprecated Use useTrackingSocket instead — it now handles invoice alerts via a shared connection. */
export function useStaffInvoiceAlerts(_enabled: boolean) {
  // No-op: invoice alerts are now handled by useTrackingSocket's shared connection.
  // This export is kept for backward compatibility but does nothing.
}

type DeliverySocketHandler = (payload: any) => void;
type DeliverySocketLike = {
  on: (event: string, handler: DeliverySocketHandler) => () => void;
  emit: (event: string, payload?: Record<string, unknown>) => void;
};

/** Delivery websocket adapter for pages that still use Socket.IO-like API. */
export function useSocket(): {
  socket: DeliverySocketLike | null;
  connected: boolean;
  reconnect: () => void;
} {
  const { token, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token ?? null;
  const handlersRef = useRef<Map<string, Set<DeliverySocketHandler>>>(new Map());

  const reconnect = useCallback(() => {
    setReconnectKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!token || user?.role !== 'delivery_boy') {
      wsRef.current = null;
      setConnected(false);
      return;
    }

    const wsUrl = `${getWsBaseUrl()}/ws/delivery?token=${encodeURIComponent(token)}`;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectDelayMs = WS_RECONNECT_MIN_MS;
    let closedByUnmount = false;

    const connect = () => {
      if (closedByUnmount) return;
      const prev = wsRef.current;
      if (prev && (prev.readyState === WebSocket.OPEN || prev.readyState === WebSocket.CONNECTING)) {
        try {
          prev.close();
        } catch {
          /* noop */
        }
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectDelayMs = WS_RECONNECT_MIN_MS;
      };
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!closedByUnmount) {
          const wait = reconnectDelayMs;
          reconnectDelayMs = Math.min(reconnectDelayMs * 2, WS_RECONNECT_MAX_MS);
          reconnectTimer = setTimeout(connect, wait);
        }
      };
      ws.onerror = () => {
        setConnected(false);
        try {
          ws.close();
        } catch {
          /* noop */
        }
      };

      ws.onmessage = (ev: MessageEvent<string>) => {
        try {
          const msg = JSON.parse(ev.data) as Record<string, any>;
          if (msg.type === 'ping' && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          const event = typeof msg.type === 'string' ? msg.type : '*';
          const eventHandlers = handlersRef.current.get(event) || new Set();
          eventHandlers.forEach((h) => h(msg));
          const wildcardHandlers = handlersRef.current.get('*') || new Set();
          wildcardHandlers.forEach((h) => h(msg));
        } catch {
          /* ignore malformed payload */
        }
      };
    };

    connect();

    return () => {
      closedByUnmount = true;
      if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
      const w = wsRef.current;
      if (w && (w.readyState === WebSocket.OPEN || w.readyState === WebSocket.CONNECTING)) {
        w.close();
      }
      wsRef.current = null;
      setConnected(false);
    };
  }, [token, user?.role, reconnectKey]);

  const socket: DeliverySocketLike | null =
    token && user?.role === 'delivery_boy'
      ? {
          on: (event: string, handler: DeliverySocketHandler) => {
            const set = handlersRef.current.get(event) || new Set<DeliverySocketHandler>();
            set.add(handler);
            handlersRef.current.set(event, set);
            return () => {
              const current = handlersRef.current.get(event);
              if (!current) return;
              current.delete(handler);
              if (current.size === 0) handlersRef.current.delete(event);
            };
          },
          emit: (event: string, payload?: Record<string, unknown>) => {
            const body = { type: event, ...(payload || {}) };
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(body));
              return;
            }
            if (event !== 'location_update') return;
            const t = tokenRef.current;
            if (!t) return;
            const lat = payload?.lat;
            const lng = payload?.lng;
            if (typeof lat !== 'number' || typeof lng !== 'number') return;
            void patchDeliveryLocationHttp(t, {
              lat,
              lng,
              speed_mps: (payload.speed_mps as number | null | undefined) ?? null,
              heading: (payload.heading as number | null | undefined) ?? null,
              battery_percent: (payload.battery_percent as number | null | undefined) ?? null,
            }).catch((e) => {
              console.warn('[delivery] HTTP location fallback failed', e);
            });
          },
        }
      : null;

  return { socket, connected, reconnect };
}
