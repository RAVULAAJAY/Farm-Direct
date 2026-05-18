import { io, Socket } from 'socket.io-client';

const rawApiBase = import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const SERVER = rawApiBase.replace(/\/$/, '').replace(/\/api\/?$/, '');

let socket: Socket | null = null;

export function initSocket() {
  if (socket) return socket;
  try {
    socket = io(SERVER, { transports: ['websocket'], autoConnect: true });
  } catch (e) {
    // fallback: keep null
    socket = null as unknown as Socket;
  }

  return socket;
}

export function getSocket() {
  return socket;
}

export function joinUserRoom(userId: string) {
  if (!socket || !userId) return;
  socket.emit('join', String(userId));
}

export function leaveUserRoom(userId: string) {
  if (!socket || !userId) return;
  socket.emit('leave', String(userId));
}

export function on(event: string, cb: (...args: any[]) => void) {
  if (!socket) return;
  socket.on(event, cb);
}

export function off(event: string, cb?: (...args: any[]) => void) {
  if (!socket) return;
  if (cb) socket.off(event, cb);
  else socket.removeAllListeners(event);
}

export function emit(event: string, payload?: any) {
  if (!socket) return;
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
