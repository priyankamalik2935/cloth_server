import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../Model/user_model.js";

import {
  issueOtp,
  isLocked,
  getRemainingLockMinutes,
  verifyOtpInternal,
  OTP_RESEND_COOLDOWN_MS,
  successResponse,
  errorResponse,
} from "../utils/otpLock.js";

/* ---------------- Helpers ---------------- */
const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || "change-me",
    { expiresIn: "7d" }
  );

const sanitizeUser = (u) => ({
  id: u._id,
  first_name: u.first_name,
  last_name: u.last_name,
  email: u.email,
  gender: u.gender,
  role: u.role,
  profile_img: u.profile_img,
  phone: u.phone,
  is_verified: u.verification?.is_verified,
  address_list: u.address_list,
  is_address_list: u.is_address_list,
});


export const createAccount = async (req, res) => {
  try {
    const { first_name, last_name, gender, email, password, phone } = req.body;

    if (!first_name || !last_name || !gender || !email || !password) {
      return errorResponse(res, "Missing required fields", 400);
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return errorResponse(res, "Email already registered", 409);

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      first_name,
      last_name,
      gender,
      email: email.toLowerCase(),
      phone: phone || null,
      password: hashed,
      role: "User",
      is_active: true,
      is_deleted: false,
    });

    await issueOtp(user, "verify");

    return successResponse(
      res,
      { id: user._id, email: user.email },
      "Account created. OTP sent to email.",
      201
    );
  } catch (err) {
    console.error("createAccount:", err);
    return errorResponse(res, "Failed to create account", 500);
  }
};


export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return errorResponse(res, "Email and OTP required");

    const user = await User.findOne({
      email: email.toLowerCase(),
      is_deleted: false,
    });
    if (!user) return errorResponse(res, "User not found", 404);

    const result = await verifyOtpInternal(user, otp);

    if (!result.ok) {
      const status = result.reason === "LOCKED" ? 423 : 400;
      return errorResponse(res, result.message, status, {
        reason: result.reason,
        attempts_left: result.attempts_left,
        lock_until: result.lock_until,
      });
    }

    const token = signToken(user);
    return successResponse(
      res,
      { token, user: sanitizeUser(user) },
      "Account verified successfully"
    );
  } catch (err) {
    console.error("verifyOtp:", err);
    return errorResponse(res, "Verification failed", 500);
  }
};


   
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return errorResponse(res, "Email required");

    const user = await User.findOne({
      email: email.toLowerCase(),
      is_deleted: false,
    });
    if (!user) return errorResponse(res, "User not found", 404);

    if (isLocked(user)) {
      return errorResponse(
        res,
        `Account locked. Try again in ${getRemainingLockMinutes(user)} minute(s).`,
        423,
        { lock_until: user.verification.lock_until }
      );
    }

    const last = user.verification.last_otp_sent_at;
    if (last && Date.now() - last.getTime() < OTP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - (Date.now() - last.getTime())) / 1000
      );
      return errorResponse(res, `Please wait ${wait}s before requesting another OTP.`, 429);
    }

    await issueOtp(user, "verify");
    return successResponse(res, { email: user.email }, "OTP resent successfully");
  } catch (err) {
    console.error("resendOtp:", err);
    return errorResponse(res, "Failed to resend OTP", 500);
  }
};


export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return errorResponse(res, "Email and password required");

    const user = await User.findOne({
      email: email.toLowerCase(),
      is_deleted: false,
    }).select("+password");

    if (!user) return errorResponse(res, "Invalid credentials", 401);
    if (!user.is_active) return errorResponse(res, "Account disabled", 403);

    if (!user.verification?.is_verified) {
      return errorResponse(res, "Account not verified. Please verify OTP.", 403, {
        need_verification: true,
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return errorResponse(res, "Invalid credentials", 401);

    user.last_login_at = new Date();
    await user.save();

    const token = signToken(user);
    return successResponse(
      res,
      { token, user: sanitizeUser(user) },
      "Login successful"
    );
  } catch (err) {
    console.error("loginUser:", err);
    return errorResponse(res, "Login failed", 500);
  }
};


export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, phone, profile_img } = req.body;

    const user = await User.findById(userId);
    if (!user) return errorResponse(res, "User not found", 404);

    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (phone) user.phone = phone;
    if (profile_img) user.profile_img = profile_img;

    await user.save();
    return successResponse(res, sanitizeUser(user), "Profile updated");
  } catch (err) {
    console.error("updateProfile:", err);
    return errorResponse(res, "Update failed", 500);
  }
};


export const addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return errorResponse(res, "User not found", 404);

    const isDefault = !!req.body.is_default;
    if (isDefault) user.address_list.forEach((a) => (a.is_default = false));

    user.address_list.push(req.body);
    user.is_address_list = user.address_list.length > 0;
    await user.save();

    return successResponse(res, user.address_list, "Address added", 201);
  } catch (err) {
    console.error("addAddress:", err);
    return errorResponse(res, "Failed to add address", 500);
  }
};

export const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return errorResponse(res, "User not found", 404);

    const addr = user.address_list.id(req.params.addressId);
    if (!addr) return errorResponse(res, "Address not found", 404);

    const { _id, ...updates } = req.body;
    Object.assign(addr, updates);

    if (updates.is_default) {
      user.address_list.forEach((a) => {
        if (String(a._id) !== String(addr._id)) a.is_default = false;
      });
    }

    await user.save();
    return successResponse(res, user.address_list, "Address updated");
  } catch (err) {
    console.error("updateAddress:", err);
    return errorResponse(res, "Failed to update address", 500);
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return errorResponse(res, "User not found", 404);

    const addr = user.address_list.id(req.params.addressId);
    if (!addr) return errorResponse(res, "Address not found", 404);

    addr.deleteOne();
    user.is_address_list = user.address_list.length > 0;
    await user.save();

    return successResponse(res, user.address_list, "Address deleted");
  } catch (err) {
    console.error("deleteAddress:", err);
    return errorResponse(res, "Failed to delete address", 500);
  }
};


export const requestPasswordChangeOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return errorResponse(res, "Email required");

    const user = await User.findOne({
      email: email.toLowerCase(),
      is_deleted: false,
    });
    if (!user) return errorResponse(res, "User not found", 404);

    if (isLocked(user)) {
      return errorResponse(
        res,
        `Account locked. Try again in ${getRemainingLockMinutes(user)} minute(s).`,
        423
      );
    }

    await issueOtp(user, "reset");
    return successResponse(res, { email: user.email }, "OTP sent for password change");
  } catch (err) {
    console.error("requestPasswordChangeOtp:", err);
    return errorResponse(res, "Failed to send OTP", 500);
  }
};

export const changePasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password)
      return errorResponse(res, "Email, OTP and new_password required");

    const user = await User.findOne({
      email: email.toLowerCase(),
      is_deleted: false,
    }).select("+password");
    if (!user) return errorResponse(res, "User not found", 404);

    const result = await verifyOtpInternal(user, otp);
    if (!result.ok) {
      const status = result.reason === "LOCKED" ? 423 : 400;
      return errorResponse(res, result.message, status, {
        reason: result.reason,
        attempts_left: result.attempts_left,
        lock_until: result.lock_until,
      });
    }

    user.password = await bcrypt.hash(new_password, 10);
    await user.save();

    return successResponse(res, {}, "Password changed successfully");
  } catch (err) {
    console.error("changePasswordWithOtp:", err);
    return errorResponse(res, "Failed to change password", 500);
  }
};