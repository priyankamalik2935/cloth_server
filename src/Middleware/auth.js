import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/otpLock.js";

export const authenticate = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return errorResponse(res, "Unauthorized", 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "change-me");
    req.user = decoded;
    next();
  } catch (err) {
    return errorResponse(res, "Invalid or expired token", 401);
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return errorResponse(res, "Forbidden", 403);
  }
  next();
};