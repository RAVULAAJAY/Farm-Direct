const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
// Note: local filesystem persistence removed — Firestore is the single source of truth.
const crypto = require('crypto');
const { promisify } = require('util');
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

const scryptAsync = promisify(crypto.scrypt);

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
  const checks = [
    'JWT_SECRET',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'BREVO_SMTP_USER',
    'BREVO_SMTP_PASS',
    'FRONTEND_URL',
  ];
  const missing = checks.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length > 0) {
    console.warn('[Startup] Missing production env vars:', missing.join(', '));
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

// Notifications persistence is handled via `notificationsRepository`.
// OTPs are ephemeral and stored only in memory (see otpStore helpers).

app.get('/api/users', async (req, res) => {
  try {
    const all = await usersRepo.getAllUsers();
    const safe = all.map(u => {
      const s = { ...u };
      delete s.passwordHash; delete s.passwordSalt; delete s.resetPasswordHash; delete s.resetPasswordExpiry;
      return s;
    });
    return res.json(safe);
  } catch (e) {
    console.error('[API] Failed to fetch users', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    console.log('[Auth] SIGNUP START');
    const incoming = { ...req.body };
    const rawEmail = incoming.email;
    const normalizedEmail = normalizeEmail(rawEmail);
    if (rawEmail && normalizedEmail !== String(rawEmail).trim()) {
      console.warn('[Auth] Email normalization adjusted the input email:', { rawEmail, normalizedEmail });
    }

    const requiredFields = ['name', 'email', 'password', 'role'];
    const missingFields = requiredFields.filter((field) => !String(incoming[field] || '').trim());
    if (missingFields.length > 0) {
      console.warn('[Auth] SIGNUP VALIDATION FAILED:', sanitizeForLog({ missingFields, payload: incoming }));
      return res.status(400).json({ success: false, message: 'Unable to create user', error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    if (!['buyer', 'farmer', 'admin'].includes(String(incoming.role).toLowerCase())) {
      console.warn('[Auth] SIGNUP VALIDATION FAILED: invalid role', sanitizeForLog({ role: incoming.role }));
      return res.status(400).json({ success: false, message: 'Unable to create user', error: 'Invalid role' });
    }

    incoming.email = normalizedEmail;
    const plainPassword = typeof incoming.password === 'string' ? incoming.password : undefined;
    delete incoming.password;

    const user = { id: uuidv4(), ...incoming, isActive: true, joinedDate: new Date().toISOString() };
    if (plainPassword) {
      const salt = crypto.randomBytes(16).toString('hex');
      const derived = (await scryptAsync(plainPassword, salt, 64)).toString('hex');
      user.passwordSalt = salt;
      user.passwordHash = derived;
    }

    console.log('[Firestore] WRITE - users/signup');
    const created = await usersRepo.createUser(user);
    if (!created || !created.id) {
      throw new Error('Firestore returned an empty user document after createUser');
    }
    await activityRepo.addActivityLog({ id: uuidv4(), userId: created.id, userName: created.name, userRole: created.role, action: 'registered account', timestamp: new Date().toISOString() });

    const safe = { ...created };
    delete safe.passwordHash; delete safe.passwordSalt; delete safe.resetPasswordHash; delete safe.resetPasswordExpiry;
    const token = createAuthToken(safe);
    res.status(201).json({ success: true, user: safe, token });
    console.log('[Auth] SIGNUP SUCCESS', { userId: safe.id, email: safe.email });

    try {
      await emailService.sendAccountCreatedEmail(created);
      console.log('[Brevo] ACCOUNT CREATED EMAIL SENT', created.email);
    } catch (mailError) {
      console.error('[Brevo] EMAIL ERROR:', mailError && mailError.message ? mailError.message : mailError);
    }
  } catch (e) {
    console.error('[Auth] SIGNUP ERROR:', e);
    console.error('[Auth] SIGNUP FAILED', e && e.message ? e.message : e);
    res.status(500).json({ success: false, message: 'Unable to create user', error: e && e.message ? e.message : String(e) });
  }
});

// legacy OTP persistence removed; using ephemeral in-memory OTP store (see storeOtp/getOtpEntry)

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

  // Store OTP only in-memory (ephemeral)
  storeOtp(email, otpHash, expiresAt);
  console.log(`[OTP SEND] ✓ OTP stored in-memory for ${email}, expires at: ${new Date(expiresAt).toISOString()}`);
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

  const entry = getOtpEntry(email);
  if (!entry) {
    console.warn(`[OTP VERIFY] ✗ No OTP found for email: ${email}`);
    return res.status(400).json({ error: 'OTP not found or expired' });
  }

  const now = Date.now();
  const expiresAt = Number(entry.expiresAt);
  if (now > expiresAt) {
    const expiredSeconds = Math.floor((now - expiresAt) / 1000);
    console.warn(`[OTP VERIFY] ✗ OTP expired for ${email} (${expiredSeconds}s ago)`);
    deleteOtpEntry(email);
    return res.status(400).json({ error: 'OTP expired' });
  }

  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  if (otpHash !== entry.otpHash) {
    console.warn(`[OTP VERIFY] ✗ Invalid OTP for ${email} (hash mismatch)`);
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // Valid - remove entry
  deleteOtpEntry(email);
  console.log(`[OTP VERIFY] ✓ Email verified successfully for: ${email}`);
  res.json({ success: true, message: 'Email verified successfully' });
});
app.put('/api/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await usersRepo.getUserById(id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const updates = { ...req.body };
    if (typeof updates.email === 'string') {
      updates.email = normalizeEmail(updates.email);
    }
    if (typeof updates.password === 'string' && updates.password.length > 0) {
      if (!updates.oldPassword) return res.status(400).json({ error: 'Current password required to change password' });
      try {
        const oldDerived = (await scryptAsync(String(updates.oldPassword), existing.passwordSalt || '', 64)).toString('hex');
        if (oldDerived !== existing.passwordHash) return res.status(401).json({ error: 'Current password is incorrect' });
      } catch (e) { return res.status(500).json({ error: 'Unable to verify password' }); }

      const salt = crypto.randomBytes(16).toString('hex');
      const derived = (await scryptAsync(updates.password, salt, 64)).toString('hex');
      updates.passwordSalt = salt;
      updates.passwordHash = derived;
      delete updates.password;
      delete updates.oldPassword;
    }

    const updated = await usersRepo.updateUser(id, updates);
    await activityRepo.addActivityLog({ id: uuidv4(), userId: updated.id, userName: updated.name, userRole: updated.role, action: 'updated profile', timestamp: new Date().toISOString() });

    const safe = { ...updated };
    delete safe.passwordHash; delete safe.passwordSalt; delete safe.resetPasswordHash; delete safe.resetPasswordExpiry;
    res.json(safe);
  } catch (e) {
    console.error('[API] Failed to update user', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Unable to update user' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const list = await productsRepo.getAllProducts();
    return res.json(list);
  } catch (e) {
    console.error('[API] Failed to fetch products', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to fetch products' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = { id: uuidv4(), ...req.body };
    const created = await productsRepo.createProduct(product);
    await activityRepo.addActivityLog({ id: uuidv4(), userId: created.farmerId, userName: created.farmerName, userRole: 'farmer', action: 'uploaded product', targetId: created.id, targetType: 'product', timestamp: new Date().toISOString() });
    res.status(201).json(created);
  } catch (e) {
    console.error('[API] Failed to create product', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Unable to create product' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const existing = await productsRepo.getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    const updated = await productsRepo.updateProduct(req.params.id, req.body);
    res.json(updated);
  } catch (e) {
    console.error('[API] Failed to update product', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Unable to update product' });
  }
});

app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const productId = req.params.id;
    const reviewPayload = {
      userId: req.body.userId,
      userName: req.body.userName,
      rating: Number(req.body.rating) || 0,
      title: req.body.title || 'Buyer review',
      content: req.body.content || '',
      verified: req.body.verified ?? true,
      helpful: Number(req.body.helpful) || 0,
      notHelpful: Number(req.body.notHelpful) || 0,
      images: Array.isArray(req.body.images) ? req.body.images : [],
      purchaseVerified: req.body.purchaseVerified ?? true,
    };

    await reviewsRepo.addReview(productId, reviewPayload);
    const updatedProduct = await productsRepo.getProductById(productId);
    return res.status(201).json(updatedProduct);
  } catch (e) {
    console.error('[API] Failed to add review', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to add review' });
  }
});
app.delete('/api/products/:id', async (req, res) => {
  try {
    const existing = await productsRepo.getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    await productsRepo.deleteProduct(req.params.id);
    await activityRepo.addActivityLog({ id: uuidv4(), userId: existing.farmerId, userName: existing.farmerName, userRole: 'farmer', action: 'deleted product', targetId: existing.id, targetType: 'product', timestamp: new Date().toISOString() });
    return res.json({ success: true });
  } catch (e) {
    console.error('[API] Failed to delete product', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to delete product' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const list = await ordersRepo.getAllOrders();
    return res.json(list);
  } catch (e) {
    console.error('[API] Failed to fetch orders', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to fetch orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    console.log('[Orders] Incoming order body:', req.body);
    const buyer = req.body.buyerId ? await usersRepo.getUserById(req.body.buyerId) : null;
    const farmer = req.body.farmerId ? await usersRepo.getUserById(req.body.farmerId) : null;
    const product = req.body.productId ? await productsRepo.getProductById(req.body.productId) : null;

    const order = {
      id: uuidv4(),
      ...req.body,
      buyerEmail: req.body.buyerEmail || (buyer && buyer.email) || '',
      farmerEmail: req.body.farmerEmail || (farmer && farmer.email) || '',
      productName: req.body.productName || (product && product.name) || '',
      buyerName: req.body.buyerName || (buyer && buyer.name) || '',
      farmerName: req.body.farmerName || (farmer && farmer.name) || '',
      orderDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      status: req.body.status || 'pending',
      deliveryStatus: req.body.deliveryStatus || 'pending',
      paymentStatus: req.body.paymentStatus || (req.body.paymentMethod === 'cod' ? 'pending' : 'paid'),
    };

    const created = await ordersRepo.createOrder(order);
    await activityRepo.addActivityLog({ id: uuidv4(), userId: created.buyerId, userName: created.buyerName, userRole: 'buyer', action: 'placed order', targetId: created.id, targetType: 'order', timestamp: new Date().toISOString() });

    try {
      const notif = {
        id: uuidv4(),
        userId: created.farmerId,
        type: 'order',
        title: 'New order received',
        message: `${created.buyerName} placed an order for ${created.productName}`,
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/orders'
      };
      const nf = await notificationsRepo.createNotification(notif);
      if (io) io.to(`user_${created.farmerId}`).emit('notification:new', nf);
      if (io) io.to(`user_${created.farmerId}`).emit('order:placed', created);
    } catch (e) { console.error('[Orders] Error notifying farmer of new order:', e && e.message ? e.message : e); }

    try {
      if (!created.buyerEmail) console.error('[Orders] Missing buyerEmail for order', created.id);
      if (!created.farmerEmail) console.error('[Orders] Missing farmerEmail for order', created.id);
      if (created.buyerEmail && created.farmerEmail) {
        console.log('[Orders] Triggering sendOrderPlacementEmails for', created.id);
        void sendOrderPlacementEmails(created);
      } else {
        console.warn('[Orders] Skipping email sends due to missing email addresses for order', created.id);
      }
    } catch (e) { console.error('[Orders] Failed to trigger order emails for', created.id, e); }

    return res.status(201).json(created);
  } catch (e) {
    console.error('[API] Failed to create order', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to create order' });
  }
});

// Messages
app.get('/api/messages', async (req, res) => {
  try {
    const list = (await messagesRepo.getAllMessages()).map(normalizeMessage);
    return res.json(list);
  } catch (e) {
    console.error('[API] Failed to fetch messages', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to fetch messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const incoming = normalizeMessage(req.body || {});
    const sender = incoming.senderId ? await usersRepo.getUserById(incoming.senderId) : null;

    const existing = incoming.id ? await messagesRepo.getMessageById(incoming.id) : null;
    if (existing) {
      const updated = await messagesRepo.updateMessage(incoming.id, incoming);
      return res.status(200).json(updated);
    }

    const created = await messagesRepo.createMessage(incoming);
    await activityRepo.addActivityLog({ id: uuidv4(), userId: incoming.senderId, userName: incoming.senderName, userRole: sender?.role || 'buyer', action: 'sent message', targetId: created.id, targetType: 'message', details: `To ${incoming.recipientName}`, timestamp: new Date().toISOString() });

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
      await notificationsRepo.createNotification(notif);
      if (io) io.to(`user_${incoming.recipientId}`).emit('notification:new', notif);
      if (io) io.to(`user_${incoming.recipientId}`).emit('message:new', created);
    } catch (e) { console.warn('[Messages] Failed to create/emit notification', e && e.message ? e.message : e); }

    return res.status(201).json(created);
  } catch (e) {
    console.error('[API] Failed to create message', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to create message' });
  }
});

app.put('/api/messages/:id', async (req, res) => {
  try {
    const existing = await messagesRepo.getMessageById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Message not found' });
    const updated = await messagesRepo.updateMessage(req.params.id, { ...existing, ...req.body });
    return res.json(updated);
  } catch (e) {
    console.error('[API] Failed to update message', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to update message' });
  }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    const existing = await messagesRepo.getMessageById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Message not found' });
    await messagesRepo.deleteMessage(req.params.id);
    const sender = existing.senderId ? await usersRepo.getUserById(existing.senderId) : null;
    await activityRepo.addActivityLog({ id: uuidv4(), userId: existing.senderId, userName: existing.senderName, userRole: sender?.role || 'buyer', action: 'deleted message', targetId: existing.id, targetType: 'message', details: `To ${existing.recipientName}`, timestamp: new Date().toISOString() });
    return res.json({ success: true });
  } catch (e) {
    console.error('[API] Failed to delete message', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to delete message' });
  }
});

// Auth: login
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password || '';
    const user = await usersRepo.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.passwordHash || !user.passwordSalt) return res.status(401).json({ error: 'No password set for this account' });

    try {
      const derived = (await scryptAsync(password, user.passwordSalt, 64)).toString('hex');
      if (derived !== user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
    } catch (e) { return res.status(500).json({ error: 'Unable to verify credentials' }); }

    const safe = { ...user };
    delete safe.passwordHash; delete safe.passwordSalt; delete safe.resetPasswordHash; delete safe.resetPasswordExpiry;
    try { await activityRepo.addActivityLog({ id: uuidv4(), userId: user.id, userName: user.name, userRole: user.role, action: 'logged in', targetType: 'auth', timestamp: new Date().toISOString() }); } catch (e) { console.warn('Failed to log login activity', e && e.message ? e.message : e); }
    console.log('[Auth] LOGIN SUCCESS', user.email, user.id);
    return res.json(safe);
  } catch (e) {
    console.error('[Auth] LOGIN FAILED', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to process login' });
  }
});

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

    const salt = crypto.randomBytes(16).toString('hex');
    const derived = (await scryptAsync(String(password), salt, 64)).toString('hex');
    await usersRepo.updateUser(user.id, { passwordSalt: salt, passwordHash: derived, resetPasswordHash: null, resetPasswordExpiry: null });
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
app.get('/api/notifications', async (req, res) => {
  try {
    const userId = req.query.userId ? String(req.query.userId) : null;
    const list = await notificationsRepo.getAllNotifications(userId);
    return res.json(list);
  } catch (e) {
    console.error('[API] Failed to fetch notifications', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to fetch notifications' });
  }
});

app.get('/api/notifications/unread-count', async (req, res) => {
  try {
    const userId = req.query.userId ? String(req.query.userId) : null;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const list = await notificationsRepo.getAllNotifications(userId);
    const count = list.filter(n => !n.read).length;
    return res.json({ unread: count });
  } catch (e) {
    console.error('[API] Failed to fetch unread count', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to fetch unread count' });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
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
    // Prevent obvious duplicates by checking recent notifications for user
    const now = Date.now();
    const recent = await notificationsRepo.getAllNotifications(incoming.userId);
    const dup = recent.find(n => n.type === incoming.type && n.title === incoming.title && Math.abs(new Date(n.timestamp).getTime() - now) < 2000);
    if (dup) return res.status(409).json({ error: 'duplicate' });

    const created = await notificationsRepo.createNotification(incoming);
    try { if (io) io.to(`user_${created.userId}`).emit('notification:new', created); } catch (e) { console.warn('[Notifications] emit failed', e && e.message ? e.message : e); }
    return res.status(201).json(created);
  } catch (e) {
    console.error('[API] Failed to create notification', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to create notification' });
  }
});

// Buyer cancels an order (allowed only before shipping/out-for-delivery/delivered)
app.post('/api/orders/:id/cancel', async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await ordersRepo.getOrderById(id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const disallowedDeliveryStatuses = ['out-for-delivery', 'delivered'];
    const disallowedOrderStatuses = ['shipped', 'delivered', 'cancelled'];
    if (disallowedDeliveryStatuses.includes(String(existing.deliveryStatus)) || disallowedOrderStatuses.includes(String(existing.status))) {
      return res.status(400).json({ error: 'Order cannot be cancelled after shipping or delivery' });
    }

    const updates = { status: 'cancelled', deliveryStatus: 'cancelled' };
    try { if (existing.paymentStatus === 'paid') updates.paymentStatus = 'refunded'; } catch (e) {}

    const updated = await ordersRepo.updateOrder(id, updates);
    await activityRepo.addActivityLog({ id: uuidv4(), userId: updated.buyerId, userName: updated.buyerName, userRole: 'buyer', action: 'cancelled order', targetId: updated.id, targetType: 'order', timestamp: new Date().toISOString() });

    try {
      const notifToFarmer = {
        id: uuidv4(),
        userId: updated.farmerId,
        type: 'order',
        title: 'Order cancelled by buyer',
        message: `${updated.buyerName} cancelled order ${updated.id} for ${updated.productName}`,
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/orders'
      };

      const notifToBuyer = {
        id: uuidv4(),
        userId: updated.buyerId,
        type: 'order',
        title: 'Order cancelled',
        message: `Your order ${updated.id} was cancelled successfully.`,
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/orders'
      };

      const nf1 = await notificationsRepo.createNotification(notifToFarmer);
      const nf2 = await notificationsRepo.createNotification(notifToBuyer);
      if (io) {
        io.to(`user_${nf1.userId}`).emit('notification:new', nf1);
        io.to(`user_${nf2.userId}`).emit('notification:new', nf2);
        io.to(`user_${updated.farmerId}`).emit('order:cancelled', updated);
        io.to(`user_${updated.buyerId}`).emit('order:cancelled', updated);
      }
    } catch (e) { console.warn('Failed to emit cancellation notifications', e && e.message ? e.message : e); }

    return res.json(updated);
  } catch (e) {
    console.error('[API] Failed to cancel order', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Unable to cancel order' });
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
    brevo: process.env.BREVO_API_KEY ? '✓ Brevo API key set' : '✗ BREVO_API_KEY missing',
    from: process.env.EMAIL_FROM ? `✓ ${process.env.EMAIL_FROM}` : '✗ EMAIL_FROM missing',
    fromName: process.env.FROM_NAME || 'not set (defaults to "Farm Direct")',
    frontendUrl: process.env.FRONTEND_URL || '✗ missing',
  });
});

async function loadFromFirestore() {
  // Enforce Firestore as the single source of truth.
  if (process.env.USE_FIRESTORE !== 'true') {
    console.warn('[Startup] USE_FIRESTORE!=true — server running without Firestore is not supported in this deployment. No local JSON will be read or written.');
    return;
  }
  try {
    // Firestore mode: do NOT preload entire collections on startup.
    // Repositories will fetch data on demand to avoid heavy reads and accidental overwrites.
    console.log('[Firestore] Data loaded from Firestore');
  } catch (e) {
    console.error('[Firestore] Initialization check failed:', e && e.message ? e.message : e);
  }
}

(async () => {
  validateStartupEnv();
  await loadFromFirestore();
  server.listen(listenTarget, listenHost, () => console.log(`Server running on port ${listenTarget}`));
})();
