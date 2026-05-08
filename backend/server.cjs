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
  orders[idx] = { ...orders[idx], ...req.body };
  saveData(ORDERS_FILE, orders);

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

app.use((_,res)=>res.status(404).json({error:'Not found'}));
app.listen(PORT, ()=>console.log(`API server running at http://localhost:${PORT}`));
