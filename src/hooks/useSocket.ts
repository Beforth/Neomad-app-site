import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWsBaseUrl } from '../lib/api';

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
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

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

    return () => {
      ws.close();
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
  const handlersRef = useRef<Map<string, Set<DeliverySocketHandler>>>(new Map());

  useEffect(() => {
    if (!token || user?.role !== 'delivery_boy') {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      return;
    }

    const wsUrl = `${getWsBaseUrl()}/ws/delivery?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(ev.data) as Record<string, any>;
        const event = typeof msg.type === 'string' ? msg.type : '*';
        const eventHandlers = handlersRef.current.get(event) || new Set();
        eventHandlers.forEach((h) => h(msg));
        const wildcardHandlers = handlersRef.current.get('*') || new Set();
        wildcardHandlers.forEach((h) => h(msg));
      } catch {
        /* ignore malformed payload */
      }
    };

    return () => {
      ws.close();
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
            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            ws.send(JSON.stringify({ type: event, ...(payload || {}) }));
          },
        }
      : null;

  return { socket, connected };
}
