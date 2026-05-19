import { io, Socket } from 'socket.io-client';

// Determine server URL intelligently
const rawApiBase = import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const SERVER = rawApiBase.replace(/\/$/, '').replace(/\/api\/?$/, '');

// Log socket configuration (development only)
if (import.meta.env.DEV) {
  console.log('[Socket Config] VITE_API_BASE:', import.meta.env.VITE_API_BASE);
  console.log('[Socket Config] Server URL:', SERVER);
}

let socket: Socket | null = null;

export function initSocket() {
  if (socket) {
    console.log('[Socket] Socket already initialized, returning existing');
    return socket;
  }
  
  try {
    console.log('[Socket] Initializing connection to:', SERVER);
    socket = io(SERVER, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
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
    console.warn('[Socket] Socket not initialized, attempting to initialize');
    return initSocket();
  }
  return socket;
}

export function joinUserRoom(userId: string) {
  if (!socket || !userId) {
    console.warn('[Socket] Cannot join room: socket unavailable or no userId');
    return;
  }
  console.log('[Socket] Joining room for user:', userId);
  socket.emit('join', String(userId));
}

export function leaveUserRoom(userId: string) {
  if (!socket || !userId) {
    console.warn('[Socket] Cannot leave room: socket unavailable or no userId');
    return;
  }
  console.log('[Socket] Leaving room for user:', userId);
  socket.emit('leave', String(userId));
}

export function on(event: string, cb: (...args: any[]) => void) {
  if (!socket) {
    console.warn('[Socket] Cannot register listener: socket unavailable');
    return;
  }
  console.log('[Socket] Registering listener for event:', event);
  socket.on(event, cb);
}

export function off(event: string, cb?: (...args: any[]) => void) {
  if (!socket) {
    console.warn('[Socket] Cannot unregister listener: socket unavailable');
    return;
  }
  console.log('[Socket] Unregistering listener for event:', event);
  if (cb) socket.off(event, cb);
  else socket.removeAllListeners(event);
}

export function emit(event: string, payload?: any) {
  if (!socket) {
    console.warn('[Socket] Cannot emit event: socket unavailable');
    return;
  }
  console.log('[Socket] Emitting event:', event, payload);
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
