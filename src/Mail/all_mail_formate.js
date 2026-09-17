

import nodemailer from "nodemailer";

const BRAND = {
  name: "E-Shopping",
  team: "E-Shopping Team",
  color: "#4F46E5",
  support: "support@eshopping.com",
  clientUrl: process.env.CLIENT_URL || "https://eshopping.com",
  year: new Date().getFullYear(),
};

const layout = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:10px;overflow:hidden;
                 box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <tr>
            <td style="background:${BRAND.color};padding:24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">
                ${BRAND.name}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;color:#333333;font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;
                       font-size:12px;color:#888888;">
              <p style="margin:0 0 6px;">
                Need help? Contact us at
                <a href="mailto:${BRAND.support}" style="color:${BRAND.color};">
                  ${BRAND.support}
                </a>
              </p>
              <p style="margin:0;">© ${BRAND.year} ${BRAND.name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const otpBlock = (otp) => `
  <div style="text-align:center;margin:28px 0;">
    <span style="display:inline-block;background:#F3F4F6;color:${BRAND.color};
                 font-size:32px;font-weight:bold;letter-spacing:10px;
                 padding:16px 30px;border-radius:8px;border:1px dashed ${BRAND.color};">
      ${otp}
    </span>
  </div>
`;

const buttonBlock = (url, label) => `
  <div style="text-align:center;margin:28px 0;">
    <a href="${url}"
       style="background:${BRAND.color};color:#fff;padding:12px 28px;
              text-decoration:none;border-radius:6px;font-weight:bold;
              display:inline-block;font-size:15px;">
      ${label}
    </a>
  </div>
`;

const infoBox = (text, type = "info") => {
  const colors = {
    info:    { bg: "#EFF6FF", border: "#3B82F6", text: "#1E3A8A" },
    warning: { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
    danger:  { bg: "#FEE2E2", border: "#DC2626", text: "#991B1B" },
    success: { bg: "#DCFCE7", border: "#16A34A", text: "#166534" },
  };
  const c = colors[type] || colors.info;
  return `
    <div style="background:${c.bg};border-left:4px solid ${c.border};
                padding:12px 16px;border-radius:6px;margin:16px 0;
                color:${c.text};font-size:13px;">
      ${text}
    </div>
  `;
};

const verifyAccount = ({ name, otp }) => ({
  subject: `${BRAND.name} - Verify Your Account`,
  html: layout(
    "Verify Account",
    `
      <h2 style="margin-top:0;color:#111827;">Hello ${name}, 👋</h2>
      <p>Thanks for signing up at <b>${BRAND.name}</b>!</p>
      <p>Please use the OTP below to verify your email address:</p>
      ${otpBlock(otp)}
      ${infoBox("This OTP is valid for <b>10 minutes</b>. Do not share it with anyone.", "warning")}
    `
  ),
  text: `Hello ${name}, your ${BRAND.name} verification OTP is ${otp}. Valid for 10 minutes.`,
});

const resendOtp = ({ name, otp }) => ({
  subject: `${BRAND.name} - Your New OTP`,
  html: layout(
    "Resend OTP",
    `
      <h2 style="margin-top:0;color:#111827;">Hello ${name},</h2>
      <p>Here is your new OTP as requested:</p>
      ${otpBlock(otp)}
      ${infoBox("Valid for <b>10 minutes</b>. Previous OTPs are now invalid.", "warning")}
    `
  ),
  text: `Hello ${name}, your new ${BRAND.name} OTP is ${otp}. Valid for 10 minutes.`,
});

const forgotPassword = ({ name, otp }) => ({
  subject: `${BRAND.name} - Reset Your Password`,
  html: layout(
    "Reset Password",
    `
      <h2 style="margin-top:0;color:#111827;">Hello ${name},</h2>
      <p>We received a request to reset your password.</p>
      <p>Use this OTP to proceed:</p>
      ${otpBlock(otp)}
      ${infoBox("Valid for <b>10 minutes</b>. If you didn't request this, ignore this email.", "warning")}
    `
  ),
  text: `Hello ${name}, your password reset OTP is ${otp}. Valid for 10 minutes.`,
});

const passwordChanged = ({ name }) => ({
  subject: `${BRAND.name} - Password Changed Successfully`,
  html: layout(
    "Password Changed",
    `
      <h2 style="margin-top:0;color:#111827;">Hi ${name},</h2>
      <p>Your password was <b style="color:#16A34A;">successfully changed</b>.</p>
      ${infoBox(`If this wasn't you, contact us at <a href="mailto:${BRAND.support}" style="color:#991B1B;">${BRAND.support}</a>.`, "danger")}
    `
  ),
  text: `Hi ${name}, your ${BRAND.name} password was changed successfully.`,
});

const accountLocked = ({ name, minutes, lockCycle }) => ({
  subject: `${BRAND.name} - Account Temporarily Locked`,
  html: layout(
    "Account Locked",
    `
      <h2 style="margin-top:0;color:#DC2626;">Security Alert 🚨</h2>
      <p>Hi ${name},</p>
      <p>We detected <b>multiple wrong OTP attempts</b> on your account.</p>
      <p>Your account has been temporarily locked for
         <b style="color:#DC2626;">${minutes} minute(s)</b>.</p>
      ${infoBox(`<b>Lock Level:</b> ${lockCycle} — repeated violations will increase the lock duration (1m → 5m → 10m → 30m → 1h → 6h → 24h).`, "danger")}
    `
  ),
  text: `Hi ${name}, your ${BRAND.name} account is locked for ${minutes} minute(s).`,
});

const welcome = ({ name }) => ({
  subject: `Welcome to ${BRAND.name}! 🎉`,
  html: layout(
    "Welcome",
    `
      <h2 style="margin-top:0;color:#111827;">Welcome aboard, ${name}! 🎉</h2>
      <p>Your account is now verified and ready to use.</p>
      ${buttonBlock(BRAND.clientUrl, "Start Shopping")}
    `
  ),
  text: `Welcome ${name}! Your ${BRAND.name} account is verified.`,
});

/* ---------------- Registry ---------------- */
export const mailFormats = {
  verify: verifyAccount,
  resend: resendOtp,
  reset: forgotPassword,
  password_changed: passwordChanged,
  account_locked: accountLocked,
  welcome,
};


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


export const sendMail = async ({ to, template, data = {} }) => {
  try {
    const builder = mailFormats[template];
    if (!builder) throw new Error(`Unknown mail template: ${template}`);

    const { subject, html, text } = builder(data);

    const info = await transporter.sendMail({
      from: `"${BRAND.team}" <${process.env.SMTP_FROM || "team@example.com"}>`,
      to,
      subject,
      html,
      text,
    });

    console.log(`[mail:${template}] sent → ${to} | id: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[mail:${template}] failed → ${to}`, err.message);
    return { ok: false, error: err.message };
  }
};


export const sendVerifyOtpMail       = (to, name, otp)            => sendMail({ to, template: "verify",           data: { name, otp } });
export const sendResendOtpMail       = (to, name, otp)            => sendMail({ to, template: "resend",           data: { name, otp } });
export const sendForgotPasswordMail  = (to, name, otp)            => sendMail({ to, template: "reset",            data: { name, otp } });
export const sendPasswordChangedMail = (to, name)                 => sendMail({ to, template: "password_changed", data: { name } });
export const sendAccountLockedMail   = (to, name, minutes, cycle) => sendMail({ to, template: "account_locked",   data: { name, minutes, lockCycle: cycle } });
export const sendWelcomeMail         = (to, name)                 => sendMail({ to, template: "welcome",          data: { name } });

export default mailFormats;