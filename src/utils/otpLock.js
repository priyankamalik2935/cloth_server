
import crypto from "crypto";
import { MAX_OTP_ATTEMPTS, LOCK_DURATIONS_MIN } from "../Model/user_model.js";
import {
  sendVerifyOtpMail,
  sendForgotPasswordMail,
  sendAccountLockedMail,
} from "../mail/all_mail_formate.js";


export const OTP_EXPIRY_MS = 10 * 60 * 1000;        
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;   
export const OTP_LENGTH = 6;


export const generateOtp = (length = OTP_LENGTH) => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

export const hashOtp = (otp) =>
  crypto.createHash("sha256").update(String(otp)).digest("hex");

export const compareOtp = (plainOtp, hashedOtp) => {
  if (!plainOtp || !hashedOtp) return false;
  const hashed = hashOtp(plainOtp);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hashed, "hex"),
      Buffer.from(hashedOtp, "hex")
    );
  } catch {
    return false;
  }
};


export const successResponse = (
  res,
  data = {},
  message = "Success",
  status = 200
) => {
  return res.status(status).json({ success: true, message, data });
};

export const errorResponse = (
  res,
  message = "Something went wrong",
  status = 400,
  extra = {}
) => {
  return res.status(status).json({ success: false, message, ...extra });
};


export const getLockDurationMs = (cycle) => {
  const idx = Math.min(cycle, LOCK_DURATIONS_MIN.length - 1);
  return LOCK_DURATIONS_MIN[idx] * 60 * 1000;
};

export const isLocked = (user) => {
  const until = user?.verification?.lock_until;
  return !!until && until.getTime() > Date.now();
};

export const getRemainingLockMinutes = (user) => {
  if (!isLocked(user)) return 0;
  return Math.ceil(
    (user.verification.lock_until.getTime() - Date.now()) / 60000
  );
};


export const issueOtp = async (user, purpose = "verify") => {
  const otp = generateOtp(OTP_LENGTH);

  user.verification.otp_hash = hashOtp(otp);
  user.verification.otp_expires_at = new Date(Date.now() + OTP_EXPIRY_MS);
  user.verification.otp_attempts = 0;
  user.verification.last_otp_sent_at = new Date();
  user.verification.otp_resend_count =
    (user.verification.otp_resend_count || 0) + 1;

  await user.save();

 
  try {
    if (purpose === "reset") {
      sendForgotPasswordMail(user.email, user.first_name, otp);
    } else {
      sendVerifyOtpMail(user.email, user.first_name, otp);
    }
  } catch (err) {
    console.error("Mail send failed:", err.message);
  }

  return otp;
};


export const applyProgressiveLock = (user) => {
  const durationMs = getLockDurationMs(user.verification.lock_cycle || 0);

  user.verification.lock_until = new Date(Date.now() + durationMs);
  user.verification.lock_cycle = (user.verification.lock_cycle || 0) + 1;
  user.verification.otp_attempts = 0;
  user.verification.otp_hash = null;
  user.verification.otp_expires_at = null;

  try {
    const minutes = Math.round(durationMs / 60000);
    sendAccountLockedMail(
      user.email,
      user.first_name,
      minutes,
      user.verification.lock_cycle
    );
  } catch (err) {
    console.error("Lock mail failed:", err.message);
  }

  return durationMs;
};


export const resetOtpState = (user) => {
  user.verification.is_verified = true;
  user.verification.otp_hash = null;
  user.verification.otp_expires_at = null;
  user.verification.otp_attempts = 0;
  user.verification.otp_resend_count = 0;
  user.verification.lock_cycle = 0;
  user.verification.lock_until = null;
};


export const verifyOtpInternal = async (user, otp) => {
  const v = user.verification;


  if (isLocked(user)) {
    const mins = getRemainingLockMinutes(user);
    return {
      ok: false,
      reason: "LOCKED",
      message: `Account locked. Try again in ${mins} minute(s).`,
      lock_until: v.lock_until,
    };
  }

  
  if (
    !v.otp_hash ||
    !v.otp_expires_at ||
    v.otp_expires_at.getTime() < Date.now()
  ) {
    return {
      ok: false,
      reason: "EXPIRED",
      message: "OTP expired. Please resend.",
    };
  }

  
  if (v.otp_hash !== hashOtp(otp)) {
    v.otp_attempts = (v.otp_attempts || 0) + 1;

    if (v.otp_attempts >= MAX_OTP_ATTEMPTS) {
      const durationMs = applyProgressiveLock(user);
      await user.save();

      const minutes = Math.round(durationMs / 60000);
      return {
        ok: false,
        reason: "LOCKED",
        message: `Too many wrong attempts. Account locked for ${minutes} minute(s).`,
        lock_until: v.lock_until,
      };
    }

    await user.save();
    return {
      ok: false,
      reason: "INVALID",
      message: "Invalid OTP.",
      attempts_left: MAX_OTP_ATTEMPTS - v.otp_attempts,
    };
  }

  resetOtpState(user);
  await user.save();
  return { ok: true, user };
};