// Brevo transactional email test script
// Usage: set env vars or place farm-direct-api.env in repo root and run `node test-smtp.js`
const brevo = require('@getbrevo/brevo');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), 'farm-direct-api.env') });

if (!process.env.BREVO_API_KEY) {
  console.error('Missing BREVO_API_KEY. Export it or add to farm-direct-api.env');
  process.exit(2);
}

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

(async () => {
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { email: process.env.FROM_EMAIL || process.env.EMAIL_FROM || 'no-reply@farm-direct.local' };
  sendSmtpEmail.to = [{ email: process.env.EMAIL_TO || sendSmtpEmail.sender.email }];
  sendSmtpEmail.subject = 'Farm Direct Brevo test';
  sendSmtpEmail.textContent = 'This is a test email from test-smtp.js via Brevo';

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Brevo send result:', result);
    process.exit(0);
  } catch (err) {
    console.error('Brevo send failed:', err);
    process.exit(1);
  }
})();
