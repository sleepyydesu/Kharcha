const nodemailer = require("nodemailer");

// Create transporter from env vars.
// In development without SMTP config, OTP is logged to console.
const createTransporter = () => {
    if (!process.env.SMTP_HOST) return null;

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

/**
 * Sends an OTP email to the given address.
 * Falls back to console logging in development if SMTP is not configured.
 */
const sendOTPEmail = async (email, otp) => {
    const transporter = createTransporter();

    if (!transporter) {
        // Development fallback — no SMTP configured
        console.log(`\n📧  [DEV MODE] OTP for ${email}: ${otp}\n`);
        return;
    }

    const appName = process.env.APP_NAME || "E-Wallet";
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
        from: `"${appName}" <${fromEmail}>`,
        to: email,
        subject: `Your ${appName} Verification Code`,
        text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #111827; margin-bottom: 8px;">${appName}</h2>
                <p style="color: #6b7280; margin-bottom: 24px;">Use the code below to verify your email address.</p>
                <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #111827;">
                    ${otp}
                </div>
                <p style="color: #9ca3af; margin-top: 24px; font-size: 13px;">
                    This code expires in <strong>10 minutes</strong>.<br/>
                    If you did not request this, please ignore this email.
                </p>
            </div>
        `,
    });
};

module.exports = { sendOTPEmail };