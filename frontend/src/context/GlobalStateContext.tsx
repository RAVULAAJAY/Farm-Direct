import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import {
  Product,
  ProductReview,
  Order,
} from '@/lib/data';
import * as api from '@/lib/api';

export type UserRole = 'farmer' | 'buyer' | 'admin';
export type AuthMode = 'login' | 'signup' | null;

export interface FarmerPaymentDetails {
  bankName: string;
  accountNumber: string;
  ifscOrUpi: string;
  upiQrCodeDataUrl?: string;
  upiQrCodeFileName?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetType?: 'user' | 'product' | 'order' | 'message' | 'auth';
  targetId?: string;
  details?: string;
  timestamp: string;
}

export interface FarmerLocation {
  latitude: number;
  longitude: number;
}

export interface FarmerOnboardingDetails {
  address: string;
  farmLocation: FarmerLocation;
  idProofFileName: string;
  idProofDataUrl?: string;
  upiId?: string;
  ifscCode?: string;
  bankAccountNumber?: string;
  bankName?: string;
  phoneVerified: boolean;
}

export interface BuyerOnboardingDetails {
  location: string;
  locationCoordinates: FarmerLocation;
  profilePhotoFileName?: string;
  idProofFileName?: string;
  idProofDataUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  role: UserRole;
  isActive?: boolean;
  lastLoginAt?: string;
  loginCount?: number;
  profilePhoto?: string;
  farmName?: string;
  cropTypes?: string[];
  paymentDetails?: FarmerPaymentDetails;
  farmDetails?: string;
  farmerOnboarding?: FarmerOnboardingDetails;
  buyerOnboarding?: BuyerOnboardingDetails;
  createdAt?: string;
}

const defaultAdminUser: User = {
  id: 'admin_primary',
  name: 'Platform Admin',
  email: 'admin@platform.local',
  phone: '',
  location: 'HQ',
  role: 'admin',
  isActive: true,
  loginCount: 0,
  createdAt: new Date().toISOString(),
};

const isUserRole = (value: unknown): value is UserRole => {
  return value === 'farmer' || value === 'buyer' || value === 'admin';
};

const isValidUser = (value: unknown): value is User => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.location === 'string' &&
    typeof candidate.phone === 'string' &&
    isUserRole(candidate.role)
  );
};

const readStoredValue = <T,>(key: string): T | null => {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch {
    return null;
  }
};

const normalizeStockValue = (value: unknown): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor(parsed));
};

const normalizeProduct = (product: Product): Product => {
  const stock = normalizeStockValue((product as Partial<Product>).stock ?? product.quantity);

  return {
    ...product,
    stock,
    quantity: stock,
    available: stock > 0,
  };
};

const sanitizeUserForStorage = (user: User): User => ({
  ...user,
  paymentDetails: user.paymentDetails
    ? {
        bankName: user.paymentDetails.bankName,
        accountNumber: user.paymentDetails.accountNumber,
        ifscOrUpi: user.paymentDetails.ifscOrUpi,
      }
    : user.paymentDetails,
  farmerOnboarding: user.farmerOnboarding
    ? {
        ...user.farmerOnboarding,
        idProofDataUrl: undefined,
      }
    : user.farmerOnboarding,
  buyerOnboarding: user.buyerOnboarding
    ? {
        ...user.buyerOnboarding,
        idProofDataUrl: undefined,
      }
    : user.buyerOnboarding,
  profilePhoto: user.profilePhoto,
});

const safeSetLocalStorageItem = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist ${key} to localStorage`, error);
  }
};

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface OrderDeliveryInput {
  option: 'pickup' | 'delivery';
  deliveryAddress?: string;
  pickupLocation?: string;
  paymentMethod?: CheckoutPaymentMethod;
  recipientName?: string;
}

export type CheckoutPaymentMethod = 'upi' | 'card' | 'cod';

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CheckoutInput {
  deliveryAddress: string;
  contactPhone: string;
  recipientName?: string;
  paymentMethod: CheckoutPaymentMethod;
}

const normalizeOrder = (order: Order): Order => {
  const deliveryOption = order.deliveryOption ?? 'delivery';
  const deliveryStatus =
    order.deliveryStatus ??
    (order.status === 'delivered'
      ? 'delivered'
      : order.status === 'cancelled'
      ? 'cancelled'
      : deliveryOption === 'pickup'
      ? 'ready-for-pickup'
      : order.status === 'shipped'
      ? 'out-for-delivery'
      : 'pending');

  return {
    ...order,
    deliveryOption,
    deliveryStatus,
  };
};

export type NotificationType = 'order' | 'message' | 'update';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

const defaultNotifications: AppNotification[] = [];

const defaultMessages: Message[] = [];

const normalizeMessage = (message: Message): Message => ({
  ...message,
  id: String(message.id),
  senderId: String(message.senderId),
  senderName: String(message.senderName),
  recipientId: String(message.recipientId),
  recipientName: String(message.recipientName),
  content: String(message.content),
  timestamp: message.timestamp || new Date().toISOString(),
  read: Boolean(message.read),
});

const normalizeMessages = (messages: Message[]) => messages.map(normalizeMessage);

const mergeMessages = (localMessages: Message[], remoteMessages: Message[]) => {
  const merged = new Map<string, Message>();

  normalizeMessages(remoteMessages).forEach((message) => {
    merged.set(message.id, message);
  });

  normalizeMessages(localMessages).forEach((message) => {
    const existing = merged.get(message.id);
    if (!existing) {
      merged.set(message.id, message);
      return;
    }

    merged.set(message.id, {
      ...existing,
      ...message,
      read: existing.read || message.read,
    });
  });

  return Array.from(merged.values()).sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );
};

const isSameMessage = (left: Message, right: Message) =>
  left.id === right.id &&
  left.senderId === right.senderId &&
  left.senderName === right.senderName &&
  left.recipientId === right.recipientId &&
  left.recipientName === right.recipientName &&
  left.content === right.content &&
  left.timestamp === right.timestamp &&
  left.read === right.read;

const areMessageListsEqual = (left: Message[], right: Message[]) => {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((message, index) => isSameMessage(message, right[index]));
};

export interface GlobalStateContextType {
  // Auth
  currentUser: User | null;
  selectedRole: UserRole | null;
  users: User[];
  login: (user: User) => void;
  signup: (user: User) => void;
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
  setSelectedRole: (role: UserRole | null) => void;
  upsertUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  blockUser: (userId: string) => void;
  enableUser: (userId: string) => void;

  // Products
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  addProductReview: (productId: string, review: Omit<ProductReview, 'id' | 'timestamp' | 'helpful' | 'notHelpful'> & { timestamp?: string; helpful?: number; notHelpful?: number }) => Promise<Product | undefined>;
  deleteProduct: (id: string) => void;
  getProductById: (id: string) => Product | undefined;
  getProductsByFarmer: (farmerId: string) => Product[];

  // Buyer favorites and orders
  favoriteProductIds: string[];
  toggleFavoriteProduct: (productId: string) => void;
  isFavoriteProduct: (productId: string) => boolean;
  cartItems: CartItem[];
  addToCart: (productId: string, quantity?: number) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  checkoutCart: (checkout: CheckoutInput) => Promise<{ success: boolean; createdOrderIds: string[]; message: string }>;
  placeOrder: (product: Product, quantity: number, deliveryInput?: OrderDeliveryInput) => Promise<Order | undefined>;

  // Orders
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  getOrderById: (id: string) => Order | undefined;
  getOrdersByBuyer: (buyerId: string) => Order[];
  getOrdersByFarmer: (farmerId: string) => Order[];

  // Messages
  messages: Message[];
  addMessage: (message: Message) => void;
  deleteMessage: (messageId: string) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  getMessagesByUser: (userId: string) => Message[];
  getConversationMessages: (userIdA: string, userIdB: string) => Message[];
  markMessagesAsRead: (messageIds: string[]) => void;
  getUnreadMessageCount: (userId: string) => number;

  // Notifications
  notifications: AppNotification[];
    // Activity logs
    activityLogs: ActivityLog[];
    addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => void;
    getActivityLogsByUser: (userId: string) => ActivityLog[];
  addNotification: (notification: AppNotification) => void;
  getNotificationsByUser: (userId: string) => AppNotification[];
  markNotificationAsRead: (notificationId: string) => void;
  deleteNotification: (notificationId: string) => void;
  clearNotificationsForUser: (userId: string) => void;
  getUnreadNotificationCount: (userId: string) => number;

  // Statistics
  getTotalSpentByBuyer: (buyerId: string) => number;
  getOrderCountByBuyer: (buyerId: string) => number;
  getFarmerRevenue: (farmerId: string) => number;
  getFarmerOrderCount: (farmerId: string) => number;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(
  undefined
);

export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const storedUser = readStoredValue<unknown>('currentUser');
    if (isValidUser(storedUser)) {
      return storedUser;
    }

    if (storedUser !== null) {
      localStorage.removeItem('currentUser');
    }

    return null;
  });
  const [selectedRole, setSelectedRoleState] = useState<UserRole | null>(() => {
    const storedRole = readStoredValue<unknown>('selectedRole');
    if (isUserRole(storedRole)) {
      return storedRole;
    }

    if (storedRole !== null) {
      localStorage.removeItem('selectedRole');
    }

    const storedUser = readStoredValue<unknown>('currentUser');
    return isValidUser(storedUser) ? storedUser.role : null;
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([defaultAdminUser]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>(() => {
    const storedMessages = readStoredValue<Message[]>('messages') ?? defaultMessages;
    return normalizeMessages(storedMessages);
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>(() => {
    return readStoredValue<string[]>('favoriteProductIds') ?? [];
  });
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    return readStoredValue<CartItem[]>('cartItems') ?? [];
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedUsers, fetchedProducts, fetchedOrders, fetchedActivity, fetchedNotifications, fetchedMessages] = await Promise.all([
          api.fetchUsers(),
          api.fetchProducts(),
          api.fetchOrders(),
          api.fetchActivityLogs(),
          Promise.resolve([]), // no notifications endpoint yet
          api.fetchMessages(),
        ]);

        const storedMessages = normalizeMessages(readStoredValue<Message[]>('messages') ?? defaultMessages);
        const remoteMessageIds = new Set(fetchedMessages.map((message) => message.id));
        const missingMessages = storedMessages.filter((message) => !remoteMessageIds.has(message.id));

        if (missingMessages.length > 0) {
          void Promise.all(missingMessages.map((message) => api.createMessage(message))).catch((error) => {
            console.error('Failed to sync local messages to backend', error);
          });
        }

        setUsers(fetchedUsers.length > 0 ? fetchedUsers : [defaultAdminUser]);
        setProducts((prev) => {
          if (fetchedProducts.length === 0 && prev.length > 0) {
            return prev;
          }
          return fetchedProducts.map(normalizeProduct);
        });
        setOrders((prev) => {
          if (fetchedOrders.length === 0 && prev.length > 0) {
            return prev;
          }
          return fetchedOrders.map(normalizeOrder);
        });
        setActivityLogs((prev) => {
          if (fetchedActivity.length === 0 && prev.length > 0) {
            return prev;
          }
          return fetchedActivity;
        });
        setNotifications(fetchedNotifications);
        setMessages((prev) => {
          const merged = mergeMessages(prev.length > 0 ? prev : storedMessages, fetchedMessages);
          if (areMessageListsEqual(prev, merged)) {
            return prev;
          }

          safeSetLocalStorageItem('messages', merged);
          return merged;
        });
      } catch (error) {
        console.error('Unable to load remote data', error);
      }
    };

    loadData();

    const isJsonEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

    const poll = setInterval(async () => {
      try {
        const [productsData, usersData, ordersData, activityData, messagesData] = await Promise.all([
          api.fetchProducts(),
          api.fetchUsers(),
          api.fetchOrders(),
          api.fetchActivityLogs(),
          api.fetchMessages(),
        ]);

        const updatedProducts = productsData.map(normalizeProduct);
        setProducts((prev) => (isJsonEqual(prev, updatedProducts) ? prev : updatedProducts));

        setUsers((prev) => {
          const nextUsers = usersData.length > 0 ? usersData : [defaultAdminUser];
          return isJsonEqual(prev, nextUsers) ? prev : nextUsers;
        });

        const updatedOrders = ordersData.map(normalizeOrder);
        setOrders((prev) => (isJsonEqual(prev, updatedOrders) ? prev : updatedOrders));

        setActivityLogs((prev) => (isJsonEqual(prev, activityData) ? prev : activityData));
        setMessages((prev) => {
          const merged = mergeMessages(prev, messagesData);
          if (areMessageListsEqual(prev, merged)) {
            return prev;
          }

          safeSetLocalStorageItem('messages', merged);
          return merged;
        });
      } catch (e) {
        console.warn('Polling error', e);
      }
    }, 8000);

    return () => clearInterval(poll);
  }, []);

  const notifyAdmins = useCallback((
    title: string,
    messageBuilder: (adminUserId: string, index: number) => string,
    actionUrl: string,
    idPrefix: string
  ) => {
    const adminUsers = users.filter((existingUser) => existingUser.role === 'admin');
    if (adminUsers.length === 0) {
      return;
    }

    setNotifications((prev) => {
      const timestamp = new Date().toISOString();
      const adminNotifications: AppNotification[] = adminUsers.map((adminUser, index) => ({
        id: `${idPrefix}_${Date.now()}_${adminUser.id}_${index}`,
        userId: adminUser.id,
        type: 'update',
        title,
        message: messageBuilder(adminUser.id, index),
        timestamp,
        read: false,
        actionUrl,
      }));

      const updated = [...adminNotifications, ...prev];
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  }, [users]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key) {
        return;
      }

      if (event.key === 'products') {
        const nextProducts = readStoredValue<Product[]>('products') ?? [];
        setProducts(nextProducts.map(normalizeProduct));
        return;
      }

      if (event.key === 'orders') {
        const nextOrders = readStoredValue<Order[]>('orders') ?? [];
        setOrders(nextOrders.map(normalizeOrder));
        return;
      }

      if (event.key === 'messages') {
        const nextMessages = readStoredValue<Message[]>('messages') ?? [];
        setMessages((prev) => (areMessageListsEqual(prev, nextMessages) ? prev : nextMessages));
        return;
      }

      if (event.key === 'notifications') {
        const nextNotifications = readStoredValue<AppNotification[]>('notifications') ?? [];
        setNotifications(nextNotifications);
        return;
      }

      if (event.key === 'activityLogs') {
        const nextActivityLogs = readStoredValue<ActivityLog[]>('activityLogs') ?? [];
        setActivityLogs(nextActivityLogs);
        return;
      }

      if (event.key === 'users') {
        const nextUsers = readStoredValue<User[]>('users') ?? [];
        setUsers(nextUsers);

        setCurrentUserState((prev) => {
          if (!prev) {
            return prev;
          }

          const refreshedUser = nextUsers.find((entry) => entry.id === prev.id);
          return refreshedUser ?? prev;
        });
        return;
      }

      if (event.key === 'favoriteProductIds') {
        const nextFavorites = readStoredValue<string[]>('favoriteProductIds') ?? [];
        setFavoriteProductIds(nextFavorites);
        return;
      }

      if (event.key === 'cartItems') {
        const nextCart = readStoredValue<CartItem[]>('cartItems') ?? [];
        setCartItems(nextCart);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Periodic sync of products, users, orders, and activity from backend API
  useEffect(() => {
    const pollData = async () => {
      try {
        const [fetchedUsers, fetchedProducts, fetchedOrders, fetchedActivity] = await Promise.all([
          api.fetchUsers(),
          api.fetchProducts(),
          api.fetchOrders(),
          api.fetchActivityLogs(),
        ]);

        setUsers(fetchedUsers.length > 0 ? fetchedUsers : [defaultAdminUser]);
        setProducts((prev) => {
          // Avoid flicker from transient empty responses while user already has products in view.
          if (fetchedProducts.length === 0 && prev.length > 0) {
            return prev;
          }
          return fetchedProducts.map(normalizeProduct);
        });
        setOrders((prev) => {
          if (fetchedOrders.length === 0 && prev.length > 0) {
            return prev;
          }
          return fetchedOrders.map(normalizeOrder);
        });
        setActivityLogs((prev) => {
          if (fetchedActivity.length === 0 && prev.length > 0) {
            return prev;
          }
          return fetchedActivity;
        });
      } catch (error) {
        console.warn('Poll failed to fetch remote data', error);
      }
    };

    pollData();
    const pollInterval = setInterval(pollData, 3000);

    return () => clearInterval(pollInterval);
  }, []);

  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);

    if (user) {
      const storedUser = sanitizeUserForStorage(user);
      safeSetLocalStorageItem('currentUser', storedUser);
      safeSetLocalStorageItem(`user_${user.id}`, storedUser);
      setSelectedRoleState(user.role);
      safeSetLocalStorageItem('selectedRole', user.role);
      return;
    }

    localStorage.removeItem('currentUser');
    setSelectedRoleState(null);
    localStorage.removeItem('selectedRole');
  }, []);

  const setSelectedRole = useCallback((role: UserRole | null) => {
    setSelectedRoleState(role);

    if (role) {
      localStorage.setItem('selectedRole', JSON.stringify(role));
      return;
    }

    localStorage.removeItem('selectedRole');
  }, []);

  const addActivityLog = useCallback(async (log: Omit<ActivityLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => {
    const nextLog: ActivityLog = {
      id: log.id ?? `activity_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: log.timestamp ?? new Date().toISOString(),
      userId: log.userId,
      userName: log.userName,
      userRole: log.userRole,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      details: log.details,
    };

    setActivityLogs((prev) => [nextLog, ...prev].slice(0, 500));

    try {
      await fetch('http://localhost:4000/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextLog),
      });
    } catch (error) {
      console.warn('Failed to persist activity log', error);
    }
  }, []);

  const addNotification = useCallback((notification: AppNotification) => {
    setNotifications((prev) => [notification, ...prev]);
    // TODO: Add backend notification endpoint when needed
  }, []);

  const upsertUser = useCallback(async (user: User) => {
    try {
      const existing = users.find((entry) => entry.id === user.id);

      let savedUser: User;
      if (existing) {
        savedUser = await api.updateUser(user.id, user as Partial<User>);
      } else {
        savedUser = await api.createUser(user as Omit<User, 'id'>);
      }

      setUsers((prev) => {
        const existingIndex = prev.findIndex((entry) => entry.id === savedUser.id);
        const mergedUsers =
          existingIndex >= 0
            ? prev.map((entry) => (entry.id === savedUser.id ? { ...entry, ...savedUser } : entry))
            : [savedUser, ...prev];

        return mergedUsers;
      });

      if (!existing) {
        const targetTab = user.role === 'farmer' ? 'farmers' : user.role === 'buyer' ? 'buyers' : 'overview';
        notifyAdmins(
          `New ${user.role} registered`,
          () => `${user.name} has joined as a ${user.role}.`,
          `/admin/dashboard?tab=${targetTab}`,
          `notification_new_${user.role}`
        );

        addActivityLog({
          userId: savedUser.id,
          userName: savedUser.name,
          userRole: savedUser.role,
          action: 'registered account',
          targetType: 'auth',
          targetId: savedUser.id,
          details: `${savedUser.role} account created`,
        });
      }
    } catch (error) {
      console.error('Failed to upsert user', error);
      throw error;
    }
  }, [addActivityLog, notifyAdmins, users]);

  const login = useCallback((user: User) => {
    const existingUser = users.find((entry) => entry.id === user.id);
    if (existingUser && existingUser.isActive === false) {
      return;
    }

    const now = new Date().toISOString();
    const nextUser: User = {
      ...user,
      isActive: user.isActive ?? true,
      lastLoginAt: now,
      loginCount: (user.loginCount ?? 0) + 1,
    };

    void upsertUser(nextUser).catch((error) => {
      console.error('Failed to sync login user', error);
    });
    setCurrentUser(nextUser);

    addActivityLog({
      userId: nextUser.id,
      userName: nextUser.name,
      userRole: nextUser.role,
      action: 'logged in',
      targetType: 'auth',
      targetId: nextUser.id,
      details: `Login count: ${nextUser.loginCount ?? 1}`,
    });
  }, [addActivityLog, setCurrentUser, upsertUser, users]);

  const signup = useCallback((user: User) => {
    if (user.role === 'admin') {
      return;
    }

    const userWithTimestamp = {
      ...user,
      isActive: user.isActive ?? true,
      loginCount: user.loginCount ?? 0,
      createdAt: new Date().toISOString(),
    };

    void upsertUser(userWithTimestamp).catch((error) => {
      console.error('Failed to sync signup user', error);
    });
    setCurrentUser(userWithTimestamp);
  }, [setCurrentUser, upsertUser]);

  const logout = useCallback(() => {
    if (currentUser) {
      addActivityLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'logged out',
        targetType: 'auth',
        targetId: currentUser.id,
      });
    }

    setCurrentUserState(null);
    setSelectedRoleState(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('selectedRole');
    setCartItems([]);
    localStorage.setItem('cartItems', JSON.stringify([]));
  }, [addActivityLog, currentUser]);

  const updateUser = useCallback(async (userId: string, updates: Partial<User>) => {
    try {
      const currentRecord = users.find((user) => user.id === userId);
      const mergedRecord: User = currentRecord ? { ...currentRecord, ...updates } : ({ id: userId, ...updates } as User);

      const savedUser = await api.updateUser(userId, mergedRecord);
      const normalizedUser = { ...mergedRecord, ...savedUser };

      setUsers((prev) => {
        const updated = prev.map((user) =>
          user.id === userId ? normalizedUser : user
        );
        if (!updated.some((user) => user.id === userId)) {
          updated.unshift(normalizedUser);
        }
        safeSetLocalStorageItem('users', updated.map(sanitizeUserForStorage));
        return updated;
      });

      setCurrentUserState((prev) => {
        if (!prev || prev.id !== userId) {
          return prev;
        }

        const nextUser = { ...prev, ...normalizedUser };
        const storedUser = sanitizeUserForStorage(nextUser);
        safeSetLocalStorageItem('currentUser', storedUser);
        safeSetLocalStorageItem(`user_${userId}`, storedUser);
        return nextUser;
      });

      return normalizedUser;
    } catch (error) {
      console.error('Failed to update user', error);
      throw error;
    }
  }, [users]);

  const removeUserFromState = useCallback((userId: string) => {
    setUsers((prev) => {
      const updated = prev.filter((user) => user.id !== userId);
      localStorage.setItem('users', JSON.stringify(updated));
      return updated;
    });

    setProducts((prev) => {
      const updated = prev.filter((product) => product.farmerId !== userId);
      localStorage.setItem('products', JSON.stringify(updated));
      return updated;
    });

    setOrders((prev) => {
      const updated = prev.filter(
        (order) => order.buyerId !== userId && order.farmerId !== userId
      );
      localStorage.setItem('orders', JSON.stringify(updated));
      return updated;
    });

    setFavoriteProductIds((prev) => {
      localStorage.setItem('favoriteProductIds', JSON.stringify(prev));
      return prev;
    });

    if (currentUser?.id === userId) {
      setCurrentUserState(null);
      setSelectedRoleState(null);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('selectedRole');
    }
  }, [currentUser]);

  const deleteUser = useCallback((userId: string) => {
        const removedUser = users.find((entry) => entry.id === userId);
        if (currentUser && removedUser) {
          addActivityLog({
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'deleted user',
            targetType: 'user',
            targetId: removedUser.id,
            details: `${removedUser.name} (${removedUser.role})`,
          });
        }
    removeUserFromState(userId);
  }, [addActivityLog, currentUser, removeUserFromState, users]);

  const blockUser = useCallback((userId: string) => {
        const blockedUser = users.find((entry) => entry.id === userId);
        if (currentUser && blockedUser) {
          addActivityLog({
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'disabled user',
            targetType: 'user',
            targetId: blockedUser.id,
            details: `${blockedUser.name} (${blockedUser.role})`,
          });
        }
    updateUser(userId, { isActive: false });

    if (currentUser?.id === userId) {
      setCurrentUserState(null);
      setSelectedRoleState(null);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('selectedRole');
    }
  }, [addActivityLog, currentUser, updateUser, users]);

  const enableUser = useCallback((userId: string) => {
        const enabledUser = users.find((entry) => entry.id === userId);
        if (currentUser && enabledUser) {
          addActivityLog({
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'enabled user',
            targetType: 'user',
            targetId: enabledUser.id,
            details: `${enabledUser.name} (${enabledUser.role})`,
          });
        }
    updateUser(userId, { isActive: true });
  }, [addActivityLog, currentUser, updateUser, users]);

  // Product operations
  const addProduct = useCallback(async (product: Product) => {
    try {
      const created = await api.createProduct(product);
      setProducts((prev) => [...prev, normalizeProduct(created)]);
      addActivityLog({
        userId: created.farmerId,
        userName: created.farmerName,
        userRole: 'farmer',
        action: 'uploaded product',
        targetType: 'product',
        targetId: created.id,
        details: created.name,
      });

      notifyAdmins(
        'New product uploaded',
        () => `${created.farmerName} uploaded a new product: ${created.name}.`,
        '/admin/dashboard?tab=products',
        'notification_new_product'
      );
      return created;
    } catch (error) {
      console.error('Failed to add product', error);
      throw error;
    }
  }, [addActivityLog, notifyAdmins]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    try {
      const updatedProduct = await api.updateProductApi(id, updates as Partial<Product>);
      setProducts((prev) => prev.map((p) => (p.id === id ? normalizeProduct(updatedProduct) : p)));
    } catch (error) {
      console.error('Failed to update product', error);
    }
  }, []);

  const addProductReview = useCallback(async (productId: string, review: Omit<ProductReview, 'id' | 'timestamp' | 'helpful' | 'notHelpful'> & { timestamp?: string; helpful?: number; notHelpful?: number }) => {
    try {
      const updatedProduct = await api.addProductReview(productId, review);
      setProducts((prev) => prev.map((p) => (p.id === productId ? normalizeProduct(updatedProduct) : p)));
      return updatedProduct;
    } catch (error) {
      console.error('Failed to add product review', error);
      return undefined;
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await api.deleteProductApi(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Failed to delete product', error);
    }
  }, []);

  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );

  const getProductsByFarmer = useCallback(
    (farmerId: string) => products.filter((p) => p.farmerId === farmerId),
    [products]
  );

  const toggleFavoriteProduct = useCallback((productId: string) => {
    setFavoriteProductIds((prev) => {
      const updated = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem('favoriteProductIds', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavoriteProduct = useCallback(
    (productId: string) => favoriteProductIds.includes(productId),
    [favoriteProductIds]
  );

  const addToCart = useCallback((productId: string, quantity = 1) => {
    setCartItems((prev) => {
      const safeQuantity = Math.max(1, Math.floor(quantity));
      const existing = prev.find((item) => item.productId === productId);

      const updated = existing
        ? prev.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + safeQuantity }
              : item
          )
        : [...prev, { productId, quantity: safeQuantity }];

      localStorage.setItem('cartItems', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateCartItemQuantity = useCallback((productId: string, quantity: number) => {
    setCartItems((prev) => {
      const safeQuantity = Math.max(0, Math.floor(quantity));
      const updated =
        safeQuantity === 0
          ? prev.filter((item) => item.productId !== productId)
          : prev.map((item) =>
              item.productId === productId ? { ...item, quantity: safeQuantity } : item
            );

      localStorage.setItem('cartItems', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCartItems((prev) => {
      const updated = prev.filter((item) => item.productId !== productId);
      localStorage.setItem('cartItems', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.setItem('cartItems', JSON.stringify([]));
  }, []);

  const placeOrder = useCallback(
    async (product: Product, quantity: number, deliveryInput?: OrderDeliveryInput) => {
      if (!currentUser) {
        return undefined;
      }

      const productInState = products.find((item) => item.id === product.id);
      if (!productInState) {
        return;
      }

      const availableStock = normalizeStockValue(productInState.stock ?? productInState.quantity);
      if (availableStock <= 0) {
        return;
      }

      const safeQuantity = Math.max(1, Math.min(quantity, availableStock));
      const deliveryOption = deliveryInput?.option ?? 'delivery';

      const order: Order = {
        id: `order_${Date.now()}`,
        buyerId: currentUser.id,
        farmerId: productInState.farmerId,
        productId: productInState.id,
        productName: productInState.name,
        quantity: safeQuantity,
        totalPrice: productInState.price * safeQuantity,
        deliveryOption,
        deliveryStatus: deliveryOption === 'pickup' ? 'ready-for-pickup' : 'pending',
        deliveryAddress: deliveryOption === 'delivery' ? deliveryInput?.deliveryAddress?.trim() : undefined,
        pickupLocation: deliveryOption === 'pickup' ? deliveryInput?.pickupLocation?.trim() : undefined,
        status: 'pending',
        paymentMethod: deliveryInput?.paymentMethod,
        paymentStatus: deliveryInput?.paymentMethod === 'cod' ? 'pending' : 'paid',
        recipientName: deliveryInput?.recipientName?.trim() ?? currentUser.name,
        orderDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        buyerName: currentUser.name,
        farmerName: productInState.farmerName,
      };

      let savedOrder: Order;
      try {
        savedOrder = normalizeOrder(await api.createOrder(order));
      } catch (error) {
        console.error('Failed to persist order', error);
        return undefined;
      }

      setProducts((prev) => {
        const updated = prev.map((item) => {
          if (item.id !== productInState.id) {
            return item;
          }

          const currentStock = normalizeStockValue(item.stock ?? item.quantity);
          const nextStock = Math.max(0, currentStock - safeQuantity);

          return normalizeProduct({
            ...item,
            stock: nextStock,
            quantity: nextStock,
            available: nextStock > 0,
          });
        });

        localStorage.setItem('products', JSON.stringify(updated));
        return updated;
      });

      setOrders((prev) => {
        const updated = [...prev, savedOrder];
        localStorage.setItem('orders', JSON.stringify(updated));
        return updated;
      });

      const notificationTimestamp = new Date().toISOString();
      const buyerNotification: AppNotification = {
        id: `notification_${Date.now()}`,
        userId: currentUser.id,
        type: 'order',
        title: 'Order placed successfully',
        message: `Your ${deliveryOption} order for ${productInState.name} was placed successfully and is now pending approval.`,
        timestamp: notificationTimestamp,
        read: false,
        actionUrl: '/orders',
      };

      const farmerNotification: AppNotification = {
        id: `notification_${Date.now()}_farmer`,
        userId: productInState.farmerId,
        type: 'order',
        title: 'New order received',
        message: `${currentUser.name} placed a ${deliveryOption} order for ${safeQuantity} ${productInState.unit} of ${productInState.name}.`,
        timestamp: notificationTimestamp,
        read: false,
        actionUrl: '/orders',
      };

      addNotification(farmerNotification);
      if (currentUser.id !== productInState.farmerId) {
        addNotification(buyerNotification);
      }

      return savedOrder;
    },
    [addNotification, currentUser, products]
  );

  const checkoutCart = useCallback(
    async (checkout: CheckoutInput) => {
      if (!currentUser) {
        return { success: false, createdOrderIds: [], message: 'Please log in to checkout.' };
      }

      if (currentUser.role !== 'buyer') {
        return { success: false, createdOrderIds: [], message: 'Only buyers can checkout.' };
      }

      if (cartItems.length === 0) {
        return { success: false, createdOrderIds: [], message: 'Cart is empty.' };
      }

      if (!checkout.deliveryAddress.trim() || !checkout.contactPhone.trim()) {
        return { success: false, createdOrderIds: [], message: 'Delivery address and phone are required.' };
      }

      const createdOrderIds: string[] = [];
      try {
        for (const item of cartItems) {
          const product = products.find((entry) => entry.id === item.productId);
          if (!product) {
            continue;
          }

          const savedOrder = await placeOrder(product, item.quantity, {
            option: 'delivery',
            deliveryAddress: checkout.deliveryAddress.trim(),
            recipientName: checkout.recipientName?.trim(),
            paymentMethod: checkout.paymentMethod,
          });
          if (savedOrder) {
            createdOrderIds.push(savedOrder.id);
          }
        }
      } catch (error) {
        console.error('Checkout failed', error);
        return {
          success: false,
          createdOrderIds: [],
          message: 'Unable to place order right now. Please try again.',
        };
      }

      clearCart();

      addNotification({
        id: `notification_checkout_${Date.now()}`,
        userId: currentUser.id,
        type: 'order',
        title: 'Checkout confirmed',
        message: `Order confirmed with ${checkout.paymentMethod.toUpperCase()} payment.`,
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/orders',
      });

      return {
        success: true,
        createdOrderIds,
        message: 'Order confirmed successfully.',
      };
    },
    [addNotification, cartItems, clearCart, currentUser, placeOrder, products]
  );

  // Order operations
  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => {
      const updated = [...prev, normalizeOrder(order)];
      localStorage.setItem('orders', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateOrder = useCallback((id: string, updates: Partial<Order>) => {
    const existingOrder = orders.find((order) => order.id === id);

    if (currentUser && existingOrder && (updates.status || updates.deliveryStatus)) {
      addActivityLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'updated order status',
        targetType: 'order',
        targetId: id,
        details: `${existingOrder.productName}: ${updates.status ?? existingOrder.status}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Optimistic update locally so UI updates immediately
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === id ? normalizeOrder({ ...o, ...updates }) : o));
      localStorage.setItem('orders', JSON.stringify(updated));
      return updated;
    });

    // Persist change to backend (best-effort). Update local state with server response when available.
    void (async () => {
      try {
        const saved = await api.updateOrderApi(id, updates);
        setOrders((prev) => {
          const updated = prev.map((o) => (o.id === id ? normalizeOrder(saved) : o));
          localStorage.setItem('orders', JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        console.error('Failed to persist order update', err);
      }
    })();
  }, [addActivityLog, currentUser, orders]);

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => {
      const updated = prev.filter((o) => o.id !== id);
      localStorage.setItem('orders', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getOrderById = useCallback(
    (id: string) => orders.find((o) => o.id === id),
    [orders]
  );

  const getOrdersByBuyer = useCallback(
    (buyerId: string) => orders.filter((o) => o.buyerId === buyerId),
    [orders]
  );

  const getOrdersByFarmer = useCallback(
    (farmerId: string) => orders.filter((o) => o.farmerId === farmerId),
    [orders]
  );

  // Message operations
  const addMessage = useCallback((message: Message) => {
        const sender = users.find((entry) => entry.id === message.senderId);
        addActivityLog({
          userId: message.senderId,
          userName: sender?.name ?? message.senderName,
          userRole: sender?.role ?? 'buyer',
          action: 'sent message',
          targetType: 'message',
          targetId: message.id,
          details: `To ${message.recipientName}`,
        });
    setMessages((prev) => {
      const normalizedMessage = normalizeMessage(message);

      if (prev.some((existingMessage) => isSameMessage(existingMessage, normalizedMessage))) {
        return prev;
      }

      const updated = [...prev, normalizedMessage];
      localStorage.setItem('messages', JSON.stringify(updated));
      return updated;
    });

    void api.createMessage(message).catch((error) => {
      console.error('Failed to persist message', error);
    });

    addNotification({
      id: `notification_${Date.now()}_message`,
      userId: message.recipientId,
      type: 'message',
      title: `New message from ${message.senderName}`,
      message: message.content,
      timestamp: message.timestamp,
      read: false,
      actionUrl: '/messages',
    });
  }, [addActivityLog, addNotification, users]);

  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages((prev) => {
      const updated = prev.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        return normalizeMessage({ ...message, ...updates, id: message.id });
      });

      if (areMessageListsEqual(prev, updated)) {
        return prev;
      }

      localStorage.setItem('messages', JSON.stringify(updated));
      return updated;
    });

    void api.updateMessageApi(messageId, updates).catch((error) => {
      console.error('Failed to update message', error);
    });
  }, []);

  const getMessagesByUser = useCallback(
    (userId: string) =>
      messages.filter(
        (m) => m.senderId === userId || m.recipientId === userId
      ),
    [messages]
  );

  const getConversationMessages = useCallback(
    (userIdA: string, userIdB: string) =>
      messages.filter(
        (message) =>
          (message.senderId === userIdA && message.recipientId === userIdB) ||
          (message.senderId === userIdB && message.recipientId === userIdA)
      ),
    [messages]
  );

  const markMessagesAsRead = useCallback((messageIds: string[]) => {
    setMessages((prev) => {
      const targetIds = new Set(messageIds);
      const hasUnreadTargets = prev.some((message) => targetIds.has(message.id) && !message.read);

      if (!hasUnreadTargets) {
        return prev;
      }

      const updated = prev.map((m) =>
        targetIds.has(m.id) ? { ...m, read: true } : m
      );
      localStorage.setItem('messages', JSON.stringify(updated));
      return updated;
    });

    void Promise.all(messageIds.map((messageId) => api.updateMessageApi(messageId, { read: true }))).catch((error) => {
      console.error('Failed to persist read state', error);
    });
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => {
      const updated = prev.filter((message) => message.id !== messageId);

      if (updated.length === prev.length) {
        return prev;
      }

      localStorage.setItem('messages', JSON.stringify(updated));
      return updated;
    });

    void api.deleteMessageApi(messageId).catch((error) => {
      console.error('Failed to delete message', error);
    });
  }, []);

  const getUnreadMessageCount = useCallback(
    (userId: string) =>
      messages.filter((m) => m.recipientId === userId && !m.read).length,
    [messages]
  );

  const getNotificationsByUser = useCallback(
    (userId: string) => notifications.filter((notification) => notification.userId === userId),
    [notifications]
  );

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      );
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((notification) => notification.id !== notificationId);
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearNotificationsForUser = useCallback((userId: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((notification) => notification.userId !== userId);
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getUnreadNotificationCount = useCallback(
    (userId: string) => notifications.filter((notification) => notification.userId === userId && !notification.read).length,
    [notifications]
  );

  const getActivityLogsByUser = useCallback(
    (userId: string) => activityLogs.filter((log) => log.userId === userId),
    [activityLogs]
  );

  // Statistics
  const getTotalSpentByBuyer = useCallback(
    (buyerId: string) =>
      getOrdersByBuyer(buyerId)
        .filter((o) => o.status === 'delivered')
        .reduce((total, o) => total + o.totalPrice, 0),
    [getOrdersByBuyer]
  );

  const getOrderCountByBuyer = useCallback(
    (buyerId: string) => getOrdersByBuyer(buyerId).length,
    [getOrdersByBuyer]
  );

  const getFarmerRevenue = useCallback(
    (farmerId: string) =>
      getOrdersByFarmer(farmerId)
        .filter((o) => o.status === 'delivered')
        .reduce((total, o) => total + o.totalPrice, 0),
    [getOrdersByFarmer]
  );

  const getFarmerOrderCount = useCallback(
    (farmerId: string) => getOrdersByFarmer(farmerId).length,
    [getOrdersByFarmer]
  );

  const value: GlobalStateContextType = {
      // Activity logs
      activityLogs,
      addActivityLog,
      getActivityLogsByUser,
    // Auth
    currentUser,
    selectedRole,
    users,
    login,
    signup,
    logout,
    setCurrentUser,
    setSelectedRole,
    upsertUser,
    updateUser,
    deleteUser,
    blockUser,
    enableUser,

    // Products
    products,
    addProduct,
    updateProduct,
    addProductReview,
    deleteProduct,
    getProductById,
    getProductsByFarmer,

    // Buyer favorites and orders
    favoriteProductIds,
    toggleFavoriteProduct,
    isFavoriteProduct,
    cartItems,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    checkoutCart,
    placeOrder,

    // Orders
    orders,
    addOrder,
    updateOrder,
    deleteOrder,
    getOrderById,
    getOrdersByBuyer,
    getOrdersByFarmer,

    // Messages
    messages,
    addMessage,
    deleteMessage,
    updateMessage,
    getMessagesByUser,
    getConversationMessages,
    markMessagesAsRead,
    getUnreadMessageCount,

    // Notifications
    notifications,
    addNotification,
    getNotificationsByUser,
    markNotificationAsRead,
    deleteNotification,
    clearNotificationsForUser,
    getUnreadNotificationCount,

    // Statistics
    getTotalSpentByBuyer,
    getOrderCountByBuyer,
    getFarmerRevenue,
    getFarmerOrderCount,
  };

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = (): GlobalStateContextType => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error(
      'useGlobalState must be used within a GlobalStateProvider'
    );
  }
  return context;
};
