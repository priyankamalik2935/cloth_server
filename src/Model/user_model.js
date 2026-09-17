import mongoose from "mongoose";

const MAX_OTP_ATTEMPTS = 3;
const LOCK_DURATIONS_MIN = [1, 5, 10, 30, 60, 360, 1440];

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    full_name: { type: String, required: true },
    phone: { type: String, required: true },
    address_line1: { type: String, required: true },
    address_line2: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true, default: "India" },
    postal_code: { type: String, required: true },
    is_default: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const verificationSchema = new mongoose.Schema(
  {
    is_verified: { type: Boolean, default: false },
    otp_hash: { type: String, default: null },
    otp_expires_at: { type: Date, default: null },
    otp_attempts: { type: Number, default: 0 },
    otp_resend_count: { type: Number, default: 0 },
    last_otp_sent_at: { type: Date, default: null },
    lock_cycle: { type: Number, default: 0 },
    lock_until: { type: Date, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    profile_img: {
      url: { type: String, default: null },
      public_id: { type: String, default: null },
    },
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    role: { type: String, enum: ["Admin", "User"], default: "User" },
    email: {
      type: String,
      required: true,
      unique: true,             
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true, default: null },
    password: { type: String, required: true, select: false },
    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },
    verification: { type: verificationSchema, default: () => ({}) },
    order_list: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    cart_list: [{ type: mongoose.Schema.Types.ObjectId, ref: "Cart" }],
    address_list: { type: [addressSchema], default: [] },
    is_address_list: { type: Boolean, default: false },
    last_login_at: { type: Date, default: null },
  },
  { timestamps: true }
);


userSchema.index({ "verification.lock_until": 1 });    

const User = mongoose.model("User", userSchema);

export { User, MAX_OTP_ATTEMPTS, LOCK_DURATIONS_MIN };
export default User;