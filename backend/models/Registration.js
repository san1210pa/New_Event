const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      // Updated regex to properly handle +91XXXXXXXXXX format (E.164)
      match: /^\+[1-9]\d{1,14}$/,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match:
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  },
  {
    timestamps: true,
  }
);

// Individual unique indexes for phone and email
registrationSchema.index({ phone: 1 }, { unique: true });
registrationSchema.index({ email: 1 }, { unique: true });
// Compound index as additional safeguard
registrationSchema.index({ email: 1, phone: 1 }, { unique: true });

// Explicitly set collection name to avoid confusion
const Registration = mongoose.model('Registration', registrationSchema, 'registrations');

module.exports = Registration;

