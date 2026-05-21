import { Product, ProductReview, User, Order, Message } from '@/lib/data';

const API_BASE = 'https://farm-direct-api.onrender.com/api';

if (import.meta.env.DEV) {
  console.log('[API Config] Final API_BASE:', API_BASE);
}

export { API_BASE };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = `${API_BASE}${path}`;
  
  if (import.meta.env.DEV) {
    console.log(`[API Request] ${options.method || 'GET'} ${fullUrl}`);
  }

  try {
    const res = await fetch(fullUrl, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    if (!res.ok) {
      let errorBody: any = {};
      try {
        errorBody = await res.json();
      } catch (e) {
        errorBody = { text: await res.text() };
      }
      
      const errorMsg = errorBody?.error || errorBody?.message || res.statusText;
      console.error(`[API Error] ${res.status}: ${errorMsg}`, errorBody);
      throw new Error(`API error ${res.status}: ${errorMsg}`);
    }

    const data = (await res.json()) as T;
    if (data && typeof data === 'object' && 'success' in (data as any) && 'message' in (data as any) && 'data' in (data as any)) {
      return (data as any).data as T;
    }
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${path}:`, data);
    }
    return data;
  } catch (err) {
    console.error(`[API Exception] ${path}:`, err);
    throw err;
  }
}

export const fetchUsers = () => request<User[]>('/users');
export const createUser = (user: Omit<User, 'id'> & { password?: string }) => {
  console.log('API CREATE USER PAYLOAD', { email: user.email, name: user.name, role: (user as any).role });
  return request<Record<string, any>>('/auth/signup', { method: 'POST', body: JSON.stringify(user) });
};
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
export const sendOtp = async (email: string) => {
  console.log('[OTP Send] Starting for email:', email);
  try {
    const response = await request<Record<string, any>>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    console.log('[OTP Send] ✓ Success:', response);
    return response;
  } catch (error) {
    console.error('[OTP Send] ✗ Failed:', error);
    throw error;
  }
};

export const verifyOtp = async (email: string, otp: string) => {
  console.log('[OTP Verify] Starting for email:', email, 'OTP length:', otp.length);
  try {
    const response = await request<Record<string, any>>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    console.log('[OTP Verify] ✓ Success:', response);
    return response;
  } catch (error) {
    console.error('[OTP Verify] ✗ Failed:', error);
    throw error;
  }
};

export const fetchMessages = () => request<Message[]>('/messages');
export const createMessage = (message: Omit<Message, 'id'> & { id?: string }) =>
  request<Message>('/messages', { method: 'POST', body: JSON.stringify(message) });
export const updateMessageApi = (id: string, updates: Partial<Message>) =>
  request<Message>(`/messages/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteMessageApi = (id: string) => request<{ success: boolean }>(`/messages/${id}`, { method: 'DELETE' });

// Auth endpoints
export const loginUser = (email: string, password: string) => {
  const payload = { email, password };
  console.log('LOGIN PAYLOAD', payload);
  return request<Record<string, any>>('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
};
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
