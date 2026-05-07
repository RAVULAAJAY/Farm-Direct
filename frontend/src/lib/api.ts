import { Product, ProductReview, User, Order } from '@/lib/data';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api';

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
