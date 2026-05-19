const brevo = require('@getbrevo/brevo');

// Build a sendTransacEmail function and payload factory that works
// with either the older generated SDK (TransactionalEmailsApi) or
// the newer BrevoClient shape.
let sendTransacEmailFunc;
let makePayload;

if (typeof brevo.TransactionalEmailsApi === 'function') {
  const apiInstance = new brevo.TransactionalEmailsApi();
  try {
    apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;
  } catch (e) {
    if (typeof apiInstance.setApiKey === 'function' && brevo.TransactionalEmailsApiApiKeys) {
      apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
    }
  }

  sendTransacEmailFunc = (payload) => apiInstance.sendTransacEmail(payload);

  makePayload = (to, subject, html, text) => {
    const sendSmtpEmail = (typeof brevo.SendSmtpEmail === 'function') ? new brevo.SendSmtpEmail() : {};
    sendSmtpEmail.subject = subject || '';
    sendSmtpEmail.htmlContent = html || '';
    sendSmtpEmail.textContent = text || '';
    sendSmtpEmail.sender = { name: process.env.FROM_NAME || 'Farm Direct', email: process.env.EMAIL_FROM || process.env.FROM_EMAIL };
    sendSmtpEmail.to = Array.isArray(to) ? to.map(t => (typeof t === 'string' ? { email: t } : { email: t.email, name: t.name })) : [{ email: to }];
    return sendSmtpEmail;
  };

} else if (brevo.BrevoClient || brevo.Brevo) {
  const BrevoClient = brevo.BrevoClient || brevo.Brevo;
  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

  sendTransacEmailFunc = (payload) => client.transactionalEmails.sendTransacEmail(payload);

  makePayload = (to, subject, html, text) => ({
    subject: subject || '',
    htmlContent: html || '',
    textContent: text || '',
    sender: { name: process.env.FROM_NAME || 'Farm Direct', email: process.env.EMAIL_FROM || process.env.FROM_EMAIL },
    to: Array.isArray(to) ? to.map(t => (typeof t === 'string' ? { email: t } : { email: t.email, name: t.name })) : [{ email: to }],
  });

} else {
  throw new Error('@getbrevo/brevo SDK not supported in this environment');
}

async function sendTransactionalEmail({ to, subject, html, text, tag = 'Transactional' }) {
  if (!to) throw new Error('No recipient provided');
  try {
    const payload = makePayload(to, subject, html, text);
    const resp = await sendTransacEmailFunc(payload);
    console.log(`[EmailService:${tag}] Sent to ${Array.isArray(to) ? to.join(',') : to}`);
    return resp;
  } catch (err) {
    console.error(`[EmailService:${tag}] Send failed:`, err && err.message ? err.message : err);
    throw err;
  }
}

async function sendAccountCreatedEmail(user) {
  if (!user || !user.email) return false;
  const role = (user.role || '').toLowerCase();
  const subject = role === 'farmer' ? 'Your Farmer account has been created successfully' : 'Your Buyer account has been created successfully';
  const html = `
    <html><body>
      <h1>${subject}</h1>
      <p>Hi ${user.name || 'User'},</p>
      <p>Your ${role === 'farmer' ? 'Farmer' : 'Buyer'} account has been created successfully. You can now sign in and start using Farm Direct.</p>
      <p>Thank you for joining Farm Direct.</p>
    </body></html>
  `;
  try {
    await sendTransactionalEmail({ to: user.email, subject, html, tag: 'Account Created' });
    return true;
  } catch (e) {
    console.warn('[EmailService] sendAccountCreatedEmail failed:', e && e.message ? e.message : e);
    return false;
  }
}

async function sendPasswordResetEmail(email, resetLink) {
  if (!email) return false;
  const subject = 'Password reset request';
  const html = `
    <html><body>
      <p>You requested a password reset. Click the link below to reset your password (valid for 1 hour):</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
    </body></html>
  `;
  try {
    await sendTransactionalEmail({ to: email, subject, html, tag: 'Password Reset' });
    return true;
  } catch (e) {
    console.warn('[EmailService] sendPasswordResetEmail failed:', e && e.message ? e.message : e);
    return false;
  }
}

async function sendOrderPlacedToBuyer(order) {
  if (!order) return false;
  const to = order.buyerEmail || order.buyerEmail || '';
  if (!to) return false;
  const subject = `Order placed successfully: ${order.productName || order.id}`;
  const html = `
    <html><body>
      <h1>Order placed successfully</h1>
      <p>Hello ${order.buyerName || 'Buyer'},</p>
      <p>Your order has been placed successfully.</p>
      <ul>
        <li><strong>Product:</strong> ${order.productName || 'N/A'}</li>
        <li><strong>Quantity:</strong> ${order.quantity ?? 'N/A'}</li>
        <li><strong>Total Price:</strong> ${order.totalPrice ?? 'N/A'}</li>
        <li><strong>Order ID:</strong> ${order.id}</li>
      </ul>
      <p>Thank you for shopping with Farm Direct.</p>
    </body></html>
  `;
  try {
    await sendTransactionalEmail({ to, subject, html, tag: 'Order Placed Buyer' });
    return true;
  } catch (e) {
    console.warn('[EmailService] sendOrderPlacedToBuyer failed:', e && e.message ? e.message : e);
    return false;
  }
}

async function sendOrderPlacedToFarmer(order) {
  if (!order) return false;
  const to = order.farmerEmail || '';
  const buyerName = order.buyerName || 'Buyer';
  if (!to) return false;
  const subject = `New order received: ${order.productName || order.id}`;
  const html = `
    <html><body>
      <h1>New order received</h1>
      <p>Hello ${order.farmerName || 'Farmer'},</p>
      <p>You have received a new order from ${buyerName}.</p>
      <ul>
        <li><strong>Product:</strong> ${order.productName || 'N/A'}</li>
        <li><strong>Quantity:</strong> ${order.quantity ?? 'N/A'}</li>
        <li><strong>Order ID:</strong> ${order.id}</li>
      </ul>
      <p>Please review and process this order in your dashboard.</p>
    </body></html>
  `;
  try {
    await sendTransactionalEmail({ to, subject, html, tag: 'Order Placed Farmer' });
    return true;
  } catch (e) {
    console.warn('[EmailService] sendOrderPlacedToFarmer failed:', e && e.message ? e.message : e);
    return false;
  }
}

async function sendOrderStatusUpdateToBuyer(order, status) {
  if (!order) return false;
  const to = order.buyerEmail || '';
  if (!to) return false;
  const s = String(status || order.status || order.deliveryStatus || '').toLowerCase();
  let subject = 'Order update';
  let message = 'Your order status has been updated.';
  if (s === 'accepted') {
    subject = `Order accepted: ${order.productName || order.id}`;
    message = 'Your order has been accepted.';
  } else if (s === 'rejected') {
    subject = `Order rejected: ${order.productName || order.id}`;
    message = 'Your order has been rejected.';
  } else if (s === 'out-for-delivery' || s === 'out for delivery') {
    subject = `Out for delivery: ${order.productName || order.id}`;
    message = 'Your order is out for delivery.';
  } else if (s === 'delivered') {
    subject = `Delivered successfully: ${order.productName || order.id}`;
    message = 'Your order has been delivered successfully.';
  }

  const html = `
    <html><body>
      <p>Hello ${order.buyerName || 'Buyer'},</p>
      <p>${message}</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Product:</strong> ${order.productName || 'N/A'}</p>
    </body></html>
  `;
  try {
    await sendTransactionalEmail({ to, subject, html, tag: 'Order Status Buyer' });
    return true;
  } catch (e) {
    console.warn('[EmailService] sendOrderStatusUpdateToBuyer failed:', e && e.message ? e.message : e);
    return false;
  }
}

module.exports = {
  sendTransactionalEmail,
  sendAccountCreatedEmail,
  sendPasswordResetEmail,
  sendOrderPlacedToBuyer,
  sendOrderPlacedToFarmer,
  sendOrderStatusUpdateToBuyer,
};
