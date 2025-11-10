const express = require('express');
const admin = require('../config/firebaseAdmin');
const { checkValidationToken } = require('../utils/otpStore');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for OTP endpoints
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 OTP requests per windowMs
  message: { message: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate OTP endpoint - sends OTP via email
router.post('/generate', otpLimiter, async (req, res) => {
  const { phone, email } = req.body || {};

  if (!phone || !email) {
    return res.status(400).json({ 
      message: 'Phone number and email are required.' 
    });
  }

  try {
    const { createOtp } = require('../utils/otpStore');
    const { sendOtpEmail } = require('../utils/emailService');
    
    const identifier = `${phone.trim()}_${email.trim().toLowerCase()}`;
    const otp = createOtp(identifier, 10); // 10 minutes expiry

    await sendOtpEmail(email.trim(), otp);
    
    return res.status(200).json({
      message: 'OTP sent to your email address.'
    });
  } catch (error) {
    console.error('OTP generation error:', error);
    return res.status(500).json({ message: 'Failed to send OTP.' });
  }
});

// Validate OTP endpoint - validates email OTP
router.post('/validate', otpLimiter, async (req, res) => {
  const { phone, email, otp } = req.body || {};

  // Input validation
  if (typeof phone !== 'string' || typeof email !== 'string' || typeof otp !== 'string') {
    return res.status(400).json({ message: 'Invalid input format.' });
  }

  if (!phone || !email || !otp) {
    return res.status(400).json({ 
      message: 'Phone number, email, and OTP are required.' 
    });
  }

  try {
    const { validateOtp } = require('../utils/otpStore');
    const identifier = `${phone.trim()}_${email.trim().toLowerCase()}`;
    const result = validateOtp(identifier, otp.trim());

    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      message: 'OTP validated successfully.',
      validationToken: result.validationToken,
    });
  } catch (error) {
    console.error('OTP validation error:', error);
    return res.status(500).json({ message: 'Failed to validate OTP. Please try again.' });
  }
});

module.exports = router;
