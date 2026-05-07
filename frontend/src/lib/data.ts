// Dummy data for Harvest Connect Mobile App

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'farmer' | 'buyer' | 'admin';
  location: string;
  avatar?: string;
  phone?: string;
  joinedDate: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  quantity: number;
  farmerId: string;
  farmerName: string;
  location: string;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  available: boolean;
  harvestDate: string;
  createdAt?: string;
  reviewEntries?: ProductReview[];
}

export interface ProductReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  timestamp: string;
  verified: boolean;
  helpful: number;
  notHelpful: number;
  images?: string[];
  purchaseVerified?: boolean;
}

export interface Order {
  id: string;
  buyerId: string;
  farmerId: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  deliveryOption: 'pickup' | 'delivery';
  deliveryStatus: 'pending' | 'ready-for-pickup' | 'out-for-delivery' | 'delivered' | 'cancelled';
  deliveryAddress?: string;
  pickupLocation?: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: string;
  deliveryDate?: string;
  buyerName: string;
  farmerName: string;
}

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

// Dummy Users
export const dummyUsers: User[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@farmdirect.in',
    role: 'farmer',
    location: 'Nashik, Maharashtra',
    phone: '+91 98100 10001',
    joinedDate: '2023-01-15'
  },
  {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya.sharma@freshbasket.in',
    role: 'buyer',
    location: 'South Delhi, Delhi',
    phone: '+91 98100 10002',
    joinedDate: '2023-02-20'
  },
  {
    id: '3',
    name: 'Amit Singh',
    email: 'amit.singh@harvestlane.in',
    role: 'farmer',
    location: 'Ludhiana, Punjab',
    phone: '+91 98100 10003',
    joinedDate: '2023-03-10'
  },
  {
    id: '4',
    name: 'Sneha Patel',
    email: 'sneha.patel@kitchenkart.in',
    role: 'buyer',
    location: 'Ahmedabad, Gujarat',
    phone: '+91 98100 10004',
    joinedDate: '2023-04-05'
  },
  {
    id: '5',
    name: 'Ananya Iyer',
    email: 'admin@farmdirect.example.com',
    role: 'admin',
    location: 'Bengaluru, Karnataka',
    phone: '+91 98100 10005',
    joinedDate: '2023-05-01'
  },
  {
    id: '6',
    name: 'Karthik Nair',
    email: 'karthik.nair@coastalgreens.in',
    role: 'farmer',
    location: 'Kochi, Kerala',
    phone: '+91 98100 10006',
    joinedDate: '2023-08-22'
  },
  {
    id: '7',
    name: 'Meera Joshi',
    email: 'meera.joshi@urbanplate.in',
    role: 'buyer',
    location: 'Pune, Maharashtra',
    phone: '+91 98100 10007',
    joinedDate: '2023-09-14'
  },
  {
    id: '8',
    name: 'Rohan Verma',
    email: 'rohan.verma@dailyfresh.in',
    role: 'buyer',
    location: 'Noida, Uttar Pradesh',
    phone: '+91 98100 10008',
    joinedDate: '2023-11-02'
  }
];

// Dummy Products
export const dummyProducts: Product[] = [
  {
    id: '1',
    name: 'Organic Tomatoes',
    description: 'Vine-ripened organic tomatoes picked in the early morning and packed the same day.',
    price: 36,
    unit: 'kg',
    stock: 48,
    quantity: 48,
    farmerId: '1',
    farmerName: 'Rajesh Kumar',
    location: 'Nashik, Maharashtra',
    category: 'vegetables',
    image: '🍅',
    rating: 4.8,
    reviews: 32,
    available: true,
    harvestDate: '2026-03-18',
    createdAt: '2026-03-18T06:20:00.000Z'
  },
  {
    id: '2',
    name: 'Fresh Carrots',
    description: 'Sweet, crisp carrots washed and graded for retail and restaurant supply.',
    price: 24,
    unit: 'kg',
    stock: 72,
    quantity: 72,
    farmerId: '3',
    farmerName: 'Amit Singh',
    location: 'Ludhiana, Punjab',
    category: 'vegetables',
    image: '🥕',
    rating: 4.9,
    reviews: 28,
    available: true,
    harvestDate: '2026-03-17',
    createdAt: '2026-03-17T07:15:00.000Z'
  },
  {
    id: '3',
    name: 'Baby Spinach',
    description: 'Tender spinach bundles harvested before sunrise and packed in chilled crates.',
    price: 18,
    unit: 'kg',
    stock: 34,
    quantity: 34,
    farmerId: '1',
    farmerName: 'Rajesh Kumar',
    location: 'Nashik, Maharashtra',
    category: 'organic',
    image: '🥬',
    rating: 4.7,
    reviews: 21,
    available: true,
    harvestDate: '2026-03-19',
    createdAt: '2026-03-19T05:55:00.000Z'
  },
  {
    id: '4',
    name: 'Premium Basmati Rice',
    description: 'Aged basmati rice with long grains and a fragrant aroma, packed in 5 kg sacks.',
    price: 92,
    unit: 'kg',
    stock: 120,
    quantity: 120,
    farmerId: '3',
    farmerName: 'Amit Singh',
    location: 'Ludhiana, Punjab',
    category: 'grains',
    image: '🌾',
    rating: 4.6,
    reviews: 40,
    available: true,
    harvestDate: '2026-02-28',
    createdAt: '2026-02-28T09:00:00.000Z'
  },
  {
    id: '5',
    name: 'Alphonso Mangoes',
    description: 'Premium Alphonso mangoes from Ratnagiri, hand-selected for sweetness and size.',
    price: 180,
    unit: 'kg',
    stock: 0,
    quantity: 0,
    farmerId: '1',
    farmerName: 'Rajesh Kumar',
    location: 'Nashik, Maharashtra',
    category: 'fruits',
    image: '🥭',
    rating: 4.9,
    reviews: 58,
    available: false,
    harvestDate: '2026-03-11',
    createdAt: '2026-03-10T10:30:00.000Z'
  },
  {
    id: '6',
    name: 'Wildflower Honey',
    description: 'Raw wildflower honey bottled in small batches with no added sugar or heating.',
    price: 250,
    unit: 'jar',
    stock: 38,
    quantity: 38,
    farmerId: '3',
    farmerName: 'Amit Singh',
    location: 'Ludhiana, Punjab',
    category: 'honey',
    image: '🍯',
    rating: 4.8,
    reviews: 19,
    available: true,
    harvestDate: '2026-03-12',
    createdAt: '2026-03-12T08:45:00.000Z'
  },
  {
    id: '7',
    name: 'Coconut Water (Tender)',
    description: 'Naturally sweet tender coconuts sourced fresh from coastal farms.',
    price: 45,
    unit: 'piece',
    stock: 90,
    quantity: 90,
    farmerId: '6',
    farmerName: 'Karthik Nair',
    location: 'Kochi, Kerala',
    category: 'fruits',
    image: '🥥',
    rating: 4.7,
    reviews: 26,
    available: true,
    harvestDate: '2026-03-20',
    createdAt: '2026-03-20T06:30:00.000Z'
  },
  {
    id: '8',
    name: 'A2 Cow Milk',
    description: 'Fresh morning milking from free-range cows, chilled and packed safely.',
    price: 68,
    unit: 'liter',
    stock: 65,
    quantity: 65,
    farmerId: '6',
    farmerName: 'Karthik Nair',
    location: 'Kochi, Kerala',
    category: 'dairy',
    image: '🥛',
    rating: 4.8,
    reviews: 34,
    available: true,
    harvestDate: '2026-03-21',
    createdAt: '2026-03-21T04:40:00.000Z'
  },
  {
    id: '9',
    name: 'Red Onions',
    description: 'Sorted and graded red onions with uniform size and longer shelf life.',
    price: 28,
    unit: 'kg',
    stock: 110,
    quantity: 110,
    farmerId: '1',
    farmerName: 'Rajesh Kumar',
    location: 'Nashik, Maharashtra',
    category: 'vegetables',
    image: '🧅',
    rating: 4.6,
    reviews: 17,
    available: true,
    harvestDate: '2026-03-16',
    createdAt: '2026-03-16T07:50:00.000Z'
  },
  {
    id: '10',
    name: 'Pearl Millet (Bajra)',
    description: 'Stone-cleaned pearl millet grains ideal for rotis and porridge.',
    price: 54,
    unit: 'kg',
    stock: 74,
    quantity: 74,
    farmerId: '3',
    farmerName: 'Amit Singh',
    location: 'Ludhiana, Punjab',
    category: 'grains',
    image: '🌾',
    rating: 4.5,
    reviews: 13,
    available: true,
    harvestDate: '2026-03-14',
    createdAt: '2026-03-14T09:20:00.000Z'
  },
];

// Dummy Orders
export const dummyOrders: Order[] = [
  {
    id: '1',
    buyerId: '2',
    farmerId: '1',
    productId: '1',
    productName: 'Organic Tomatoes',
    quantity: 8,
    totalPrice: 288,
    deliveryOption: 'delivery',
    deliveryStatus: 'delivered',
    deliveryAddress: 'South Delhi, Delhi',
    status: 'delivered',
    orderDate: '2026-03-12',
    deliveryDate: '2026-03-13',
    buyerName: 'Priya Sharma',
    farmerName: 'Rajesh Kumar'
  },
  {
    id: '2',
    buyerId: '4',
    farmerId: '3',
    productId: '4',
    productName: 'Premium Basmati Rice',
    quantity: 12,
    totalPrice: 1104,
    deliveryOption: 'delivery',
    deliveryStatus: 'out-for-delivery',
    deliveryAddress: 'Ahmedabad, Gujarat',
    status: 'shipped',
    orderDate: '2026-03-15',
    deliveryDate: '2026-03-19',
    buyerName: 'Sneha Patel',
    farmerName: 'Amit Singh'
  },
  {
    id: '3',
    buyerId: '2',
    farmerId: '1',
    productId: '3',
    productName: 'Baby Spinach',
    quantity: 6,
    totalPrice: 108,
    deliveryOption: 'pickup',
    deliveryStatus: 'ready-for-pickup',
    pickupLocation: 'Nashik, Maharashtra Farm Gate',
    status: 'accepted',
    orderDate: '2026-03-18',
    buyerName: 'Priya Sharma',
    farmerName: 'Rajesh Kumar'
  },
  {
    id: '4',
    buyerId: '4',
    farmerId: '3',
    productId: '2',
    productName: 'Fresh Carrots',
    quantity: 5,
    totalPrice: 120,
    deliveryOption: 'delivery',
    deliveryStatus: 'pending',
    deliveryAddress: 'Ahmedabad, Gujarat',
    status: 'pending',
    orderDate: '2026-03-19',
    buyerName: 'Sneha Patel',
    farmerName: 'Amit Singh'
  },
  {
    id: '5',
    buyerId: '2',
    farmerId: '1',
    productId: '5',
    productName: 'Alphonso Mangoes',
    quantity: 4,
    totalPrice: 720,
    deliveryOption: 'pickup',
    deliveryStatus: 'ready-for-pickup',
    pickupLocation: 'Nashik, Maharashtra Farm Gate',
    status: 'confirmed',
    orderDate: '2026-03-11',
    deliveryDate: '2026-03-14',
    buyerName: 'Priya Sharma',
    farmerName: 'Rajesh Kumar'
  },
  {
    id: '6',
    buyerId: '4',
    farmerId: '3',
    productId: '6',
    productName: 'Wildflower Honey',
    quantity: 2,
    totalPrice: 500,
    deliveryOption: 'delivery',
    deliveryStatus: 'delivered',
    deliveryAddress: 'Ahmedabad, Gujarat',
    status: 'delivered',
    orderDate: '2026-03-08',
    deliveryDate: '2026-03-10',
    buyerName: 'Sneha Patel',
    farmerName: 'Amit Singh'
  },
  {
    id: '7',
    buyerId: '7',
    farmerId: '6',
    productId: '8',
    productName: 'A2 Cow Milk',
    quantity: 5,
    totalPrice: 340,
    deliveryOption: 'delivery',
    deliveryStatus: 'pending',
    deliveryAddress: 'Kothrud, Pune, Maharashtra',
    status: 'pending',
    orderDate: '2026-03-21',
    buyerName: 'Meera Joshi',
    farmerName: 'Karthik Nair'
  },
  {
    id: '8',
    buyerId: '8',
    farmerId: '1',
    productId: '9',
    productName: 'Red Onions',
    quantity: 10,
    totalPrice: 280,
    deliveryOption: 'pickup',
    deliveryStatus: 'ready-for-pickup',
    pickupLocation: 'Nashik, Maharashtra Farm Gate',
    status: 'confirmed',
    orderDate: '2026-03-20',
    buyerName: 'Rohan Verma',
    farmerName: 'Rajesh Kumar'
  },
  {
    id: '9',
    buyerId: '2',
    farmerId: '3',
    productId: '10',
    productName: 'Pearl Millet (Bajra)',
    quantity: 3,
    totalPrice: 162,
    deliveryOption: 'delivery',
    deliveryStatus: 'cancelled',
    deliveryAddress: 'South Delhi, Delhi',
    status: 'cancelled',
    orderDate: '2026-03-17',
    buyerName: 'Priya Sharma',
    farmerName: 'Amit Singh'
  },
  {
    id: '10',
    buyerId: '7',
    farmerId: '1',
    productId: '1',
    productName: 'Organic Tomatoes',
    quantity: 7,
    totalPrice: 252,
    deliveryOption: 'delivery',
    deliveryStatus: 'delivered',
    deliveryAddress: 'Baner, Pune, Maharashtra',
    status: 'delivered',
    orderDate: '2026-03-09',
    deliveryDate: '2026-03-10',
    buyerName: 'Meera Joshi',
    farmerName: 'Rajesh Kumar'
  }
];

// Dummy Messages
export const dummyMessages: Message[] = [
  {
    id: 'message_1',
    senderId: '2',
    senderName: 'Priya Sharma',
    recipientId: '1',
    recipientName: 'Rajesh Kumar',
    content: 'Hi Rajesh ji, can you confirm if my spinach pickup is ready by 5 PM?',
    timestamp: '2026-03-20T09:10:00.000Z',
    read: true
  },
  {
    id: 'message_2',
    senderId: '1',
    senderName: 'Rajesh Kumar',
    recipientId: '2',
    recipientName: 'Priya Sharma',
    content: 'Yes, your order is packed and waiting at the farm gate counter.',
    timestamp: '2026-03-20T09:18:00.000Z',
    read: true
  },
  {
    id: 'message_3',
    senderId: '4',
    senderName: 'Sneha Patel',
    recipientId: '3',
    recipientName: 'Amit Singh',
    content: 'Please share ETA for the basmati rice order to Ahmedabad.',
    timestamp: '2026-03-20T11:22:00.000Z',
    read: false
  },
  {
    id: 'message_4',
    senderId: '3',
    senderName: 'Amit Singh',
    recipientId: '4',
    recipientName: 'Sneha Patel',
    content: 'It is out for delivery and should reach by tomorrow afternoon.',
    timestamp: '2026-03-20T11:35:00.000Z',
    read: false
  },
  {
    id: 'message_5',
    senderId: '7',
    senderName: 'Meera Joshi',
    recipientId: '6',
    recipientName: 'Karthik Nair',
    content: 'Can I get 2 extra liters of milk added to today\'s order?',
    timestamp: '2026-03-21T05:40:00.000Z',
    read: false
  },
  {
    id: 'message_6',
    senderId: '6',
    senderName: 'Karthik Nair',
    recipientId: '7',
    recipientName: 'Meera Joshi',
    content: 'Sure, I have updated your order quantity and total accordingly.',
    timestamp: '2026-03-21T05:52:00.000Z',
    read: false
  },
  {
    id: 'message_7',
    senderId: '8',
    senderName: 'Rohan Verma',
    recipientId: '1',
    recipientName: 'Rajesh Kumar',
    content: 'I will arrive for pickup around 7 PM. Please keep the onions ready.',
    timestamp: '2026-03-21T08:05:00.000Z',
    read: false
  },
  {
    id: 'message_8',
    senderId: '1',
    senderName: 'Rajesh Kumar',
    recipientId: '8',
    recipientName: 'Rohan Verma',
    content: 'Noted. Pickup token #RV108 is generated for your order.',
    timestamp: '2026-03-21T08:10:00.000Z',
    read: false
  }
];

// Helper functions for data simulation
export const getUserById = (id: string): User | undefined => {
  return dummyUsers.find(user => user.id === id);
};

export const getProductsByFarmer = (farmerId: string): Product[] => {
  return dummyProducts.filter(product => product.farmerId === farmerId);
};

export const getOrdersByBuyer = (buyerId: string): Order[] => {
  return dummyOrders.filter(order => order.buyerId === buyerId);
};

export const getOrdersByFarmer = (farmerId: string): Order[] => {
  return dummyOrders.filter(order => order.farmerId === farmerId);
};

export const getAvailableProducts = (): Product[] => {
  return dummyProducts.filter(product => product.stock > 0);
};

export const getTotalSpentByBuyer = (buyerId: string): number => {
  return getOrdersByBuyer(buyerId)
    .filter(order => order.status === 'delivered')
    .reduce((total, order) => total + order.totalPrice, 0);
};

export const getOrderCountByBuyer = (buyerId: string): number => {
  return getOrdersByBuyer(buyerId).length;
};