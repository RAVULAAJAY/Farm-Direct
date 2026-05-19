require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const brevoSendOtp = require('./sendOtpEmail');
const emailService = require('./services/emailService');

// All transactional emails use Brevo via `emailService`.
function getFromAddress() {
  return String(process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'no-reply@farm-direct.local').trim();
}

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activityLogs.json');
const OTPS_FILE = path.join(DATA_DIR, 'otps.json');

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

function getFrontendBase(req) {
  const requestOrigin = typeof req?.headers?.origin === 'string' ? req.headers.origin.trim() : '';
  const configuredBase = String(process.env.FRONTEND_URL || '').trim();
  return (requestOrigin || configuredBase).replace(/\/$/, '');
}

async function sendPasswordResetEmail({ email, resetLink }) {
  if (!email) return false;
  try {
    if (process.env.BREVO_API_KEY) {
      try {
        console.log(`[Password Reset] Sending reset email via Brevo to ${email}`);
        const ok = await emailService.sendPasswordResetEmail(email, resetLink);
        if (ok) {
          console.log(`[Password Reset] Email sent successfully to ${email}`);
          return true;
        }
        console.warn('[Password Reset] Brevo send returned false');
      } catch (e) {
        console.warn('[Password Reset] Brevo send failed:', e && e.message ? e.message : e);
      }
    }

    // No SMTP fallbacks: in development return a helpful log when debug enabled
    if ((process.env.NODE_ENV || 'development') !== 'production' && process.env.DEBUG_OTP === 'true') {
      console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);
      return true;
    }

    console.log(`[Password Reset] Email service not configured. Reset link for ${email}: ${resetLink}`);
    return false;
  } catch (e) {
    console.warn('[Password Reset] Unexpected error sending reset email:', e && e.message ? e.message : e);
    return false;
  }
}

function getOrderPartyDetails(order) {
  const buyer = users.find((u) => String(u.id) === String(order.buyerId));
  const farmer = users.find((u) => String(u.id) === String(order.farmerId));

  return {
    buyer,
    farmer,
    buyerEmail: String(order.buyerEmail || buyer?.email || '').trim(),
    farmerEmail: String(order.farmerEmail || farmer?.email || '').trim(),
    buyerName: String(order.buyerName || buyer?.name || 'Buyer').trim(),
    farmerName: String(order.farmerName || farmer?.name || 'Farmer').trim(),
    buyerPhone: String(order.buyerPhone || buyer?.phone || '').trim(),
    buyerLocation: String(order.buyerLocation || buyer?.location || order.deliveryAddress || '').trim(),
  };
}

function buildOrderDetailsText(order) {
  return [
    `Order ID: ${order.id}`,
    `Product: ${order.productName || 'N/A'}`,
    `Quantity: ${order.quantity ?? 'N/A'}`,
    `Total Price: ${order.totalPrice ?? 'N/A'}`,
    `Payment Method: ${order.paymentMethod || 'N/A'}`,
    `Payment Status: ${order.paymentStatus || 'N/A'}`,
    `Order Status: ${order.status || 'pending'}`,
    `Delivery Status: ${order.deliveryStatus || 'pending'}`,
    `Delivery Option: ${order.deliveryOption || 'N/A'}`,
    `Delivery Address: ${order.deliveryAddress || 'N/A'}`,
    `Order Date: ${order.orderDate || order.createdAt || new Date().toISOString()}`,
  ].join('\n');
}

async function sendOrderPlacementEmails(order) {
  console.log('[Order Emails] Processing order', order.id);
  const { buyerEmail, farmerEmail, buyerName, farmerName, buyerPhone, buyerLocation } = getOrderPartyDetails(order);
  const details = buildOrderDetailsText(order);

  try {
    const { buyerEmail, farmerEmail } = getOrderPartyDetails(order);
    if (farmerEmail) {
      void emailService.sendOrderPlacedToFarmer(order)
        .then(() => console.log('[Order Placement Farmer] Email sent to', farmerEmail))
        .catch((e) => console.warn('[Order Placement Farmer] Email failed:', e && e.message ? e.message : e));
    }

    if (buyerEmail) {
      void emailService.sendOrderPlacedToBuyer(order)
        .then(() => console.log('[Order Placement Buyer] Email sent to', buyerEmail))
        .catch((e) => console.warn('[Order Placement Buyer] Email failed:', e && e.message ? e.message : e));
    }
  } catch (e) {
    console.warn('[Order Emails] Unexpected error processing order emails:', e && e.message ? e.message : e);
  }
}

function getOrderStatusEmailMessage(order) {
  const normalized = String(order.deliveryStatus || order.status || '').toLowerCase();
  if (normalized === 'shipped') {
    return {
      subject: `Order shipped: ${order.productName || order.id}`,
      message: 'Your product has been shipped by the farmer.',
    };
  }
  if (normalized === 'out-for-delivery') {
    return {
      subject: `Out for delivery: ${order.productName || order.id}`,
      message: 'Your order is out for delivery.',
    };
  }
  if (normalized === 'delivered') {
    return {
      subject: `Delivered successfully: ${order.productName || order.id}`,
      message: 'Your order has been delivered successfully.',
    };
  }

  return {
    subject: `Order status updated: ${order.productName || order.id}`,
    message: `Your order status has been updated to ${order.deliveryStatus || order.status || 'updated'}.`,
  };
}

async function sendOrderStatusEmailToBuyer(order) {
  try {
    const { buyerEmail } = getOrderPartyDetails(order);
    if (!buyerEmail) return;
    void emailService.sendOrderStatusUpdateToBuyer(order)
      .then(() => console.log('[Order Status] Email sent to buyer:', buyerEmail))
      .catch((e) => console.warn('[Order Status] Email failed for buyer:', buyerEmail, e && e.message ? e.message : e));
  } catch (e) {
    console.warn('[Order Status] Unexpected error sending status email:', e && e.message ? e.message : e);
  }
}


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
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log('[CORS] Configured allowed origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      console.log('[CORS] ✓ Request allowed (no origin header)');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] ✓ Origin allowed (in list): ${origin}`);
      return callback(null, true);
    }
    
    if (origin.endsWith('.vercel.app')) {
      console.log(`[CORS] ✓ Origin allowed (*.vercel.app): ${origin}`);
      return callback(null, true);
    }
    
    console.warn(`[CORS] ✗ Origin REJECTED: ${origin}`);
    return callback(new Error('CORS not allowed from this origin: ' + origin), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '10mb' }));

// Notifications persistence
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
function loadNotifications() {
  return loadData(NOTIFICATIONS_FILE);
}
function saveNotifications(data){ saveData(NOTIFICATIONS_FILE, data); }
let notifications = loadNotifications();

function loadOtps(){ return loadData(OTPS_FILE); }
function saveOtps(data){ saveData(OTPS_FILE, data); }
let otps = loadOtps();

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
  // Fire-and-forget: send account created email via centralized emailService
  try {
    void emailService.sendAccountCreatedEmail(user)
      .then(() => console.log('[Account Created] Email sent to', user.email))
      .catch(err => console.warn('[Account Created] Email failed for', user.email, err && err.message ? err.message : err));
  } catch (e) {
    console.warn('[Account Created] Unexpected error triggering account email:', e && e.message ? e.message : e);
  }
});

function cleanupExpiredOtps() {
  const now = Date.now();
  const before = otps.length;
  otps = otps.filter((entry) => Number(entry.expiresAt) > now);
  if (otps.length !== before) {
    saveOtps(otps);
    console.log(`[OTP] Cleaned up ${before - otps.length} expired OTP record(s)`);
  }
}

async function sendOtpEmail(req, res, { resend = false } = {}) {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!email) {
    console.error('[OTP SEND] Email missing in request body');
    return res.status(400).json({ error: 'Email is required' });
  }

  cleanupExpiredOtps();
  console.log(`[OTP SEND] ${resend ? 'Resend' : 'Send'} request received for email: ${email}`);

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = Date.now() + (5 * 60 * 1000);

  otps = otps.filter((entry) => entry.email !== email);
  otps.push({ email, otpHash, expiresAt });
  saveOtps(otps);
  console.log(`[OTP SEND] ✓ OTP stored for ${email}, expires at: ${new Date(expiresAt).toISOString()}`);
  // Prefer Brevo API for OTP sends
  if (process.env.BREVO_API_KEY && typeof brevoSendOtp === 'function') {
    try {
      console.log('[OTP SEND] Sending OTP via Brevo API');
      await brevoSendOtp(email, otp);
      return res.json({ success: true, message: resend ? 'OTP resent to your email' : 'OTP sent to your email', resend });
    } catch (brevoErr) {
      console.error('[OTP SEND] Brevo send failed:', brevoErr && brevoErr.message ? brevoErr.message : brevoErr);
      const debugOtp = process.env.DEBUG_OTP === 'true' ? otp : undefined;
      if ((process.env.NODE_ENV || 'development') !== 'production' && process.env.DEBUG_OTP === 'true') {
        console.log(`[OTP SEND] Development fallback OTP for ${email}: ${otp}`);
        return res.json({ success: true, message: 'OTP generated (Brevo send failed)', debugOtp, resend });
      }
      return res.status(502).json({ error: 'Failed to send OTP via Brevo', message: 'Please try again later', debugOtp, timestamp: new Date().toISOString() });
    }
  }

  // No Brevo configured: development-only debug fallback, otherwise error
  const debugOtp = process.env.DEBUG_OTP === 'true' ? otp : undefined;
  if ((process.env.NODE_ENV || 'development') !== 'production' && process.env.DEBUG_OTP === 'true') {
    console.log(`[OTP SEND] Development fallback OTP for ${email}: ${otp}`);
    return res.json({ success: true, message: 'OTP generated (Brevo not configured)', debugOtp, resend });
  }

  return res.status(503).json({
    error: 'Email service unavailable',
    message: 'OTP could not be sent because Brevo is not configured',
    debugOtp,
    timestamp: new Date().toISOString(),
  });
}

// Send OTP to an email for verification (used during signup)
app.post('/api/auth/send-otp', async (req, res) => sendOtpEmail(req, res, { resend: false }));
app.post('/api/auth/resend-otp', async (req, res) => sendOtpEmail(req, res, { resend: true }));

// Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const otp = String((req.body && req.body.otp) || '').trim();

  console.log(`[OTP VERIFY] Request received for email: ${email}, OTP length: ${otp.length}`);

  if (!email || !otp) {
    console.error('[OTP VERIFY] ✗ Missing email or OTP');
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const entryIndex = otps.findIndex((e) => e.email === email);
  if (entryIndex < 0) {
    console.warn(`[OTP VERIFY] ✗ No OTP found for email: ${email}`);
    return res.status(400).json({ error: 'OTP not found or expired' });
  }

  const entry = otps[entryIndex];
  const now = Date.now();
  const expiresAt = Number(entry.expiresAt);
  const isExpired = now > expiresAt;

  if (isExpired) {
    const expiredSeconds = Math.floor((now - expiresAt) / 1000);
    console.warn(`[OTP VERIFY] ✗ OTP expired for ${email} (${expiredSeconds}s ago)`);
    otps.splice(entryIndex, 1);
    saveOtps(otps);
    return res.status(400).json({ error: 'OTP expired' });
  }

  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  if (otpHash !== entry.otpHash) {
    console.warn(`[OTP VERIFY] ✗ Invalid OTP for ${email} (hash mismatch)`);
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // Valid - remove entry
  otps.splice(entryIndex, 1);
  saveOtps(otps);

  console.log(`[OTP VERIFY] ✓ Email verified successfully for: ${email}`);
  res.json({ success: true, message: 'Email verified successfully' });
});
app.put('/api/users/:id', (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'User not found' });
  
  // Allow password change via PUT (hash securely)
  const updates = { ...req.body };
  if (typeof updates.password === 'string' && updates.password.length > 0) {
    // SECURITY: Require old password verification
    if (!updates.oldPassword) {
      return res.status(400).json({ error: 'Current password required to change password' });
    }
    
    try {
      // Verify old password
      const oldDerived = crypto.scryptSync(String(updates.oldPassword), users[idx].passwordSalt || '', 64).toString('hex');
      if (oldDerived !== users[idx].passwordHash) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Unable to verify password' });
    }
    
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(updates.password, salt, 64).toString('hex');
    updates.passwordSalt = salt;
    updates.passwordHash = derived;
    delete updates.password;
    delete updates.oldPassword;
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
  } catch(e) {
    console.error('[Orders] Error notifying farmer of new order:', e && e.message ? e.message : e);
  }

  void sendOrderPlacementEmails(order);

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

  const frontendBase = getFrontendBase(req);
  const resetLink = `${frontendBase}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  // Try to send email via Brevo API if configured, otherwise log
  let emailed = false;
  try {
    emailed = await sendPasswordResetEmail({ email, resetLink });
  } catch (e) {
    console.warn('Failed to send reset email via SMTP, falling back to console log', e && e.message ? e.message : e);
  }

  if (!emailed) {
    // Log only for debugging purposes when SMTP not available
    if ((process.env.NODE_ENV || 'development') === 'development') {
      console.log(`[DEV] Password reset link for ${email} (check email first, this is fallback)`);
    }
  }

  // SECURITY: Never return reset token in response
  res.json({ success: true });
});

// Auth: reset password using token
app.post('/api/auth/reset', (req, res) => {
  const { email, token, password } = req.body || {};
  if (!email || !token || !password) {
    return res.status(400).json({ error: 'Email, token and new password are required' });
  }

  // Validate password complexity: min 8 chars, upper, lower, number
  if (!String(password).match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and numbers' });
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

  const previous = { ...orders[idx] };

  // Merge updates
  orders[idx] = { ...orders[idx], ...req.body };
  saveData(ORDERS_FILE, orders);
  const updated = orders[idx];

  const statusChanged = String(previous.status || '') !== String(updated.status || '');
  const deliveryStatusChanged = String(previous.deliveryStatus || '') !== String(updated.deliveryStatus || '');
  if (statusChanged || deliveryStatusChanged) {
    void sendOrderStatusEmailToBuyer(updated);
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

  res.json(updated);
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

// Buyer cancels an order (allowed only before shipping/out-for-delivery/delivered)
app.post('/api/orders/:id/cancel', (req, res) => {
  const id = req.params.id;
  const idx = orders.findIndex((o) => o.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Order not found' });

  const existing = orders[idx];
  // Disallow cancel if already shipped/out-for-delivery or delivered
  const disallowedDeliveryStatuses = ['out-for-delivery', 'delivered'];
  const disallowedOrderStatuses = ['shipped', 'delivered', 'cancelled'];

  if (disallowedDeliveryStatuses.includes(String(existing.deliveryStatus)) || disallowedOrderStatuses.includes(String(existing.status))) {
    return res.status(400).json({ error: 'Order cannot be cancelled after shipping or delivery' });
  }

  // Apply cancellation
  orders[idx] = {
    ...existing,
    status: 'cancelled',
    deliveryStatus: 'cancelled',
  };

  // If payment was made, mark paymentStatus to 'refunded' (best-effort simulation)
  try {
    if (orders[idx].paymentStatus === 'paid') {
      orders[idx].paymentStatus = 'refunded';
    }
  } catch (e) {}

  saveData(ORDERS_FILE, orders);

  try {
    const entry = { id: uuidv4(), userId: orders[idx].buyerId, userName: orders[idx].buyerName, userRole: 'buyer', action: 'cancelled order', targetId: orders[idx].id, targetType: 'order', timestamp: new Date().toISOString() };
    activityLogs.unshift(entry);
    saveData(ACTIVITY_FILE, activityLogs);
  } catch (e) {}

  // Notify farmer and buyer
  try {
    const notifToFarmer = {
      id: uuidv4(),
      userId: orders[idx].farmerId,
      type: 'order',
      title: 'Order cancelled by buyer',
      message: `${orders[idx].buyerName} cancelled order ${orders[idx].id} for ${orders[idx].productName}`,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: '/orders'
    };

    const notifToBuyer = {
      id: uuidv4(),
      userId: orders[idx].buyerId,
      type: 'order',
      title: 'Order cancelled',
      message: `Your order ${orders[idx].id} was cancelled successfully.`,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: '/orders'
    };

    notifications.unshift(notifToFarmer);
    notifications.unshift(notifToBuyer);
    saveNotifications(notifications);

    if (io) {
      io.to(`user_${orders[idx].farmerId}`).emit('notification:new', notifToFarmer);
      io.to(`user_${orders[idx].buyerId}`).emit('notification:new', notifToBuyer);
      // Emit order cancelled event for real-time UI updates
      io.to(`user_${orders[idx].farmerId}`).emit('order:cancelled', orders[idx]);
      io.to(`user_${orders[idx].buyerId}`).emit('order:cancelled', orders[idx]);
    }
  } catch (e) {
    console.warn('Failed to emit cancellation notifications', e && e.message ? e.message : e);
  }

  res.json(orders[idx]);
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
      } catch (e) {
        console.error('[Socket.IO] Error joining user room:', e && e.message ? e.message : e);
      }
    });

    socket.on('leave', (data) => {
      try {
        const userId = String(data?.userId || data);
        if (userId) socket.leave(`user_${userId}`);
      } catch(e) {
        console.error('[Socket.IO] Error leaving user room:', e && e.message ? e.message : e);
      }
    });

    socket.on('cart:update', (payload) => {
      // payload: { userId, count }
      try {
        if (payload && payload.userId) io.to(`user_${payload.userId}`).emit('cart:update', payload);
      } catch(e) {
        console.error('[Socket.IO] Error broadcasting cart update:', e && e.message ? e.message : e);
      }
    });

    socket.on('disconnect', () => {});
  });
} catch (e) {
  console.warn('Socket.IO not available', e && e.message ? e.message : e);
}

app.use((_,res)=>res.status(404).json({error:'Not found'}));
const listenTarget = PORT || 4000;
const listenHost = process.env.HOST || '0.0.0.0';

// Debug endpoint to check SMTP and OTP configuration
app.get('/api/debug/otp-config', (req, res) => {
  if (process.env.DEBUG_OTP !== 'true') return res.status(403).json({ error: 'Debug mode not enabled' });
  res.json({
    smtp: {
      host: process.env.SMTP_HOST ? '✓ set' : '✗ missing',
      port: process.env.SMTP_PORT ? '✓ ' + process.env.SMTP_PORT : '✗ missing',
      user: process.env.SMTP_USER || process.env.SMTP_LOGIN ? '✓ set' : '✗ missing',
      pass: process.env.SMTP_PASS || process.env.SMTP_KEY ? (process.env.SMTP_PASS ? '✓ set (' + (process.env.SMTP_PASS || '').substring(0, 10) + '...)' : '✓ set') : '✗ missing',
      fromEmail: process.env.EMAIL_FROM || process.env.FROM_EMAIL ? '✓ ' + (process.env.EMAIL_FROM || process.env.FROM_EMAIL) : '✗ missing',
    },
    transporter: process.env.BREVO_API_KEY ? '✓ Brevo configured' : '✗ Brevo not configured',
    frontendUrl: process.env.FRONTEND_URL || '✗ missing',
  });
});

(async () => {
  server.listen(listenTarget, listenHost, () => console.log(`API server running on ${listenHost}:${listenTarget}`));
})();
