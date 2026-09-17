import express from "express";
import {
  createAccount,
  verifyOtp,
  resendOtp,
  loginUser,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  requestPasswordChangeOtp,
  changePasswordWithOtp,
} from "../controller/user_controller.js";
import { authenticate } from "../Middleware/auth.js";

export const router = express.Router();

/* ---------- Public ---------- */
router.post("/create-account", createAccount);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", loginUser);
router.post("/forgot-password/request-otp", requestPasswordChangeOtp);
router.post("/forgot-password/change", changePasswordWithOtp);

/* ---------- Protected ---------- */
router.put("/profile", authenticate, updateProfile);
router.post("/address", authenticate, addAddress);
router.put("/address/:addressId", authenticate, updateAddress);
router.delete("/address/:addressId", authenticate, deleteAddress);

export default router;