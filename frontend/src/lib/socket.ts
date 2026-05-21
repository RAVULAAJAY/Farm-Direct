import { io, Socket } from 'socket.io-client';

const SERVER = 'https://farm-direct-api.onrender.com';

if (import.meta.env.DEV) {
  console.log('[Socket Config] Server URL:', SERVER);
}

let socket: Socket | null = null;

export function initSocket() {
  if (socket) {
    return socket;
  }
  
  try {
    socket = io(SERVER, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('[Socket] ✓ Connected successfully');
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

  } catch (e) {
    console.error('[Socket] Failed to initialize:', e);
    socket = null as unknown as Socket;
  }

  return socket;
}

export function getSocket() {
  if (!socket) {
    return initSocket();
  }
  return socket;
}

export function joinUserRoom(userId: string) {
  if (!socket || !userId) {
    return;
  }
  socket.emit('join', String(userId));
}

export function leaveUserRoom(userId: string) {
  if (!socket || !userId) {
    return;
  }
  socket.emit('leave', String(userId));
}

export function on(event: string, cb: (...args: any[]) => void) {
  if (!socket) {
    return;
  }
  socket.on(event, cb);
}

export function off(event: string, cb?: (...args: any[]) => void) {
  if (!socket) {
    return;
  }
  if (cb) socket.off(event, cb);
  else socket.removeAllListeners(event);
}

export function emit(event: string, payload?: any) {
  if (!socket) {
    return;
  }
  socket.emit(event, payload);
}

export default {
  initSocket,
  getSocket,
  joinUserRoom,
  leaveUserRoom,
  on,
  off,
  emit,
};
