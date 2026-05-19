// SMTP test script
// Usage: set env vars or place farm-direct-api.env in repo root and run `node test-smtp.js`
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), 'farm-direct-api.env') });

const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const port = parseInt(process.env.SMTP_PORT || '587');
const user = process.env.SMTP_LOGIN;
const pass = process.env.SMTP_KEY;
const from = process.env.FROM_EMAIL || user;
const to = process.env.EMAIL_TO || from;

if (!user || !pass) {
  console.error('Missing SMTP_LOGIN or SMTP_KEY. Export them or add to farm-direct-api.env');
  process.exit(2);
}

(async () => {
  const transporter = nodemailer.createTransport({
    host, port, secure: false,
    auth: { user, pass }
  });

  try {
    await transporter.verify();
    console.log('SMTP verification succeeded. Attempting test send...');
    const info = await transporter.sendMail({ from, to, subject: 'Farm Direct SMTP test', text: 'This is a test email from test-smtp.js' });
    console.log('Message sent:', info.messageId || info.response);
    process.exit(0);
  } catch (err) {
    console.error('SMTP check failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
