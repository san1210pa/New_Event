// In-memory OTP store with expiration
const otpStore = new Map();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function generateOtp(length = 6) {
  const max = 10 ** length;
  const min = 10 ** (length - 1);
  const num = Math.floor(Math.random() * (max - min)) + min;
  return String(num);
}

function createOtp(identifier, expiresInMinutes = 10) {
  const otp = generateOtp(6);
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  
  otpStore.set(identifier, {
    otp,
    expiresAt,
    createdAt: Date.now(),
  });
  
  return otp;
}

function validateOtp(identifier, userOtp) {
  const stored = otpStore.get(identifier);
  
  if (!stored) {
    return { valid: false, message: 'OTP not found or expired. Please request a new OTP.' };
  }
  
  if (stored.expiresAt < Date.now()) {
    otpStore.delete(identifier);
    return { valid: false, message: 'OTP has expired. Please request a new OTP.' };
  }
  
  if (stored.otp !== userOtp) {
    return { valid: false, message: 'Invalid OTP. Please check and try again.' };
  }
  
  // OTP is valid - mark as used and return validation token
  otpStore.delete(identifier);
  const validationToken = `validated_${identifier}_${Date.now()}`;
  otpStore.set(validationToken, {
    validated: true,
    identifier,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes to complete registration
  });
  
  return { valid: true, validationToken };
}

function checkValidationToken(token) {
  const stored = otpStore.get(token);
  if (!stored || !stored.validated) {
    return false;
  }
  if (stored.expiresAt < Date.now()) {
    otpStore.delete(token);
    return false;
  }
  // Token is valid - delete it after use (one-time use)
  otpStore.delete(token);
  return true;
}

function createValidationToken(token, identifier) {
  otpStore.set(token, {
    validated: true,
    identifier,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes to complete registration
  });
}

module.exports = {
  createOtp,
  validateOtp,
  checkValidationToken,
  generateOtp,
  createValidationToken,
};

