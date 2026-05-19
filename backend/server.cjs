require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Initialize SMTP transporters (mapped by port) and read envs (support legacy and new names)
const smtpTransportersByPort = {};
const SMTP_HOST = String(process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
// Support both new and legacy env names
const SMTP_USER = String(process.env.SMTP_USER || process.env.SMTP_LOGIN || '').trim();
const SMTP_PASS = String(process.env.SMTP_PASS || process.env.SMTP_KEY || '').trim();
const FROM_EMAIL = String(process.env.EMAIL_FROM || process.env.FROM_EMAIL || '').trim();
const SMTP_CONNECTION_TIMEOUT = Number(process.env.SMTP_CONNECTION_TIMEOUT || 20000);
const SMTP_SOCKET_TIMEOUT = Number(process.env.SMTP_SOCKET_TIMEOUT || 20000);

function getFromAddress() {
  return FROM_EMAIL || SMTP_USER || 'no-reply@farm-direct.local';
}

function getMailSenderCandidates() {
  const preferredFrom = String(FROM_EMAIL || '').trim();
  const loginFrom = String(SMTP_USER || '').trim();
  const candidates = [];

  // Prefer sending from the SMTP login (Brevo-verified) to avoid rejections
  if (loginFrom) {
    candidates.push({
      label: `smtp login sender ${loginFrom}`,
      from: loginFrom,
      replyTo: preferredFrom || loginFrom,
    });
  }

  // If a custom display 'from' is configured, try it as a fallback (but after loginFrom)
  if (preferredFrom && preferredFrom !== loginFrom) {
    candidates.push({
      label: `custom sender ${preferredFrom}`,
      from: preferredFrom,
      replyTo: loginFrom || preferredFrom,
    });
  }

  return candidates;
}

function createSmtpTransport(port, secureOverride) {
  const nodemailer = require('nodemailer');
  const secure = typeof secureOverride === 'boolean' ? secureOverride : port === 465;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    authMethod: 'LOGIN',
    requireTLS: true,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT,
    greetingTimeout: SMTP_CONNECTION_TIMEOUT,
    socketTimeout: SMTP_SOCKET_TIMEOUT,
    family: 4,
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  });

  // Verify right away so we log any connection issues early
  void transporter.verify().then(() => {
    console.log(`[SMTP] Verify OK for ${SMTP_HOST}:${port}`);
  }).catch((err) => {
    console.warn(`[SMTP] Verify failed for ${SMTP_HOST}:${port}:`, err && err.message ? err.message : err);
  });

  return transporter;
}

function getSmtpTransportCandidates() {
  const candidates = [];
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return candidates;

  // Try the configured port first, then common alternates
  const portsToTry = Array.from(new Set([Number(SMTP_PORT || 587), 587, 465, 2525].map(Number)));

  for (const port of portsToTry) {
    if (!port || Number.isNaN(port)) continue;
    if (!smtpTransportersByPort[port]) {
      smtpTransportersByPort[port] = createSmtpTransport(port, port === 465);
    }
    candidates.push({ label: `${SMTP_HOST}:${port}`, transporter: smtpTransportersByPort[port] });
  }

  return candidates;
}

function smtpAvailable() {
  try {
    const candidates = getSmtpTransportCandidates();
    return Array.isArray(candidates) && candidates.length > 0;
  } catch (e) {
    return false;
  }
}

async function sendMailWithFallbacks(mailOptions, tag) {
  const candidates = getSmtpTransportCandidates();
  const senderCandidates = getMailSenderCandidates();

  for (const candidate of candidates) {
    for (const senderCandidate of senderCandidates) {
      try {
        const mergedMailOptions = {
          ...mailOptions,
          from: senderCandidate.from,
          replyTo: senderCandidate.replyTo,
        };
        console.log(`[${tag}] Attempting SMTP send via ${candidate.label} using ${senderCandidate.label}`);
        const info = await candidate.transporter.sendMail(mergedMailOptions);
        console.log(`[${tag}] ✓ SMTP email sent successfully via ${candidate.label} using ${senderCandidate.label}. Message ID: ${info.messageId}`);
        return { ok: true, info, transport: candidate.label, sender: senderCandidate.from };
      } catch (error) {
        const message = error?.message || String(error);
        const errorSummary = {
          code: error?.code,
          command: error?.command,
          responseCode: error?.responseCode,
          response: error?.response,
          message,
        };
        console.warn(`[${tag}] SMTP send failed via ${candidate.label} using ${senderCandidate.label}:`, errorSummary);
        if (candidate === candidates[candidates.length - 1] && senderCandidate === senderCandidates[senderCandidates.length - 1]) {
          throw error;
        }
      }
    }
  }

  throw new Error('SMTP send failed for all configured transports');
}

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  try {
    // Pre-create transports for primary and fallback ports so verify runs at startup
    getSmtpTransportCandidates();
    console.log(`[SMTP] Configured for host ${SMTP_HOST}:${SMTP_PORT} using login ${SMTP_USER}`);
  } catch (e) {
    console.warn('[SMTP] Initialization failed, emails will be logged to console', e && e.message ? e.message : e);
  }
} else {
  console.warn('[SMTP] Missing SMTP_HOST, SMTP_USER, or SMTP_PASS - outgoing emails will be logged to the server console');
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
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) {
    console.log(`[Password Reset] SMTP not configured, reset link: ${resetLink}`);
    return false;
  }
  if (smtpAvailable()) {
    try {
      console.log(`[Password Reset] Sending email to ${email} via configured SMTP...`);
      const result = await sendMailWithFallbacks({
        from: getFromAddress(),
        to: email,
        subject: 'Password reset request',
        text: `You requested a password reset. Use this link to reset your password (valid for 1 hour): ${resetLink}`,
        html: `<p>You requested a password reset. Click the link below to reset your password (valid for 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      }, 'Password Reset');
      console.log(`[Password Reset] Email sent successfully to ${email}. Message ID: ${result.info.messageId}`);
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

  if (smtpAvailable()) {
    try {
      await sendMailWithFallbacks({
        from: getFromAddress(),
        to,
        subject,
        text,
        html,
      }, tag);
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

    if (smtpAvailable()) {
      console.log('[Order Placement Farmer] Sending to', farmerEmail);
      void sendMailWithFallbacks({
        to: farmerEmail,
        subject: `New order placed: ${order.productName || order.id}`,
        text: farmerText,
        html: `<p>Hello ${farmerName},</p><p>A new order has been placed successfully by a buyer.</p><p><strong>Buyer details</strong><br/>Name: ${buyerName}<br/>Email: ${buyerEmail || 'N/A'}<br/>Phone: ${buyerPhone || 'N/A'}<br/>Location: ${buyerLocation || 'N/A'}</p><p><strong>Complete order details</strong><br/><pre>${details}</pre></p><p>Please review and process this order in your dashboard.</p>`,
      }, 'Order Placement Farmer').catch(e => {
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

    if (smtpAvailable()) {
      console.log('[Order Placement Buyer] Sending to', buyerEmail);
      void sendMailWithFallbacks({
        to: buyerEmail,
        subject: `Order confirmed: ${order.productName || order.id}`,
        text: buyerText,
        html: `<p>Hello ${buyerName},</p><p>Your order has been placed successfully.</p><p><strong>Order name:</strong> ${order.productName || 'N/A'}</p><p><strong>Order details</strong><br/><pre>${details}</pre></p><p>Thank you for shopping with Farm Direct.</p>`,
      }, 'Order Placement Buyer').catch(e => {
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

  const fromAddress = getFromAddress();
  const subject = 'Your Farm Direct Verification Code';
  const text = `Your FarmDirect verification code is ${otp}. It expires in 5 minutes.`;
  const html = `<html><body><p>Your <strong>Farm Direct</strong> verification code is:</p><h2 style="color: #2ecc71; font-size: 32px; letter-spacing: 5px;">${otp}</h2><p>This code expires in <strong>5 minutes</strong>.</p><p>If you didn't request this code, please ignore this email.</p></body></html>`;

  console.log('[OTP SEND] SMTP connection state:', smtpAvailable() ? 'ready' : 'not configured');
  console.log('[OTP SEND] From address:', fromAddress);
  console.log('[OTP SEND] OTP generated:', { email, expiresAt: new Date(expiresAt).toISOString() });

  if (!smtpAvailable()) {
    const debugOtp = process.env.DEBUG_OTP === 'true' ? otp : undefined;
    console.error('[OTP SEND] SMTP transporter not configured');
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP SEND] Development fallback OTP for ${email}: ${otp}`);
      return res.json({ success: true, message: 'OTP generated (SMTP not configured)', debugOtp, resend });
    }
    return res.status(503).json({
      error: 'Email service unavailable',
      message: 'OTP could not be sent because SMTP is not configured',
      debugOtp,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const result = await sendMailWithFallbacks({
      from: fromAddress,
      to: email,
      subject,
      text,
      html,
    }, 'OTP SEND');
    return res.json({ success: true, message: resend ? 'OTP resent to your email' : 'OTP sent to your email', resend });
  } catch (smtpErr) {
    console.error('[OTP SEND] ✗ SMTP send failed:', smtpErr?.message || smtpErr);
    console.error('[OTP SEND] Full error:', smtpErr);
    const debugOtp = process.env.DEBUG_OTP === 'true' ? otp : undefined;
    return res.status(502).json({
      error: 'Failed to send OTP via SMTP',
      message: 'Please try again later',
      debugOtp,
      timestamp: new Date().toISOString(),
    });
  }
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
      user: process.env.SMTP_USER || process.env.SMTP_LOGIN ? '✓ set' : '✗ missing',
      pass: process.env.SMTP_PASS || process.env.SMTP_KEY ? (process.env.SMTP_PASS ? '✓ set (' + (process.env.SMTP_PASS || '').substring(0, 10) + '...)' : '✓ set') : '✗ missing',
      fromEmail: process.env.EMAIL_FROM || process.env.FROM_EMAIL ? '✓ ' + (process.env.EMAIL_FROM || process.env.FROM_EMAIL) : '✗ missing',
    },
    transporter: smtpAvailable() ? `✓ ${Object.keys(smtpTransportersByPort).length} transport(s)` : '✗ not initialized',
    frontendUrl: process.env.FRONTEND_URL || '✗ missing',
  });
});

(async () => {
  server.listen(listenTarget, listenHost, () => console.log(`API server running on ${listenHost}:${listenTarget}`));
})();
