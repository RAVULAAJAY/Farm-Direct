const brevo = require('@getbrevo/brevo');

let sendTransacEmailFunc;
let makeEmailPayload;

// Prefer the older/generated SDK style if available (TransactionalEmailsApi)
if (typeof brevo.TransactionalEmailsApi === 'function') {
  const apiInstance = new brevo.TransactionalEmailsApi();
  try {
    apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;
  } catch (e) {
    // Some SDK builds expose a different key method
    if (typeof apiInstance.setApiKey === 'function' && brevo.TransactionalEmailsApiApiKeys) {
      apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
    }
  }

  sendTransacEmailFunc = (payload) => apiInstance.sendTransacEmail(payload);

  makeEmailPayload = (email, otp) => {
    const sendSmtpEmail = typeof brevo.SendSmtpEmail === 'function'
      ? new brevo.SendSmtpEmail()
      : {};

    if (sendSmtpEmail) {
      sendSmtpEmail.subject = 'Your OTP Code';
      sendSmtpEmail.htmlContent = `\n      <h2>Your OTP is: ${otp}</h2>\n      <p>This OTP expires in 10 minutes.</p>\n    `;
      sendSmtpEmail.sender = { name: 'Farm Direct', email: process.env.EMAIL_FROM };
      sendSmtpEmail.to = [{ email }];
      return sendSmtpEmail;
    }

    return {
      subject: 'Your OTP Code',
      htmlContent: `<h2>Your OTP is: ${otp}</h2><p>This OTP expires in 10 minutes.</p>`,
      sender: { name: 'Farm Direct', email: process.env.EMAIL_FROM },
      to: [{ email }],
    };
  };

} else if (brevo.BrevoClient || brevo.Brevo) {
  const BrevoClient = brevo.BrevoClient || brevo.Brevo;
  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

  sendTransacEmailFunc = (payload) => client.transactionalEmails.sendTransacEmail(payload);

  makeEmailPayload = (email, otp) => ({
    subject: 'Your OTP Code',
    htmlContent: `<h2>Your OTP is: ${otp}</h2><p>This OTP expires in 10 minutes.</p>`,
    sender: { name: 'Farm Direct', email: process.env.EMAIL_FROM },
    to: [{ email }],
  });

} else {
  throw new Error('@getbrevo/brevo SDK not supported in this environment');
}

const sendOtpEmail = async (email, otp) => {
  try {
    const payload = makeEmailPayload(email, otp);
    const response = await sendTransacEmailFunc(payload);
    console.log('OTP Email Sent:', response);
    return response;
  } catch (error) {
    console.error('Brevo Error:', error);
    throw error;
  }
};

module.exports = sendOtpEmail;
