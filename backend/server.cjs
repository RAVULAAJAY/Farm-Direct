require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Initialize SMTP transporter once (reuse for all emails)
let smtpTransporter = null;
const SMTP_HOST = process.env.SMTP_HOST;
if (SMTP_HOST) {
  try {
    const nodemailer = require('nodemailer');
    smtpTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      // Render free instances can have slower warm-up/network handshake times.
      connectionTimeout: 30000,
      socketTimeout: 30000,
    });

    // Skip startup verify to avoid cold-start/network probe timeouts on Render.
    // Runtime send attempts are still performed and logged with exact errors.
    console.log(`[SMTP] Configured for host ${SMTP_HOST}; verification deferred to first send attempt.`);
  } catch (e) {
    console.warn('[SMTP] Initialization failed, emails will be logged to console', e && e.message ? e.message : e);
    smtpTransporter = null;
  }
} else {
  console.log('[SMTP] Not configured - outgoing emails will be logged to the server console');
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
  const configuredBase = (process.env.FRONTEND_BASE || 'http://localhost:8080').trim();
  return (requestOrigin || configuredBase).replace(/\/$/, '');
}

async function sendPasswordResetEmail({ email, resetLink }) {
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) {
    console.log(`[Password Reset] SMTP not configured, reset link: ${resetLink}`);
    return false;
  }
  if (smtpTransporter) {
    try {
      console.log(`[Password Reset] Sending email to ${email} via configured SMTP...`);
      const info = await smtpTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@farm-direct.local',
        to: email,
        subject: 'Password reset request',
        text: `You requested a password reset. Use this link to reset your password (valid for 1 hour): ${resetLink}`,
        html: `<p>You requested a password reset. Click the link below to reset your password (valid for 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      });
      console.log(`[Password Reset] Email sent successfully to ${email}. Message ID: ${info.messageId}`);
      return true;
    } catch (e) {
      console.warn(`[Password Reset] SMTP error: ${e?.message || e}. Falling back to console log.`);
      console.log(`[Password Reset] Reset link for ${email}: ${resetLink}`);
      return false;
    }
  }

  console.log(`[Password Reset] SMTP not configured properly. Reset link for ${email}: ${resetLink}`);
  return false;
}

async function sendTransactionalEmail({ to, subject, text, html, tag }) {
  if (!to) return false;

  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@farm-direct.local',
        to,
        subject,
        text,
        html,
      });
      return true;
    } catch (e) {
      console.warn(`[${tag}] Failed to send SMTP email: ${e?.message || e}`);
      console.log(`[${tag}] Fallback log for ${to}`);
      console.log(`[${tag}] Subject: ${subject}`);
      console.log(`[${tag}] Body: ${text}`);
      return false;
    }
  }

  console.log(`[${tag}] SMTP not configured. Email to ${to}`);
  console.log(`[${tag}] Subject: ${subject}`);
  console.log(`[${tag}] Body: ${text}`);
  return false;
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

  if (farmerEmail) {
    const farmerText = [
      `Hello ${farmerName},`,
      '',
      'A new order has been placed successfully by a buyer.',
      '',
      'Buyer details:',
      `Name: ${buyerName}`,
      `Email: ${buyerEmail || 'N/A'}`,
      `Phone: ${buyerPhone || 'N/A'}`,
      `Location: ${buyerLocation || 'N/A'}`,
      '',
      'Complete order details:',
      details,
      '',
      'Please review and process this order in your dashboard.',
    ].join('\n');

    if (smtpTransporter) {
      console.log('[Order Placement Farmer] Sending to', farmerEmail);
      void smtpTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@farm-direct.local',
        to: farmerEmail,
        subject: `New order placed: ${order.productName || order.id}`,
        text: farmerText,
        html: `<p>Hello ${farmerName},</p><p>A new order has been placed successfully by a buyer.</p><p><strong>Buyer details</strong><br/>Name: ${buyerName}<br/>Email: ${buyerEmail || 'N/A'}<br/>Phone: ${buyerPhone || 'N/A'}<br/>Location: ${buyerLocation || 'N/A'}</p><p><strong>Complete order details</strong><br/><pre>${details}</pre></p><p>Please review and process this order in your dashboard.</p>`,
      }).catch(e => {
        console.warn('[Order Placement Farmer] SMTP send failed, falling back to log', e && e.message ? e.message : e);
        console.log('[Order Placement Farmer] Email to', farmerEmail);
        console.log('[Order Placement Farmer] Subject:', `New order placed: ${order.productName || order.id}`);
        console.log('[Order Placement Farmer] Body:', farmerText);
      });
    } else {
      void sendTransactionalEmail({
        to: farmerEmail,
        subject: `New order placed: ${order.productName || order.id}`,
        text: farmerText,
        html: `<p>Hello ${farmerName},</p><p>A new order has been placed successfully by a buyer.</p><p><strong>Buyer details</strong><br/>Name: ${buyerName}<br/>Email: ${buyerEmail || 'N/A'}<br/>Phone: ${buyerPhone || 'N/A'}<br/>Location: ${buyerLocation || 'N/A'}</p><p><strong>Complete order details</strong><br/><pre>${details}</pre></p><p>Please review and process this order in your dashboard.</p>`,
        tag: 'Order Placement Farmer',
      });
    }
  }

  if (buyerEmail) {
    const buyerText = [
      `Hello ${buyerName},`,
      '',
      'Your order has been placed successfully.',
      `Order name: ${order.productName || 'N/A'}`,
      '',
      'Order details:',
      details,
      '',
      'Thank you for shopping with Farm Direct.',
    ].join('\n');

    if (smtpTransporter) {
      console.log('[Order Placement Buyer] Sending to', buyerEmail);
      void smtpTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@farm-direct.local',
        to: buyerEmail,
        subject: `Order confirmed: ${order.productName || order.id}`,
        text: buyerText,
        html: `<p>Hello ${buyerName},</p><p>Your order has been placed successfully.</p><p><strong>Order name:</strong> ${order.productName || 'N/A'}</p><p><strong>Order details</strong><br/><pre>${details}</pre></p><p>Thank you for shopping with Farm Direct.</p>`,
      }).catch(e => {
        console.warn('[Order Placement Buyer] SMTP send failed, falling back to log', e && e.message ? e.message : e);
        console.log('[Order Placement Buyer] Email to', buyerEmail);
        console.log('[Order Placement Buyer] Subject:', `Order confirmed: ${order.productName || order.id}`);
        console.log('[Order Placement Buyer] Body:', buyerText);
      });
    } else {
      void sendTransactionalEmail({
        to: buyerEmail,
        subject: `Order confirmed: ${order.productName || order.id}`,
        text: buyerText,
        html: `<p>Hello ${buyerName},</p><p>Your order has been placed successfully.</p><p><strong>Order name:</strong> ${order.productName || 'N/A'}</p><p><strong>Order details</strong><br/><pre>${details}</pre></p><p>Thank you for shopping with Farm Direct.</p>`,
        tag: 'Order Placement Buyer',
      });
    }
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
  const { buyerEmail, buyerName } = getOrderPartyDetails(order);
  if (!buyerEmail) return;

  const { subject, message } = getOrderStatusEmailMessage(order);
  const details = buildOrderDetailsText(order);
  const text = [
    `Hello ${buyerName},`,
    '',
    message,
    '',
    `Order name: ${order.productName || 'N/A'}`,
    '',
    'Latest order details:',
    details,
  ].join('\n');

  await sendTransactionalEmail({
    to: buyerEmail,
    subject,
    text,
    html: `<p>Hello ${buyerName},</p><p>${message}</p><p><strong>Order name:</strong> ${order.productName || 'N/A'}</p><p><strong>Latest order details</strong><br/><pre>${details}</pre></p>`,
    tag: 'Order Status Buyer',
  });
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
  process.env.FRONTEND_BASE,
  'http://localhost:8080',
  'http://localhost:3000',
].filter(Boolean);
app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    return callback(new Error('CORS not allowed from this origin: ' + origin), false);
  },
  credentials: true,
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
});

// Send OTP to an email for verification (used during signup)
app.post('/api/auth/send-otp', async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // create 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

  // remove existing for email
  otps = otps.filter((e) => e.email !== email);
  otps.push({ email, otpHash, expiresAt });
  saveOtps(otps);

  try {
    if (!smtpTransporter) {
      console.log(`[OTP] SMTP not configured, OTP for ${email}: ${otp}`);
      return res.json({ success: true, message: 'OTP generated (SMTP not configured - check console)' });
    }

    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@farm-direct.local';
    try {
      const info = await smtpTransporter.sendMail({
        from: fromAddress,
        to: email,
        subject: 'Your verification code',
        text: `Your FarmDirect verification code is ${otp}. It expires in 5 minutes.`,
        html: `<p>Your FarmDirect verification code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
      });
      console.log(`[OTP] SMTP Email sent to ${email}. Message ID: ${info.messageId}`);
      return res.json({ success: true, message: 'OTP sent to your email' });
    } catch (smtpErr) {
      console.warn('[OTP] SMTP send failed, attempting Brevo HTTP API fallback:', smtpErr && smtpErr.message ? smtpErr.message : smtpErr);

      // Try Brevo HTTP API fallback if API key is available
      const brevoKey = process.env.BREVO_API_KEY;
      if (!brevoKey) {
        console.error('[OTP] No BREVO_API_KEY in env; SMTP failed and API fallback not available');
        console.error('[OTP] SMTP Error details:', smtpErr);
        console.log(`[OTP] Fallback - OTP for ${email}: ${otp}`);
        const debugOtp = process.env.DEBUG_OTP === 'true' ? otp : undefined;
        return res.status(500).json({ error: 'Failed to send OTP (SMTP failed, no API key)', fallback: debugOtp, debugOtp });
      }

      try {
        const body = {
          sender: { name: 'FarmDirect', email: fromAddress },
          to: [{ email }],
          subject: 'Your verification code',
          textContent: `Your FarmDirect verification code is ${otp}. It expires in 5 minutes.`,
          htmlContent: `<p>Your FarmDirect verification code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
        };

        const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => 'no response body');
          console.error('[OTP] Brevo HTTP API send failed:', resp.status, text);
          console.log(`[OTP] Fallback - OTP for ${email}: ${otp}`);
          const debugOtp = process.env.DEBUG_OTP === 'true' ? otp : undefined;
          return res.status(500).json({ error: 'Failed to send OTP (Brevo API failed)', fallback: debugOtp, debugOtp, brevoStatus: resp.status });
        }

        const data = await resp.json().catch(() => ({}));
        console.log('[OTP] Brevo HTTP API email sent successfully', data);
        return res.json({ success: true, message: 'OTP sent via Brevo API' });
      } catch (apiErr) {
        console.error('[OTP] Brevo API HTTP request failed:', apiErr && apiErr.message ? apiErr.message : apiErr);
        console.log(`[OTP] Fallback - OTP for ${email}: ${otp}`);
        const debugOtp = process.env.DEBUG_OTP === 'true' ? otp : undefined;
        return res.status(500).json({ error: 'Failed to send OTP (API HTTP failed)', fallback: debugOtp, debugOtp });
      }
    }
  } catch (e) {
    console.error('[OTP] Unexpected error in send-otp:', e && e.message ? e.message : e);
    console.log(`[OTP] Fallback - OTP for ${email}: ${otp}`);
    const debugOtp = process.env.DEBUG_OTP === 'true' ? otp : undefined;
    res.status(500).json({ error: 'Failed to send OTP. Please try again.', fallback: debugOtp, debugOtp });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const otp = String((req.body && req.body.otp) || '').trim();
  if (!email || !otp) return res.status(400).json({ error: 'Email and otp are required' });

  const entryIndex = otps.findIndex((e) => e.email === email);
  if (entryIndex < 0) return res.status(400).json({ error: 'OTP not found or expired' });

  const entry = otps[entryIndex];
  if (Date.now() > Number(entry.expiresAt)) {
    otps.splice(entryIndex, 1);
    saveOtps(otps);
    return res.status(400).json({ error: 'OTP expired' });
  }

  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  if (otpHash !== entry.otpHash) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // valid - remove entry
  otps.splice(entryIndex, 1);
  saveOtps(otps);

  res.json({ success: true });
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

  // Try to send email via nodemailer if configured, otherwise log
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
      secure: process.env.SMTP_SECURE ? '✓ ' + process.env.SMTP_SECURE : '✗ missing (default: false)',
      user: process.env.SMTP_USER ? '✓ set' : '✗ missing',
      pass: process.env.SMTP_PASS ? '✓ set (' + process.env.SMTP_PASS.substring(0, 10) + '...)' : '✗ missing',
      emailFrom: process.env.EMAIL_FROM ? '✓ ' + process.env.EMAIL_FROM : '✗ missing',
    },
    brevo: {
      apiKey: process.env.BREVO_API_KEY ? '✓ set (' + process.env.BREVO_API_KEY.substring(0, 10) + '...)' : '✗ missing',
    },
    transporter: smtpTransporter ? '✓ initialized' : '✗ not initialized',
  });
});

(async () => {
  server.listen(listenTarget, listenHost, () => console.log(`API server running on ${listenHost}:${listenTarget}`));
})();
