const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activityLogs.json');

function ensureDataDir(){
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
}

function loadData(filePath){
  if (!fs.existsSync(filePath)) return [];
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]'); } catch { return []; }
}

function saveData(filePath, data){
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

ensureDataDir();

let users = loadData(USERS_FILE);
let products = loadData(PRODUCTS_FILE);
let orders = loadData(ORDERS_FILE);
let activityLogs = loadData(ACTIVITY_FILE);

// Environment / config
const PORT = process.env.PORT || 4000;
const AUTO_WISH_ENABLED = (process.env.AUTO_WISH_ENABLED || 'false').toLowerCase() === 'true';
const AUTO_WISH_HOUR = Number(process.env.AUTO_WISH_HOUR || 9);
const AUTO_WISH_MINUTE = Number(process.env.AUTO_WISH_MINUTE || 0);
const AUTO_WISH_MESSAGE = process.env.AUTO_WISH_MESSAGE || 'Good morning from Farm Direct! Have a great day.';

if (users.length === 0) {
  users.push({
    id: 'admin_primary',
    name: 'Platform Admin',
    email: 'admin@platform.local',
    role: 'admin',
    location: 'HQ',
    phone: '',
    isActive: true,
    joinedDate: new Date().toISOString(),
  });
  saveData(USERS_FILE, users);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/users', (req, res) => res.json(users));
app.post('/api/users', (req, res) => {
  const user = { id: uuidv4(), ...req.body, isActive: true, joinedDate: new Date().toISOString() };
  users.push(user);
  saveData(USERS_FILE, users);
  activityLogs.unshift({ id: uuidv4(), userId: user.id, userName: user.name, userRole: user.role, action: 'registered account', timestamp: new Date().toISOString() });
  saveData(ACTIVITY_FILE, activityLogs);
  res.status(201).json(user);
});
app.put('/api/users/:id', (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'User not found' });
  users[idx] = { ...users[idx], ...req.body };
  saveData(USERS_FILE, users);
  res.json(users[idx]);
});

app.get('/api/products', (req, res) => res.json(products));
app.post('/api/products', (req, res) => {
  const product = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  products.push(product);
  saveData(PRODUCTS_FILE, products);
  activityLogs.unshift({ id: uuidv4(), userId: product.farmerId, userName: product.farmerName, userRole: 'farmer', action: 'uploaded product', targetId: product.id, targetType: 'product', timestamp: new Date().toISOString() });
  saveData(ACTIVITY_FILE, activityLogs);
  res.status(201).json(product);
});
app.put('/api/products/:id', (req, res) => {
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Product not found' });
  products[idx] = { ...products[idx], ...req.body };
  saveData(PRODUCTS_FILE, products);
  res.json(products[idx]);
});

app.post('/api/products/:id/reviews', (req, res) => {
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Product not found' });

  const currentProduct = products[idx];
  const review = {
    id: uuidv4(),
    userId: req.body.userId,
    userName: req.body.userName,
    rating: Number(req.body.rating) || 0,
    title: req.body.title || 'Buyer review',
    content: req.body.content || '',
    timestamp: req.body.timestamp || new Date().toISOString(),
    verified: req.body.verified ?? true,
    helpful: Number(req.body.helpful) || 0,
    notHelpful: Number(req.body.notHelpful) || 0,
    images: Array.isArray(req.body.images) ? req.body.images : [],
    purchaseVerified: req.body.purchaseVerified ?? true,
  };

  const existingReviews = Array.isArray(currentProduct.reviewEntries) ? currentProduct.reviewEntries : [];
  const existingCount = Number(currentProduct.reviews) || existingReviews.length;
  const existingRating = Number(currentProduct.rating) || 0;
  const nextCount = existingCount + 1;
  const nextRating = nextCount > 0 ? ((existingRating * existingCount) + review.rating) / nextCount : review.rating;

  products[idx] = {
    ...currentProduct,
    rating: Number(nextRating.toFixed(2)),
    reviews: nextCount,
    reviewEntries: [review, ...existingReviews],
  };

  saveData(PRODUCTS_FILE, products);

  res.status(201).json(products[idx]);
});
app.delete('/api/products/:id', (req, res) => {
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Product not found' });
  const removed = products.splice(idx, 1)[0];
  saveData(PRODUCTS_FILE, products);
  activityLogs.unshift({ id: uuidv4(), userId: removed.farmerId, userName: removed.farmerName, userRole: 'farmer', action: 'deleted product', targetId: removed.id, targetType: 'product', timestamp: new Date().toISOString() });
  saveData(ACTIVITY_FILE, activityLogs);
  res.json({ success: true });
});

app.get('/api/orders', (req, res) => res.json(orders));
app.post('/api/orders', (req, res) => {
  const order = { id: uuidv4(), ...req.body, orderDate: new Date().toISOString(), status: 'pending', deliveryStatus: 'pending' };
  orders.push(order);
  saveData(ORDERS_FILE, orders);
  activityLogs.unshift({ id: uuidv4(), userId: order.buyerId, userName: order.buyerName, userRole: 'buyer', action: 'placed order', targetId: order.id, targetType: 'order', timestamp: new Date().toISOString() });
  saveData(ACTIVITY_FILE, activityLogs);
  res.status(201).json(order);
});

app.get('/api/activity', (req,res)=> res.json(activityLogs));
app.post('/api/activity', (req,res)=>{
  const entry = { id: uuidv4(), ...req.body, timestamp: req.body.timestamp ?? new Date().toISOString() };
  activityLogs.unshift(entry);
  saveData(ACTIVITY_FILE, activityLogs);
  res.status(201).json(entry);
});

// Helper: send wish to a set of users (or all active users)
function sendWish(message, targetUserIds) {
  const targets = Array.isArray(targetUserIds) && targetUserIds.length > 0
    ? users.filter(u => targetUserIds.includes(u.id))
    : users.filter(u => u.isActive);

  const entries = [];
  targets.forEach(u => {
    const e = {
      id: uuidv4(),
      userId: u.id,
      userName: u.name,
      userRole: u.role,
      action: 'auto wish',
      message,
      channel: 'in-app',
      timestamp: new Date().toISOString(),
    };
    activityLogs.unshift(e);
    entries.push(e);
  });
  saveData(ACTIVITY_FILE, activityLogs);
  return entries;
}

// API: trigger an immediate wish (POST body: { message?, userIds? })
app.post('/api/wish/send-now', (req, res) => {
  const message = typeof req.body?.message === 'string' && req.body.message.trim().length > 0 ? req.body.message : AUTO_WISH_MESSAGE;
  const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : null;
  const entries = sendWish(message, userIds);
  res.json({ sent: entries.length, entries });
});

// Scheduler: compute milliseconds until next scheduled hour/minute
function msUntilNext(hour, minute) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

function scheduleAutoWish() {
  if (!AUTO_WISH_ENABLED) return;
  const delay = msUntilNext(AUTO_WISH_HOUR, AUTO_WISH_MINUTE);
  console.log(`Auto-wish: scheduled first run in ${Math.round(delay/1000)}s at ${AUTO_WISH_HOUR}:${String(AUTO_WISH_MINUTE).padStart(2,'0')}`);
  setTimeout(() => {
    try {
      const sent = sendWish(AUTO_WISH_MESSAGE);
      console.log(`Auto-wish: sent ${sent.length} wishes at ${new Date().toISOString()}`);
    } catch (err) {
      console.error('Auto-wish error:', err);
    }
    // schedule subsequent runs every 24h
    setInterval(() => {
      try {
        const sent = sendWish(AUTO_WISH_MESSAGE);
        console.log(`Auto-wish: sent ${sent.length} wishes at ${new Date().toISOString()}`);
      } catch (err) { console.error('Auto-wish error:', err); }
    }, 24 * 60 * 60 * 1000);
  }, delay);
}

// Start scheduler after server boots
scheduleAutoWish();

// Root route - API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Farm Direct API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      users: {
        list: 'GET /api/users',
        create: 'POST /api/users',
        update: 'PUT /api/users/:id'
      },
      products: {
        list: 'GET /api/products',
        create: 'POST /api/products',
        update: 'PUT /api/products/:id',
        delete: 'DELETE /api/products/:id',
        addReview: 'POST /api/products/:id/reviews'
      },
      orders: {
        list: 'GET /api/orders',
        create: 'POST /api/orders'
      },
      activity: {
        list: 'GET /api/activity',
        create: 'POST /api/activity'
      },
      wish: {
        sendNow: 'POST /api/wish/send-now'
      }
    }
  });
});

app.use((_,res)=>res.status(404).json({error:'Not found'}));
app.listen(PORT, ()=>console.log(`API server running at http://localhost:${PORT}`));
