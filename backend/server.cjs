const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
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

function normalizeMessage(message) {
  return {
    ...message,
    id: String(message.id || uuidv4()),
    senderId: String(message.senderId || ''),
    senderName: String(message.senderName || ''),
    recipientId: String(message.recipientId || ''),
    recipientName: String(message.recipientName || ''),
    content: String(message.content || ''),
    timestamp: message.timestamp || new Date().toISOString(),
    read: Boolean(message.read),
  };
}

ensureDataDir();

let users = loadData(USERS_FILE);
let products = loadData(PRODUCTS_FILE);
let orders = loadData(ORDERS_FILE);
let messages = loadData(MESSAGES_FILE).map(normalizeMessage);
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

// Notifications persistence
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
function loadNotifications() {
  try { return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8') || '[]'); } catch { return []; }
}
function saveNotifications(data){ fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(data, null, 2)); }
let notifications = loadNotifications();

app.get('/api/users', (req, res) => res.json(users));
app.post('/api/users', (req, res) => {
  // Handle password hashing if provided
  const incoming = { ...req.body };
  const plainPassword = typeof incoming.password === 'string' ? incoming.password : undefined;
  delete incoming.password;

  const user = { id: uuidv4(), ...incoming, isActive: true, joinedDate: new Date().toISOString() };

  if (plainPassword) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
    user.passwordSalt = salt;
    user.passwordHash = derived;
  }

  users.push(user);
  saveData(USERS_FILE, users);
  activityLogs.unshift({ id: uuidv4(), userId: user.id, userName: user.name, userRole: user.role, action: 'registered account', timestamp: new Date().toISOString() });
  saveData(ACTIVITY_FILE, activityLogs);
  // Never return passwordHash/salt in responses
  const safe = { ...user };
  delete safe.passwordHash;
  delete safe.passwordSalt;
  res.status(201).json(safe);
});
app.put('/api/users/:id', (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'User not found' });
  // Allow password change via PUT (hash securely)
  const updates = { ...req.body };
  if (typeof updates.password === 'string' && updates.password.length > 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(updates.password, salt, 64).toString('hex');
    updates.passwordSalt = salt;
    updates.passwordHash = derived;
    delete updates.password;
  }

  users[idx] = { ...users[idx], ...updates };
  saveData(USERS_FILE, users);
  const safe = { ...users[idx] };
  delete safe.passwordHash;
  delete safe.passwordSalt;
  res.json(safe);
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

  // Create notification for farmer
  const notif = {
    id: uuidv4(),
    userId: currentProduct.farmerId,
    type: 'review',
    title: 'New Product Review',
    message: `${req.body.userName} reviewed your product "${currentProduct.name}" with ${review.rating} stars`,
    timestamp: new Date().toISOString(),
    read: false,
    actionUrl: `/product/${currentProduct.id}`,
  };
  notifications.push(notif);
  saveNotifications(notifications);
  if (io) io.to(`user_${currentProduct.farmerId}`).emit('notification:new', notif);

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
  const order = {
    id: uuidv4(),
    ...req.body,
    orderDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    status: 'pending',
    deliveryStatus: 'pending',
    paymentStatus: req.body.paymentStatus || (req.body.paymentMethod === 'cod' ? 'pending' : 'paid'),
  };
  orders.push(order);
  saveData(ORDERS_FILE, orders);
  activityLogs.unshift({ id: uuidv4(), userId: order.buyerId, userName: order.buyerName, userRole: 'buyer', action: 'placed order', targetId: order.id, targetType: 'order', timestamp: new Date().toISOString() });
  saveData(ACTIVITY_FILE, activityLogs);
  // Notify farmer
  try {
    const notif = {
      id: uuidv4(),
      userId: order.farmerId,
      type: 'order',
      title: 'New order received',
      message: `${order.buyerName} placed an order for ${order.productName}`,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: '/orders'
    };
    notifications.unshift(notif);
    saveNotifications(notifications);
    if (io) io.to(`user_${order.farmerId}`).emit('notification:new', notif);
    if (io) io.to(`user_${order.farmerId}`).emit('order:placed', order);
  } catch(e) {}
  res.status(201).json(order);
});

// Messages
app.get('/api/messages', (req, res) => res.json(messages));
app.post('/api/messages', (req, res) => {
  const incoming = normalizeMessage(req.body || {});
  const sender = users.find((entry) => entry.id === incoming.senderId);
  const idx = messages.findIndex((entry) => entry.id === incoming.id);

  if (idx >= 0) {
    messages[idx] = { ...messages[idx], ...incoming };
    saveData(MESSAGES_FILE, messages);
    return res.status(200).json(messages[idx]);
  }

  messages.push(incoming);
  saveData(MESSAGES_FILE, messages);
  activityLogs.unshift({
    id: uuidv4(),
    userId: incoming.senderId,
    userName: incoming.senderName,
    userRole: sender?.role || 'buyer',
    action: 'sent message',
    targetId: incoming.id,
    targetType: 'message',
    details: `To ${incoming.recipientName}`,
    timestamp: new Date().toISOString(),
  });
  saveData(ACTIVITY_FILE, activityLogs);
  // Create a notification for recipient
  try {
    const notif = {
      id: uuidv4(),
      userId: incoming.recipientId,
      type: 'message',
      title: `New message from ${incoming.senderName}`,
      message: incoming.content.substring(0, 240),
      timestamp: incoming.timestamp || new Date().toISOString(),
      read: false,
      actionUrl: '/messages'
    };
    notifications.unshift(notif);
    saveNotifications(notifications);
    if (io) io.to(`user_${incoming.recipientId}`).emit('notification:new', notif);
    if (io) io.to(`user_${incoming.recipientId}`).emit('message:new', incoming);
  } catch (e) {}

  res.status(201).json(incoming);
});
app.put('/api/messages/:id', (req, res) => {
  const idx = messages.findIndex((entry) => entry.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Message not found' });

  messages[idx] = normalizeMessage({ ...messages[idx], ...req.body, id: messages[idx].id });
  saveData(MESSAGES_FILE, messages);
  res.json(messages[idx]);
});
app.delete('/api/messages/:id', (req, res) => {
  const idx = messages.findIndex((entry) => entry.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Message not found' });

  const removed = messages.splice(idx, 1)[0];
  const sender = users.find((entry) => entry.id === removed.senderId);
  saveData(MESSAGES_FILE, messages);
  activityLogs.unshift({
    id: uuidv4(),
    userId: removed.senderId,
    userName: removed.senderName,
    userRole: sender?.role || 'buyer',
    action: 'deleted message',
    targetId: removed.id,
    targetType: 'message',
    details: `To ${removed.recipientName}`,
    timestamp: new Date().toISOString(),
  });
  saveData(ACTIVITY_FILE, activityLogs);
  res.json({ success: true });
});

// Auth: login
app.post('/api/auth/login', (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';
  const user = users.find((u) => (u.email || '').trim().toLowerCase() === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.passwordHash || !user.passwordSalt) {
    return res.status(401).json({ error: 'No password set for this account' });
  }

  try {
    const derived = crypto.scryptSync(password, user.passwordSalt, 64).toString('hex');
    if (derived !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Unable to verify credentials' });
  }

  // Successful login - return sanitized user
  const safe = { ...user };
  delete safe.passwordHash;
  delete safe.passwordSalt;
  delete safe.resetPasswordHash;
  delete safe.resetPasswordExpiry;

  activityLogs.unshift({ id: uuidv4(), userId: user.id, userName: user.name, userRole: user.role, action: 'logged in', targetType: 'auth', timestamp: new Date().toISOString() });
  saveData(ACTIVITY_FILE, activityLogs);

  res.json(safe);
});

// Auth: request password reset
app.post('/api/auth/forgot', async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = users.find((u) => (u.email || '').trim().toLowerCase() === email);

  // Always respond success to avoid user enumeration
  if (!user) {
    return res.json({ success: true });
  }

  // Generate token and store its hash
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordHash = tokenHash;
  user.resetPasswordExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
  saveData(USERS_FILE, users);

  const frontendBase = process.env.FRONTEND_BASE || 'http://localhost:8080';
  const resetLink = `${frontendBase.replace(/\/$/, '')}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  // Try to send email via nodemailer if configured, otherwise log
  let emailed = false;
  try {
    const smtpHost = process.env.SMTP_HOST;
    if (smtpHost) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: (process.env.SMTP_SECURE || 'false') === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'no-reply@farm-direct.local',
        to: email,
        subject: 'Password reset request',
        text: `You requested a password reset. Use this link to reset your password (valid for 1 hour): ${resetLink}`,
        html: `<p>You requested a password reset. Click the link below to reset your password (valid for 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      };

      await transporter.sendMail(mailOptions);
      emailed = true;
    }
  } catch (e) {
    console.warn('Failed to send reset email via SMTP, falling back to console log', e && e.message ? e.message : e);
  }

  if (!emailed) {
    console.log(`Password reset link for ${email}: ${resetLink}`);
  }

  // In debug mode optionally return reset link (do not enable in production)
  if ((process.env.DEBUG_PASSWORD_RESET || '').toLowerCase() === 'true') {
    return res.json({ success: true, debugLink: resetLink });
  }

  res.json({ success: true });
});

// Auth: reset password using token
app.post('/api/auth/reset', (req, res) => {
  const { email, token, password } = req.body || {};
  if (!email || !token || !password) {
    return res.status(400).json({ error: 'Email, token and new password are required' });
  }

  const user = users.find((u) => (u.email || '').trim().toLowerCase() === String(email).trim().toLowerCase());
  if (!user || !user.resetPasswordHash || !user.resetPasswordExpiry) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }

  if (Date.now() > Number(user.resetPasswordExpiry)) {
    return res.status(400).json({ error: 'Token has expired' });
  }

  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  if (tokenHash !== user.resetPasswordHash) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  // Set new password
  try {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
    user.passwordSalt = salt;
    user.passwordHash = derived;
    delete user.resetPasswordHash;
    delete user.resetPasswordExpiry;
    saveData(USERS_FILE, users);

    activityLogs.unshift({ id: uuidv4(), userId: user.id, userName: user.name, userRole: user.role, action: 'reset password', targetType: 'auth', timestamp: new Date().toISOString() });
    saveData(ACTIVITY_FILE, activityLogs);

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Unable to set new password' });
  }
});

// Update an order (partial updates allowed)
app.put('/api/orders/:id', (req, res) => {
  const idx = orders.findIndex((o) => o.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Order not found' });

  // Merge updates
  const oldStatus = orders[idx].status;
  orders[idx] = { ...orders[idx], ...req.body };
  const newStatus = orders[idx].status;
  saveData(ORDERS_FILE, orders);

  // Create notification if status changed
  if (oldStatus !== newStatus && newStatus) {
    const order = orders[idx];
    let targetUserId, title, message, actionUrl;
    if (newStatus === 'accepted') {
      targetUserId = order.buyerId;
      title = 'Order Accepted';
      message = `Your order for "${order.productName}" has been accepted by ${order.farmerName}`;
      actionUrl = `/orders/${order.id}`;
    } else if (newStatus === 'shipped') {
      targetUserId = order.buyerId;
      title = 'Order Shipped';
      message = `Your order for "${order.productName}" has been shipped`;
      actionUrl = `/orders/${order.id}`;
    } else if (newStatus === 'delivered') {
      targetUserId = order.buyerId;
      title = 'Order Delivered';
      message = `Your order for "${order.productName}" has been delivered`;
      actionUrl = `/orders/${order.id}`;
    } else if (newStatus === 'cancelled') {
      targetUserId = order.buyerId;
      title = 'Order Cancelled';
      message = `Your order for "${order.productName}" has been cancelled`;
      actionUrl = `/orders/${order.id}`;
    } else if (newStatus === 'paid') {
      targetUserId = order.farmerId;
      title = 'Payment Received';
      message = `Payment received for order "${order.productName}"`;
      actionUrl = `/orders/${order.id}`;
    }

    if (targetUserId && title) {
      const notif = {
        id: uuidv4(),
        userId: targetUserId,
        type: 'order',
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl,
      };
      notifications.push(notif);
      saveNotifications(notifications);
      if (io) io.to(`user_${targetUserId}`).emit('notification:new', notif);
    }
  }

  // Log activity (best-effort)
  try {
    const existing = orders[idx];
    activityLogs.unshift({
      id: uuidv4(),
      userId: req.body.userId || existing.farmerId || existing.buyerId || 'system',
      userName: req.body.userName || existing.farmerName || existing.buyerName || 'System',
      userRole: req.body.userRole || 'farmer',
      action: 'updated order',
      targetId: existing.id,
      targetType: 'order',
      details: `Order updated: ${(req.body.status ? `status -> ${req.body.status}` : JSON.stringify(req.body))}`,
      timestamp: new Date().toISOString(),
    });
    saveData(ACTIVITY_FILE, activityLogs);
  } catch (e) {
    console.warn('Failed to log activity for order update', e);
  }

  res.json(orders[idx]);
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

// Notifications API
app.get('/api/notifications', (req, res) => {
  const userId = req.query.userId ? String(req.query.userId) : null;
  if (userId) return res.json(notifications.filter(n => n.userId === userId));
  return res.json(notifications);
});

app.get('/api/notifications/unread-count', (req, res) => {
  const userId = req.query.userId ? String(req.query.userId) : null;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const count = notifications.filter(n => n.userId === userId && !n.read).length;
  res.json({ unread: count });
});

app.post('/api/notifications', (req, res) => {
  const incoming = {
    id: uuidv4(),
    userId: String(req.body.userId || ''),
    type: String(req.body.type || 'update'),
    title: String(req.body.title || ''),
    message: String(req.body.message || ''),
    timestamp: req.body.timestamp || new Date().toISOString(),
    read: Boolean(req.body.read || false),
    actionUrl: req.body.actionUrl || null,
  };
  // Prevent obvious duplicates: same userId + type + title within 2 seconds
  const now = Date.now();
  const dup = notifications.find(n => n.userId === incoming.userId && n.type === incoming.type && n.title === incoming.title && Math.abs(new Date(n.timestamp).getTime() - now) < 2000);
  if (dup) return res.status(409).json({ error: 'duplicate' });

  notifications.unshift(incoming);
  saveNotifications(notifications);
  // Emit via socket if available
  try { if (io) io.to(`user_${incoming.userId}`).emit('notification:new', incoming); } catch (e) {}
  res.status(201).json(incoming);
});

app.put('/api/notifications/:id', (req, res) => {
  const idx = notifications.findIndex(n => n.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  notifications[idx] = { ...notifications[idx], ...req.body };
  saveNotifications(notifications);
  try { if (io) io.to(`user_${notifications[idx].userId}`).emit('notification:update', notifications[idx]); } catch (e) {}
  res.json(notifications[idx]);
});

app.delete('/api/notifications/:id', (req, res) => {
  const idx = notifications.findIndex(n => n.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  const removed = notifications.splice(idx,1)[0];
  saveNotifications(notifications);
  try { if (io) io.to(`user_${removed.userId}`).emit('notification:delete', { id: removed.id }); } catch (e) {}
  res.json({ success: true });
});

// Upgrade to HTTP server with Socket.IO
const http = require('http');
const server = http.createServer(app);
let io;
try {
  const { Server } = require('socket.io');
  io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    socket.on('join', (data) => {
      try {
        const userId = String(data?.userId || data);
        if (userId) socket.join(`user_${userId}`);
      } catch (e) {}
    });

    socket.on('leave', (data) => {
      try { const userId = String(data?.userId || data); if (userId) socket.leave(`user_${userId}`); } catch(e){}
    });

    socket.on('cart:update', (payload) => {
      // payload: { userId, count }
      try { if (payload && payload.userId) io.to(`user_${payload.userId}`).emit('cart:update', payload); } catch(e){}
    });

    socket.on('disconnect', () => {});
  });
} catch (e) {
  console.warn('Socket.IO not available', e && e.message ? e.message : e);
}

app.use((_,res)=>res.status(404).json({error:'Not found'}));
const listenTarget = PORT || 4000;
server.listen(listenTarget, ()=>console.log(`API server running at http://localhost:${listenTarget}`));
