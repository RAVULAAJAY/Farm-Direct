const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
// Note: local filesystem persistence removed — Firestore is the single source of truth.
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const brevoSendOtp = require('./sendOtpEmail');
const emailService = require('./services/emailService');
const usersRepo = require('./repositories/usersRepository');
const productsRepo = require('./repositories/productsRepository');
const ordersRepo = require('./repositories/ordersRepository');
const messagesRepo = require('./repositories/messagesRepository');
const notificationsRepo = require('./repositories/notificationsRepository');
const reviewsRepo = require('./repositories/reviewsRepository');
const activityRepo = require('./repositories/activityRepository');
const { db: firestoreDb } = require('./config/firebase');

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function sanitizeForLog(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return '[unserializable payload]';
  }
}

function validateStartupEnv() {
  const required = [
    'JWT_SECRET',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'BREVO_SMTP_USER',
    'BREVO_SMTP_PASS',
    'FRONTEND_URL',
  ];
  const missing = required.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length > 0) {
    const msg = `[Startup] Missing required env vars: ${missing.join(', ')}`;
    console.error(msg);
    if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
      console.error('[Startup] Aborting startup due to missing env vars');
      process.exit(1);
    }
  } else {
    console.log('[Startup] All required production env vars present');
  }
}

function createAuthToken(user) {
  const secret = String(process.env.JWT_SECRET || '').trim() || 'dev-only-fallback-secret';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: String(user.id || ''),
    email: normalizeEmail(user.email),
    role: String(user.role || ''),
    name: String(user.name || ''),
    iat: Math.floor(Date.now() / 1000),
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

// All transactional emails use Brevo via `emailService`.
function getFromAddress() {
  return String(process.env.EMAIL_FROM || 'no-reply@farm-direct.local').trim();
}

// Ephemeral OTP store (do NOT persist OTPs permanently)
const otpStore = new Map(); // key: email, value: { otpHash, expiresAt }

function storeOtp(email, otpHash, expiresAt) {
  otpStore.set(normalizeEmail(email), { otpHash, expiresAt });
}

function getOtpEntry(email) {
  return otpStore.get(normalizeEmail(email)) || null;
}

function deleteOtpEntry(email) {
  return otpStore.delete(normalizeEmail(email));
}

function cleanupExpiredOtps() {
  const now = Date.now();
  let removed = 0;
  for (const [email, entry] of otpStore.entries()) {
    if (Number(entry.expiresAt) <= now) { otpStore.delete(email); removed++; }
  }
  if (removed > 0) console.log(`[OTP] Cleaned up ${removed} expired OTP record(s)`);
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

// in-memory state (will be populated from Firestore when enabled)
// In-memory arrays removed — Firestore is the single source of truth.
// Do NOT use in-memory arrays for application state.

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
        const ok = await emailService.sendForgotPasswordEmail(email, resetLink);
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

async function getOrderPartyDetails(order) {
  const buyer = order.buyerId ? await usersRepo.getUserById(order.buyerId) : null;
  const farmer = order.farmerId ? await usersRepo.getUserById(order.farmerId) : null;

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
  const { buyerEmail, farmerEmail, buyerName, farmerName, buyerPhone, buyerLocation } = await getOrderPartyDetails(order);
  const details = buildOrderDetailsText(order);

  try {
    const { buyerEmail: be, farmerEmail: fe } = await getOrderPartyDetails(order);

    if (fe) {
      console.log('[Order Emails] Sending farmer email to', fe, 'for order', order.id);
      void emailService.sendFarmerNewOrderEmail(order)
        .then((resp) => console.log('[Order Placement Farmer] Email send result for', fe, ':', resp))
        .catch((e) => console.error('[Order Placement Farmer] Email failed for', fe, e, e && (e.response?.body || e.body || e.response)));
    }

    if (be) {
      console.log('[Order Emails] Sending buyer email to', be, 'for order', order.id);
      void emailService.sendOrderPlacedEmail(order)
        .then((resp) => console.log('[Order Placement Buyer] Email send result for', be, ':', resp))
        .catch((e) => console.error('[Order Placement Buyer] Email failed for', be, e, e && (e.response?.body || e.body || e.response)));
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
    const { buyerEmail } = await getOrderPartyDetails(order);
    if (!buyerEmail) return;
    void emailService.sendOrderStatusEmail(order)
      .then(() => console.log('[Order Status] Email sent to buyer:', buyerEmail))
      .catch((e) => console.warn('[Order Status] Email failed for buyer:', buyerEmail, e && e.message ? e.message : e));
  } catch (e) {
    console.warn('[Order Status] Unexpected error sending status email:', e && e.message ? e.message : e);
  }
}


// When FIRESTORE is enabled the initial admin user will be ensured during startup load.

const app = express();
const allowedOrigin = String(process.env.FRONTEND_URL || 'https://farm-direct-zeta-swart.vercel.app').trim().replace(/\/$/, '');
const allowedOrigins = new Set([
  allowedOrigin,
  'https://farm-direct-zeta-swart.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

async function handleLogin(req, res) {
  console.log('[Auth] LOGIN START');
  const { email, password } = req.body || {};
  console.log('LOGIN PAYLOAD', { email });
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

  try {
    const user = await usersRepo.findByEmail(email);
    if (!user) {
      console.log('[Auth] LOGIN FAILED - user not found', email);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      console.log('[Auth] LOGIN FAILED - inactive user record', user.id);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const provided = String(password);
    const storedPassword = typeof user.password === 'string' ? user.password : '';
    const isBcryptHash = storedPassword.startsWith('$2');
    if (!isBcryptHash) {
      console.warn('[Auth] LOGIN FAILED - non-bcrypt password hash for user', user.id);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(provided, storedPassword);
    } catch (e) {
      console.warn('[Auth] bcrypt compare failed', e && e.message ? e.message : e);
      valid = false;
    }

    if (!valid) {
      console.log('[Auth] LOGIN FAILED - invalid password for user', user.id);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = createAuthToken(user);
    console.log('[Auth] LOGIN SUCCESS', user.id);
    return res.json({ success: true, user: stripAuthFields(user), token });
  } catch (error) {
    console.error('[Auth] Login error:', error && error.message ? error.message : error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function handleSignup(req, res) {
  console.log('[Auth] SIGNUP START');
  const payload = req.body || {};
  console.log('SIGNUP PAYLOAD', { name: payload.name, email: payload.email, role: payload.role });

  const name = String(payload.name || '').trim();
  const email = normalizeEmail(payload.email);
  const password = payload.password;
  const role = String(payload.role || '').trim();

  if (!name || !email || !password || !role) {
    console.log('[Auth] SIGNUP FAILED - missing fields');
    return res.status(400).json({ success: false, message: 'name, email, password and role are required' });
  }

  try {
    // Ensure no existing user
    const existing = await usersRepo.findByEmail(email);
    if (existing && existing.isActive !== false) return res.status(409).json({ success: false, message: 'Email already registered' });

    // create user - usersRepo.createUser will hash password
    const userRecord = await usersRepo.createUser({ name, email, password, role, isActive: true, createdAt: new Date().toISOString() });
    const token = createAuthToken(userRecord);
    console.log('[Auth] SIGNUP SUCCESS', userRecord.id);
    return res.status(201).json({ success: true, user: stripAuthFields(userRecord), token });
  } catch (err) {
    console.error('[Auth] SIGNUP FAILED', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Signup failed' });
  }
}

const authRouter = express.Router();
authRouter.post('/login', handleLogin);
authRouter.post('/signup', handleSignup);
authRouter.post('/send-otp', handleSendOtp);
authRouter.post('/verify-otp', handleVerifyOtp);
authRouter.post('/forgot', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const user = await usersRepo.findByEmail(email);
    if (!user) return res.status(200).json({ success: true });
    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await usersRepo.updateUser(user.id, { resetPasswordHash: tokenHash, resetPasswordExpiry: Date.now() + (60 * 60 * 1000) });
    const resetLink = `${getFrontendBase(req)}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    await sendPasswordResetEmail({ email, resetLink });
    return res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Forgot password error:', error && error.message ? error.message : error);
    return res.status(500).json({ success: false, message: 'Unable to process password reset' });
  }
});
authRouter.post('/reset', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    if (!email || !token || !password) return res.status(400).json({ error: 'Email, token and password are required' });
    const user = await usersRepo.findByEmail(email);
    if (!user || !user.resetPasswordHash || !user.resetPasswordExpiry) return res.status(400).json({ error: 'Invalid or expired token' });
    if (Date.now() > Number(user.resetPasswordExpiry)) return res.status(400).json({ error: 'Token has expired' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (tokenHash !== user.resetPasswordHash) return res.status(400).json({ error: 'Invalid token' });
    const newHash = await bcrypt.hash(password, 10);
    await usersRepo.updateUser(user.id, {
      password: newHash,
      resetPasswordHash: null,
      resetPasswordExpiry: null,
      updatedAt: new Date().toISOString(),
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Reset password error:', error && error.message ? error.message : error);
    return res.status(500).json({ success: false, message: 'Unable to reset password' });
  }
});

async function handleSendOtp(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = Date.now() + (5 * 60 * 1000);
    storeOtp(email, otpHash, expiresAt);

    const sent = await brevoSendOtp(email, otp);
    if (!sent && (process.env.NODE_ENV || 'development') === 'development') {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[OTP] Send error:', error && error.message ? error.message : error);
    return res.status(500).json({ success: false, message: 'Unable to send OTP' });
  }
}

async function handleVerifyOtp(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || '').trim();
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const entry = getOtpEntry(email);
    if (!entry) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    if (Number(entry.expiresAt) < Date.now()) {
      deleteOtpEntry(email);
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const providedHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (providedHash !== entry.otpHash) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    deleteOtpEntry(email);
    return res.json({ success: true });
  } catch (error) {
    console.error('[OTP] Verify error:', error && error.message ? error.message : error);
    return res.status(500).json({ success: false, message: 'Unable to verify OTP' });
  }
}

function sendJsonError(res, status, message, details) {
  return res.status(status).json({
    success: false,
    error: message,
    message,
    ...(details ? { details } : {}),
  });
}

function stripAuthFields(user) {
  if (!user || typeof user !== 'object') return user;
  const { password, passwordHash, passwordSalt, hashedPassword, resetPasswordHash, resetPasswordExpiry, ...rest } = user;
  return rest;
}

const usersRouter = express.Router();
usersRouter.get('/', async (req, res) => {
  try {
    const users = await usersRepo.getAllUsers();
    return res.json(users.map(stripAuthFields));
  } catch (e) {
    console.error('[API] Failed to fetch users', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to fetch users');
  }
});
usersRouter.put('/:id', async (req, res) => {
  try {
    const updated = await usersRepo.updateUser(req.params.id, req.body);
    return res.json(stripAuthFields(updated));
  } catch (e) {
    console.error('[API] Failed to update user', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to update user');
  }
});

const productsRouter = express.Router();
productsRouter.get('/', async (req, res) => {
  try {
    return res.json(await productsRepo.getAllProducts());
  } catch (e) {
    console.error('[API] Failed to fetch products', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to fetch products');
  }
});
productsRouter.get('/:id', async (req, res) => {
  try {
    const product = await productsRepo.getProductById(req.params.id);
    if (!product) return sendJsonError(res, 404, 'Product not found');
    return res.json(product);
  } catch (e) {
    console.error('[API] Failed to fetch product', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to fetch product');
  }
});
productsRouter.post('/', async (req, res) => {
  try {
    const created = await productsRepo.createProduct(req.body || {});
    return res.status(201).json(created);
  } catch (e) {
    console.error('[API] Failed to create product', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to create product');
  }
});
productsRouter.put('/:id', async (req, res) => {
  try {
    const updated = await productsRepo.updateProduct(req.params.id, req.body || {});
    return res.json(updated);
  } catch (e) {
    console.error('[API] Failed to update product', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to update product');
  }
});
productsRouter.delete('/:id', async (req, res) => {
  try {
    await productsRepo.deleteProduct(req.params.id);
    return res.json({ success: true });
  } catch (e) {
    console.error('[API] Failed to delete product', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to delete product');
  }
});
productsRouter.post('/:id/reviews', async (req, res) => {
  try {
    await reviewsRepo.addReview(req.params.id, req.body || {});
    const updatedProduct = await productsRepo.getProductById(req.params.id);
    if (!updatedProduct) return sendJsonError(res, 404, 'Product not found');
    return res.json(updatedProduct);
  } catch (e) {
    if (String(e && e.message ? e.message : '').toLowerCase().includes('product not found')) {
      return sendJsonError(res, 404, 'Product not found');
    }
    console.error('[API] Failed to add product review', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to add review');
  }
});

const messagesRouter = express.Router();
messagesRouter.get('/', async (req, res) => {
  try {
    return res.json(await messagesRepo.getAllMessages());
  } catch (e) {
    console.error('[API] Failed to fetch messages', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to fetch messages');
  }
});
messagesRouter.get('/:id', async (req, res) => {
  try {
    const message = await messagesRepo.getMessageById(req.params.id);
    if (!message) return sendJsonError(res, 404, 'Message not found');
    return res.json(message);
  } catch (e) {
    console.error('[API] Failed to fetch message', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to fetch message');
  }
});
messagesRouter.post('/', async (req, res) => {
  try {
    const created = await messagesRepo.createMessage(req.body || {});
    try {
      if (io && created?.recipientId) io.to(`user_${created.recipientId}`).emit('message:new', created);
    } catch (e) {
      console.warn('[Messages] emit failed', e && e.message ? e.message : e);
    }
    return res.status(201).json(created);
  } catch (e) {
    console.error('[API] Failed to create message', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to create message');
  }
});
messagesRouter.put('/:id', async (req, res) => {
  try {
    const updated = await messagesRepo.updateMessage(req.params.id, req.body || {});
    try {
      if (io && updated?.recipientId) io.to(`user_${updated.recipientId}`).emit('message:update', updated);
    } catch (e) {
      console.warn('[Messages] emit update failed', e && e.message ? e.message : e);
    }
    return res.json(updated);
  } catch (e) {
    console.error('[API] Failed to update message', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to update message');
  }
});
messagesRouter.delete('/:id', async (req, res) => {
  try {
    await messagesRepo.deleteMessage(req.params.id);
    return res.json({ success: true });
  } catch (e) {
    console.error('[API] Failed to delete message', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to delete message');
  }
});

const ordersRouter = express.Router();
ordersRouter.get('/', async (req, res) => {
  try {
    return res.json(await ordersRepo.getAllOrders());
  } catch (e) {
    console.error('[API] Failed to fetch orders', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to fetch orders');
  }
});
ordersRouter.get('/:id', async (req, res) => {
  try {
    const order = await ordersRepo.getOrderById(req.params.id);
    if (!order) return sendJsonError(res, 404, 'Order not found');
    return res.json(order);
  } catch (e) {
    console.error('[API] Failed to fetch order', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to fetch order');
  }
});
ordersRouter.post('/', async (req, res) => {
  try {
    const created = await ordersRepo.createOrder(req.body || {});
    try {
      if (io && created?.buyerId) io.to(`user_${created.buyerId}`).emit('order:placed', created);
      if (io && created?.farmerId) io.to(`user_${created.farmerId}`).emit('order:placed', created);
    } catch (e) {
      console.warn('[Orders] emit create failed', e && e.message ? e.message : e);
    }
    return res.status(201).json(created);
  } catch (e) {
    console.error('[API] Failed to create order', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to create order');
  }
});
ordersRouter.put('/:id', async (req, res) => {
  try {
    const previous = await ordersRepo.getOrderById(req.params.id);
    if (!previous) return sendJsonError(res, 404, 'Order not found');
    const updated = await ordersRepo.updateOrder(req.params.id, req.body);
    return res.json(updated);
  } catch (e) {
    console.error('[API] Failed to update order', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to update order');
  }
});
ordersRouter.post('/:id/cancel', async (req, res) => {
  try {
    const existing = await ordersRepo.getOrderById(req.params.id);
    if (!existing) return sendJsonError(res, 404, 'Order not found');
    const updated = await ordersRepo.updateOrder(req.params.id, { status: 'cancelled', deliveryStatus: 'cancelled' });
    return res.json(updated);
  } catch (e) {
    console.error('[API] Failed to cancel order', e && e.message ? e.message : e);
    return sendJsonError(res, 500, 'Unable to cancel order');
  }
});

app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/auth', authRouter);

// Auth: request password reset
app.post('/api/auth/forgot', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await usersRepo.findByEmail(email);
    // Always respond success to avoid user enumeration
    if (!user) return res.json({ success: true });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await usersRepo.updateUser(user.id, { resetPasswordHash: tokenHash, resetPasswordExpiry: Date.now() + (60 * 60 * 1000) });

    const frontendBase = getFrontendBase(req);
    const resetLink = `${frontendBase}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    let emailed = false;
    try { emailed = await sendPasswordResetEmail({ email, resetLink }); } catch (e) { console.warn('Failed to send reset email', e && e.message ? e.message : e); }

    if (!emailed && (process.env.NODE_ENV || 'development') === 'development') console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);
    return res.json({ success: true });
  } catch (e) { console.error('[API] Forgot password error', e && e.message ? e.message : e); return res.json({ success: true }); }
});

// Auth: reset password using token
app.post('/api/auth/reset', async (req, res) => {
  try {
    const { email, token, password } = req.body || {};
    if (!email || !token || !password) return res.status(400).json({ error: 'Email, token and new password are required' });
    if (!String(password).match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)) return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and numbers' });

    const user = await usersRepo.findByEmail(String(email).trim().toLowerCase());
    if (!user || !user.resetPasswordHash || !user.resetPasswordExpiry) return res.status(400).json({ error: 'Invalid or expired token' });
    if (Date.now() > Number(user.resetPasswordExpiry)) return res.status(400).json({ error: 'Token has expired' });

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    if (tokenHash !== user.resetPasswordHash) return res.status(400).json({ error: 'Invalid token' });

    const bcryptHash = await bcrypt.hash(String(password), 10);
    await usersRepo.updateUser(user.id, {
      password: bcryptHash,
      passwordHash: null,
      passwordSalt: null,
      hashedPassword: null,
      resetPasswordHash: null,
      resetPasswordExpiry: null,
    });
    try { await activityRepo.addActivityLog({ id: uuidv4(), userId: user.id, userName: user.name, userRole: user.role, action: 'reset password', targetType: 'auth', timestamp: new Date().toISOString() }); } catch (e) { console.warn('Failed to log password reset activity', e && e.message ? e.message : e); }

    return res.json({ success: true });
  } catch (e) { console.error('[API] Password reset error', e && e.message ? e.message : e); return res.status(500).json({ error: 'Unable to set new password' }); }
});

// Update an order (partial updates allowed)
app.put('/api/orders/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const previous = await ordersRepo.getOrderById(id);
    if (!previous) return res.status(404).json({ error: 'Order not found' });

    const updated = await ordersRepo.updateOrder(id, req.body);

    const statusChanged = String(previous.status || '') !== String(updated.status || '');
    const deliveryStatusChanged = String(previous.deliveryStatus || '') !== String(updated.deliveryStatus || '');
    if (statusChanged || deliveryStatusChanged) {
      try { console.log('[Orders] Status changed for order', updated.id, 'previous:', { status: previous.status, deliveryStatus: previous.deliveryStatus }, 'updated:', { status: updated.status, deliveryStatus: updated.deliveryStatus }); void sendOrderStatusEmailToBuyer(updated); } catch (e) { console.error('[Orders] Failed to trigger status email for', updated.id, e); }
    }

    try { if (io) io.to(`user_${updated.buyerId}`).emit('order:update', updated); } catch (e) { console.warn('[Orders] emit update failed', e && e.message ? e.message : e); }

    try {
      await activityRepo.addActivityLog({ id: uuidv4(), userId: req.body.userId || updated.farmerId || updated.buyerId || 'system', userName: req.body.userName || updated.farmerName || updated.buyerName || 'System', userRole: req.body.userRole || 'farmer', action: 'updated order', targetId: updated.id, targetType: 'order', details: `Order updated: ${(req.body.status ? `status -> ${req.body.status}` : JSON.stringify(req.body))}`, timestamp: new Date().toISOString() });
    } catch (e) { console.warn('Failed to log activity for order update', e); }

    return res.json(updated);
  } catch (e) {
    console.error('[API] Failed to update order', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to update order' });
  }
});

app.get('/api/activity', async (req, res) => {
  try {
    const list = await activityRepo.getAllActivityLogs();
    return res.json(list);
  } catch (e) {
    console.error('[API] Failed to fetch activity logs', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to fetch activity logs' });
  }
});

app.post('/api/activity', async (req, res) => {
  try {
    const entry = { id: uuidv4(), ...req.body, timestamp: req.body.timestamp ?? new Date().toISOString() };
    const created = await activityRepo.addActivityLog(entry);
    return res.status(201).json(created);
  } catch (e) {
    console.error('[API] Failed to add activity log', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to add activity log' });
  }
});

// Helper: send wish to a set of users (or all active users)
async function sendWish(message, targetUserIds) {
  const all = await usersRepo.getAllUsers();
  const targets = Array.isArray(targetUserIds) && targetUserIds.length > 0
    ? all.filter(u => targetUserIds.includes(u.id))
    : all.filter(u => u.isActive);

  const entries = [];
  for (const u of targets) {
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
    try { await activityRepo.addActivityLog(e); } catch (err) { console.warn('[AutoWish] failed to log activity', err && err.message ? err.message : err); }
    entries.push(e);
  }
  return entries;
}

// API: trigger an immediate wish (POST body: { message?, userIds? })
app.post('/api/wish/send-now', async (req, res) => {
  try {
    const message = typeof req.body?.message === 'string' && req.body.message.trim().length > 0 ? req.body.message : AUTO_WISH_MESSAGE;
    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : null;
    const entries = await sendWish(message, userIds);
    return res.json({ sent: entries.length, entries });
  } catch (e) { console.error('[API] Failed to send wish', e && e.message ? e.message : e); return res.status(500).json({ error: 'Unable to send wishes' }); }
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
    (async () => {
      try {
        const sent = await sendWish(AUTO_WISH_MESSAGE);
        console.log(`Auto-wish: sent ${sent.length} wishes at ${new Date().toISOString()}`);
      } catch (err) { console.error('Auto-wish error:', err); }
      // schedule subsequent runs every 24h
      setInterval(async () => {
        try {
          const sent = await sendWish(AUTO_WISH_MESSAGE);
          console.log(`Auto-wish: sent ${sent.length} wishes at ${new Date().toISOString()}`);
        } catch (err) { console.error('Auto-wish error:', err); }
      }, 24 * 60 * 60 * 1000);
    })();
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
        create: 'POST /api/auth/signup',
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
app.post('/api/notifications', async (req, res) => {
  try {
    const incoming = {
      id: String(req.body?.id || uuidv4()),
      ...req.body,
      timestamp: req.body?.timestamp || new Date().toISOString(),
      read: Boolean(req.body?.read),
    };
    const created = await notificationsRepo.createNotification(incoming);
    try {
      if (io) io.to(`user_${created.userId}`).emit('notification:new', created);
    } catch (e) {
      console.warn('[Notifications] emit failed', e && e.message ? e.message : e);
    }
    return res.status(201).json(created);
  } catch (e) {
    console.error('[API] Failed to create notification', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to create notification' });
  }
});

app.put('/api/notifications/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await notificationsRepo.getNotificationById(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updated = await notificationsRepo.updateNotification(id, req.body);
    try { if (io) io.to(`user_${updated.userId}`).emit('notification:update', updated); } catch (e) { console.warn('[Notifications] emit update failed', e && e.message ? e.message : e); }
    return res.json(updated);
  } catch (e) { console.error('[API] Failed to update notification', e && e.message ? e.message : e); return res.status(500).json({ error: 'Unable to update notification' }); }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await notificationsRepo.getNotificationById(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await notificationsRepo.deleteNotification(id);
    try { if (io) io.to(`user_${existing.userId}`).emit('notification:delete', { id: existing.id }); } catch (e) { console.warn('[Notifications] emit delete failed', e && e.message ? e.message : e); }
    return res.json({ success: true });
  } catch (e) { console.error('[API] Failed to delete notification', e && e.message ? e.message : e); return res.status(500).json({ error: 'Unable to delete notification' }); }
});

// Upgrade to HTTP server with Socket.IO
const http = require('http');
const server = http.createServer(app);
let io;
try {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: allowedOrigin, methods: ['GET', 'POST'], credentials: true },
    transports: ['polling', 'websocket'],
    pingInterval: 25000,
    pingTimeout: 60000,
    connectTimeout: 45000,
  });

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
const listenTarget = PORT || 4000;
const listenHost = process.env.HOST || '0.0.0.0';

// Debug endpoint to check SMTP and OTP configuration
app.get('/api/debug/otp-config', (req, res) => {
  if (process.env.DEBUG_OTP !== 'true') return res.status(403).json({ error: 'Debug mode not enabled' });
  res.json({
    brevo: process.env.BREVO_API_KEY ? '✓ Brevo API key set' : '✗ BREVO_API_KEY missing',
    from: process.env.EMAIL_FROM ? `✓ ${process.env.EMAIL_FROM}` : '✗ EMAIL_FROM missing',
    fromName: process.env.FROM_NAME || 'not set (defaults to "Farm Direct")',
    frontendUrl: process.env.FRONTEND_URL || '✗ missing',
  });
});

app.use((_, res) => res.status(404).json({ success: false, error: 'Not found', message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error('[API] Unhandled error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);

  if (err && err.type === 'entity.too.large') {
    return sendJsonError(res, 400, 'Request body too large');
  }

  return sendJsonError(res, 500, 'Internal server error');
});

async function loadFromFirestore() {
  // Enforce Firestore as the single source of truth.
  if (process.env.USE_FIRESTORE !== 'true') {
    console.warn('[Startup] USE_FIRESTORE!=true — server running without Firestore is not supported in this deployment. No local JSON will be read or written.');
    return;
  }
  try {
    // Firestore mode: verify connectivity before starting server.
    if (!firestoreDb) throw new Error('Firestore `db` is not initialized');
    // perform a simple read to validate permissions/connectivity
    await firestoreDb.collection('users').limit(1).get();
    console.log('[Firestore] Data layer reachable');
  } catch (e) {
    console.error('[Firestore] Initialization check failed:', e && e.stack ? e.stack : e);
    throw e;
  }
}

// Start server only after env validation and Firestore readiness
(async () => {
  try {
    validateStartupEnv();
    await loadFromFirestore();
    server.listen(listenTarget, listenHost, () => console.log(`Server running on port ${listenTarget}`));
  } catch (err) {
    console.error('[Startup] Aborting due to startup failure:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
