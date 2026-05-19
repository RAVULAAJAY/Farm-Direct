// SMTP test script
// Usage: set env vars or place farm-direct-api.env in repo root and run `node test-smtp.js`
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), 'farm-direct-api.env') });

const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const port = parseInt(process.env.SMTP_PORT || '587');
const user = process.env.SMTP_USER || process.env.SMTP_LOGIN;
const pass = process.env.SMTP_PASS || process.env.SMTP_KEY;
const from = process.env.EMAIL_FROM || process.env.FROM_EMAIL || user;
const to = process.env.EMAIL_TO || from;

if (!user || !pass) {
  console.error('Missing SMTP_USER or SMTP_PASS. Export them or add to farm-direct-api.env');
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
    const msg = err && err.message ? err.message : String(err);
    console.error('SMTP check failed:', msg);

    // Detect common Brevo / relay issues
    const resp = String(err && err.response ? err.response : '');
    if (/unauthorized ip/i.test(msg) || /unauthorized ip/i.test(resp) || /525 5.7.1/i.test(msg)) {
      console.error('\nDetected: Unauthorized IP address.');
      console.error('Action: Brevo is rejecting the connection from this server IP.');
      console.error('  - If you are using smtp-relay.brevo.com, allowlist your server outbound IP(s) in the Brevo/SIB dashboard.');
      console.error('  - Alternatively, use an SMTP host that accepts authenticated connections from Render, or use Brevo API.');
    } else if (/timeout/i.test(msg) || err && err.code === 'ETIMEDOUT') {
      console.error('\nDetected: Connection timeout.');
      console.error('Action: Try using port 587 (STARTTLS) or 2525. Ensure your hosting provider allows outbound SMTP on that port.');
    } else if (err && err.code === 'EAUTH') {
      console.error('\nDetected: Authentication failure (EAUTH).');
      console.error('Action: Double-check SMTP_LOGIN/SMTP_USER and SMTP_KEY/SMTP_PASS values for typos.');
    }

    process.exit(1);
  }
})();
