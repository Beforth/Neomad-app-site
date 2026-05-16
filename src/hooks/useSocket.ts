import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWsBaseUrl, patchDeliveryLocationHttp } from '../lib/api';

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
 * Messages are JSON `{ type: 'location_update', user_id, lat, lng, status, ... }`.
 */
const WS_RECONNECT_MIN_MS = 1000;
const WS_RECONNECT_MAX_MS = 30000;

export function useTrackingSocket(enabled: boolean) {
  const { token, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Set<(msg: LocationUpdateMessage) => void>>(new Set());

  const subscribe = useCallback((fn: (msg: LocationUpdateMessage) => void) => {
    handlersRef.current.add(fn);
    return () => {
      handlersRef.current.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !token || !user) return;
    if (user.role !== 'admin' && user.role !== 'manager') return;

    const base = getWsBaseUrl();
    const wsUrl = `${base}/ws/tracking?token=${encodeURIComponent(token)}`;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectDelayMs = WS_RECONNECT_MIN_MS;
    let closedByUnmount = false;

    const connect = () => {
      if (closedByUnmount) return;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        reconnectDelayMs = WS_RECONNECT_MIN_MS;
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closedByUnmount) {
          const wait = reconnectDelayMs;
          reconnectDelayMs = Math.min(reconnectDelayMs * 2, WS_RECONNECT_MAX_MS);
          reconnectTimer = setTimeout(connect, wait);
        }
      };
      ws.onerror = () => {
        setConnected(false);
        try {
          ws?.close();
        } catch {
          /* noop */
        }
      };

      ws.onmessage = (ev: MessageEvent<string>) => {
        try {
          const msg = JSON.parse(ev.data) as Record<string, unknown>;
          if (msg.type === 'location_update') {
            handlersRef.current.forEach((fn) => fn(msg as unknown as LocationUpdateMessage));
          }
        } catch {
          /* ignore malformed */
        }
      };
    };

    connect();

    return () => {
      closedByUnmount = true;
      if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
      setConnected(false);
    };
  }, [enabled, token, user?.role]);

  return { connected, subscribe };
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
} {
  const { token, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token ?? null;
  const handlersRef = useRef<Map<string, Set<DeliverySocketHandler>>>(new Map());

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
  }, [token, user?.role]);

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

  return { socket, connected };
}
