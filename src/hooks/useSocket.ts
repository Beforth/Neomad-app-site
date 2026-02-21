import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

let socket: Socket | null = null;

export const useSocket = () => {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (token && !socket) {
      socket = io({
        auth: { token }
      });

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
    }

    return () => {
      if (socket) {
        // socket.disconnect();
        // socket = null;
      }
    };
  }, [token]);

  return { socket, connected };
};
