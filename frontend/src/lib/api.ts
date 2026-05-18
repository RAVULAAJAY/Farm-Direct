import { Product, ProductReview, User, Order, Message } from '@/lib/data';

const rawApiBase = import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const API_BASE = rawApiBase.replace(/\/$/, '').replace(/\/api\/?$/, '/api');

export { API_BASE };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  return (await res.json()) as T;
}

export const fetchUsers = () => request<User[]>('/users');
export const createUser = (user: Omit<User, 'id'>) => request<User>('/users', { method: 'POST', body: JSON.stringify(user) });
export const updateUser = (id: string, updates: Partial<User>) => request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(updates) });

export const fetchProducts = () => request<Product[]>('/products');
export const createProduct = (product: Omit<Product, 'id' | 'createdAt'>) => request<Product>('/products', { method: 'POST', body: JSON.stringify(product) });
export const updateProductApi = (id: string, updates: Partial<Product>) => request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteProductApi = (id: string) => request<{ success: boolean }>(`/products/${id}`, { method: 'DELETE' });
export const addProductReview = (productId: string, review: Omit<ProductReview, 'id' | 'timestamp' | 'helpful' | 'notHelpful'> & { timestamp?: string; helpful?: number; notHelpful?: number }) =>
  request<Product>(`/products/${productId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(review),
  });

export const fetchOrders = () => request<Order[]>('/orders');
export const createOrder = (order: Omit<Order, 'id' | 'orderDate' | 'status' | 'deliveryStatus'>) => request<Order>('/orders', { method: 'POST', body: JSON.stringify(order) });
export const updateOrderApi = (id: string, updates: Partial<Order>) => request<Order>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const cancelOrderApi = (id: string) => request<Order>(`/orders/${id}/cancel`, { method: 'POST' });
export const sendOtp = (email: string) => request<Record<string, any>>('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email }) });
export const verifyOtp = (email: string, otp: string) => request<Record<string, any>>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) });

export const fetchMessages = () => request<Message[]>('/messages');
export const createMessage = (message: Omit<Message, 'id'> & { id?: string }) =>
  request<Message>('/messages', { method: 'POST', body: JSON.stringify(message) });
export const updateMessageApi = (id: string, updates: Partial<Message>) =>
  request<Message>(`/messages/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteMessageApi = (id: string) => request<{ success: boolean }>(`/messages/${id}`, { method: 'DELETE' });

// Auth endpoints
export const loginUser = (email: string, password: string) => request<Record<string, any>>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const requestPasswordReset = (email: string) => request<Record<string, any>>('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) });
export const resetPassword = (email: string, token: string, password: string) => request<Record<string, any>>('/auth/reset', { method: 'POST', body: JSON.stringify({ email, token, password }) });

export interface ActivityLogItem {
  id: string;
  userId: string;
  userName: string;
  userRole: 'farmer' | 'buyer' | 'admin';
  action: string;
  targetType?: 'user' | 'product' | 'order' | 'message' | 'auth';
  targetId?: string;
  details?: string;
  timestamp: string;
}

export const fetchActivityLogs = () => request<ActivityLogItem[]>('/activity');

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string | null;
}

export const fetchNotifications = (userId?: string) => request<NotificationItem[]>(`/notifications${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`);
export const fetchUnreadNotificationCount = (userId: string) => request<{ unread: number }>(`/notifications/unread-count?userId=${encodeURIComponent(userId)}`);
export const createNotificationApi = (payload: Omit<Partial<NotificationItem>, 'id'>) => request<NotificationItem>('/notifications', { method: 'POST', body: JSON.stringify(payload) });
export const updateNotificationApi = (id: string, updates: Partial<NotificationItem>) => request<NotificationItem>(`/notifications/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteNotificationApi = (id: string) => request<{ success: boolean }>(`/notifications/${id}`, { method: 'DELETE' });
