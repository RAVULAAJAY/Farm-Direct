const Brevo = require('@getbrevo/brevo');
const fs = require('fs');
const path = require('path');

const DEBUG_LOG = path.resolve(__dirname, '..', 'email-debug.log');

function appendDebug(entry) {
  try { fs.appendFileSync(DEBUG_LOG, JSON.stringify(entry) + '\n'); } catch (e) {}
}

let senderWrapper = null;
function getSenderWrapper() {
  if (senderWrapper) return senderWrapper;
  const apiKey = String(process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) return null;

  if (typeof Brevo.BrevoClient === 'function' || typeof Brevo.Brevo === 'function') {
    const BrevoClient = Brevo.BrevoClient || Brevo.Brevo;
    try {
      const client = new BrevoClient({ apiKey });
      if (client && client.transactionalEmails && typeof client.transactionalEmails.sendTransacEmail === 'function') {
        senderWrapper = { send: (payload) => client.transactionalEmails.sendTransacEmail(payload) };
        return senderWrapper;
      }
    } catch (e) {}
  }

  if (typeof Brevo.TransactionalEmailsApi === 'function') {
    try {
      const apiInstance = new Brevo.TransactionalEmailsApi();
      try { apiInstance.authentications['apiKey'].apiKey = apiKey; } catch (e) {
        if (typeof apiInstance.setApiKey === 'function' && Brevo.TransactionalEmailsApiApiKeys) {
          apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
        }
      }
      if (typeof apiInstance.sendTransacEmail === 'function') {
        senderWrapper = { send: (payload) => apiInstance.sendTransacEmail(payload) };
        return senderWrapper;
      }
    } catch (e) {}
  }

  return null;
}

function formatRecipients(to) {
  if (!to) return '';
  if (Array.isArray(to)) return to.map(t => (typeof t === 'string' ? t : (t && (t.email || t.name) ? (t.email || t.name) : JSON.stringify(t)))).join(', ');
  if (typeof to === 'string') return to;
  if (typeof to === 'object') return to.email || to.name || JSON.stringify(to);
  return String(to);
}

function htmlToText(html) {
  if (!html) return '';
  let text = String(html);
  text = text.replace(/<\s*(?:br|br\/)\s*>/gi, '\n');
  text = text.replace(/<\s*\/\s*p\s*>/gi, '\n');
  text = text.replace(/<\s*\/\s*h[1-6]\s*>/gi, '\n');
  text = text.replace(/<\s*\/\s*li\s*>/gi, '\n');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/\s+\n/g, '\n');
  text = text.replace(/\n{2,}/g, '\n\n');
  return text.trim();
}

function makePayload(to, subject, html, text) {
  const fromEmail = String(process.env.EMAIL_FROM || '').trim() || 'no-reply@farm-direct.local';
  const fromName = String(process.env.FROM_NAME || 'Farm Direct');
  const toArray = Array.isArray(to) ? to.map(t => (typeof t === 'string' ? { email: t } : { email: String(t.email || ''), name: String(t.name || '') } )).filter(t => t.email) : [{ email: String(to || '') }];
  return {
    subject: String(subject || ''),
    htmlContent: String(html || ''),
    textContent: String(text || ''),
    sender: { name: fromName, email: fromEmail },
    to: toArray,
  };
}

async function sendTransactionalEmail({ to, subject, html, text, tag = 'Transactional', debugMeta = {} }) {
  const recipients = formatRecipients(to);
  const sender = getSenderWrapper();
  if (!sender) {
    const err = new Error('BREVO_API_KEY is not configured');
    console.error('[EmailService] BREVO_API_KEY missing — cannot send email');
    appendDebug({ ts: new Date().toISOString(), tag, recipients, error: 'BREVO_API_KEY missing' });
    throw err;
  }

  const finalText = (typeof text === 'string' && text.trim().length > 0) ? text : (html ? htmlToText(html) : (subject || ''));
  const payload = makePayload(to, subject, html, finalText);
  const sendSmtpEmail = payload;

  console.log('[EmailService] Sending email...');
  try { console.log('[EmailService] sendSmtpEmail:', sendSmtpEmail); } catch (e) {}
  try { if (debugMeta.order) console.log('[EmailService] order:', debugMeta.order); } catch (e) {}
  try { if (debugMeta.buyer) console.log('[EmailService] buyer:', debugMeta.buyer); } catch (e) {}
  try { if (debugMeta.farmer) console.log('[EmailService] farmer:', debugMeta.farmer); } catch (e) {}

  appendDebug({ ts: new Date().toISOString(), tag, recipients, payload });

  try {
    const resp = await sender.send(payload);
    console.log('[EmailService] Email sent successfully');
    try { console.log('[EmailService] response:', resp); } catch (e) {}
    appendDebug({ ts: new Date().toISOString(), tag, recipients, response: resp });
    return resp;
  } catch (error) {
    console.error('[EmailService] Send error: ', error);
    try { console.error('[EmailService] error body:', error && (error.response?.body || error.body || error)); } catch (e) {}
    appendDebug({ ts: new Date().toISOString(), tag, recipients, error: (error && (error.response?.body || error.body || String(error))) });
    throw error;
  }
}

async function sendOtpEmail(email, otp) {
  if (!email) throw new Error('Email required for OTP');
  const to = String(email).trim();
  const subject = 'Your Farm Direct OTP code';
  const html = `<html><body><h2>Your OTP is: ${String(otp)}</h2><p>This code expires in 5 minutes.</p></body></html>`;
  const text = `Your OTP is: ${String(otp)}\nThis code expires in 5 minutes.`;
  return sendTransactionalEmail({ to, subject, html, text, tag: 'OTP', debugMeta: { buyer: { email: to } } });
}

async function sendAccountCreatedEmail(user) {
  if (!user || !user.email) throw new Error('User with email required');
  const to = String(user.email).trim();
  const role = String(user.role || '').toLowerCase();
  const subject = role === 'farmer' ? 'Your Farmer account has been created' : 'Your Buyer account has been created';
  const html = `<html><body><h1>${subject}</h1><p>Hi ${String(user.name || 'User')},</p><p>Your account is ready. Sign in to get started.</p></body></html>`;
  const text = `Hi ${String(user.name || 'User')},\n\n${subject}.\n\nSign in to get started.`;
  return sendTransactionalEmail({ to, subject, html, text, tag: 'Account Created', debugMeta: { buyer: user } });
}

async function sendForgotPasswordEmail(email, resetLink) {
  if (!email) throw new Error('Email required for password reset');
  const to = String(email).trim();
  const subject = 'Password reset request';
  const safeLink = String(resetLink || '').trim() || 'reset link not provided';
  const html = `<html><body><p>Click to reset your password:</p><p><a href="${safeLink}">${safeLink}</a></p></body></html>`;
  const text = `Reset your password using the link below:\n${safeLink}`;
  return sendTransactionalEmail({ to, subject, html, text, tag: 'Password Reset' });
}

async function sendOrderPlacedEmail(order) {
  if (!order) throw new Error('Order object required');
  const productName = String(order.productName || 'Unknown product');
  const quantity = order.quantity ?? 'N/A';
  const totalPrice = order.totalPrice ?? 'N/A';
  const orderId = String(order.id || order.orderId || 'N/A');
  const to = String(order.buyerEmail || (order.buyer && order.buyer.email) || '').trim();
  if (!to) throw new Error('Buyer email missing on order');
  const subject = `Order placed successfully: ${productName}`;
  const html = `<html><body><h1>Order placed successfully</h1><p>Hello ${String(order.buyerName || 'Buyer')},</p><ul><li>Product: ${productName}</li><li>Quantity: ${quantity}</li><li>Total Price: ${totalPrice}</li><li>Order ID: ${orderId}</li></ul></body></html>`;
  const text = `Order placed successfully\n\nHello ${String(order.buyerName || 'Buyer')},\nProduct: ${productName}\nQuantity: ${quantity}\nTotal Price: ${totalPrice}\nOrder ID: ${orderId}`;
  return sendTransactionalEmail({ to, subject, html, text, tag: 'Order Placed Buyer', debugMeta: { order, buyer: { email: to } } });
}

async function sendFarmerNewOrderEmail(order) {
  if (!order) throw new Error('Order object required');
  const productName = String(order.productName || 'Unknown product');
  const quantity = order.quantity ?? 'N/A';
  const orderId = String(order.id || order.orderId || 'N/A');
  const to = String(order.farmerEmail || (order.farmer && order.farmer.email) || '').trim();
  if (!to) throw new Error('Farmer email missing on order');
  const buyerName = String(order.buyerName || (order.buyer && order.buyer.name) || 'Buyer');
  const subject = `New order received: ${productName}`;
  const html = `<html><body><h1>New order received</h1><p>Hello ${String(order.farmerName || 'Farmer')},</p><p>You have received a new order from ${buyerName}.</p><ul><li>Product: ${productName}</li><li>Quantity: ${quantity}</li><li>Order ID: ${orderId}</li></ul></body></html>`;
  const text = `New order received\n\nHello ${String(order.farmerName || 'Farmer')},\nYou have received a new order from ${buyerName}.\n\nProduct: ${productName}\nQuantity: ${quantity}\nOrder ID: ${orderId}`;
  return sendTransactionalEmail({ to, subject, html, text, tag: 'Order Placed Farmer', debugMeta: { order, farmer: { email: to } } });
}

async function sendOrderStatusEmail(order, status) {
  if (!order) throw new Error('Order object required');
  const to = String(order.buyerEmail || (order.buyer && order.buyer.email) || '').trim();
  if (!to) throw new Error('Buyer email missing for status update');
  const s = String(status || order.status || order.deliveryStatus || '').toLowerCase();
  let subject = `Order status updated: ${order.productName || order.id}`;
  let message = 'Your order status has been updated.';
  if (s === 'accepted') { subject = `Order accepted: ${order.productName || order.id}`; message = 'Your order has been accepted.'; }
  else if (s === 'rejected') { subject = `Order rejected: ${order.productName || order.id}`; message = 'Your order has been rejected.'; }
  else if (s === 'out-for-delivery' || s === 'out for delivery') { subject = `Out for delivery: ${order.productName || order.id}`; message = 'Your order is out for delivery.'; }
  else if (s === 'delivered') { subject = `Delivered successfully: ${order.productName || order.id}`; message = 'Your order has been delivered successfully.'; }
  const html = `<html><body><p>Hello ${String(order.buyerName || 'Buyer')},</p><p>${message}</p><p>Order ID: ${String(order.id || order.orderId || 'N/A')}</p></body></html>`;
  const text = `Hello ${String(order.buyerName || 'Buyer')},\n\n${message}\n\nOrder ID: ${String(order.id || order.orderId || 'N/A')}`;
  return sendTransactionalEmail({ to, subject, html, text, tag: 'Order Status Buyer', debugMeta: { order, buyer: { email: to } } });
}

module.exports = {
  sendTransactionalEmail,
  sendOtpEmail,
  sendAccountCreatedEmail,
  sendForgotPasswordEmail,
  sendPasswordResetEmail: sendForgotPasswordEmail,
  sendOrderPlacedEmail,
  sendFarmerNewOrderEmail,
  sendOrderStatusEmail,
};
