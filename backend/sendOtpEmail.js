const emailService = require('./services/emailService');

module.exports = async function sendOtpEmail(email, otp) {
  if (!email) throw new Error('Email required for OTP');
  return emailService.sendOtpEmail(email, otp);
};
