const brevo = require('@getbrevo/brevo');

const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const sendOtpEmail = async (email, otp) => {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = "Your OTP Code";

    sendSmtpEmail.htmlContent = `
      <h2>Your OTP is: ${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    sendSmtpEmail.sender = {
      name: "Farm Direct",
      email: process.env.FROM_EMAIL,
    };

    sendSmtpEmail.to = [
      {
        email: email,
      },
    ];

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("OTP Email Sent Successfully:", result);

  } catch (error) {
    console.error("Brevo Email Error:", error);
    throw error;
  }
};

module.exports = sendOtpEmail;
