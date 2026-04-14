const { MailtrapClient } = require("mailtrap");

const getClient = () => {
    if (!process.env.MAILTRAP_TOKEN) return null;
    return new MailtrapClient({ token: process.env.MAILTRAP_TOKEN });
};

// Returns subject, heading and description for each OTP type.
const getOTPCopy = (otpType, appName) => {
    switch (otpType) {
        case "password_reset":
            return {
                subject: `Reset your ${appName} password`,
                heading: "Password Reset Request",
                description:
                    "Use the code below to reset your password. If you did not request this, please ignore this email and your password will remain unchanged.",
            };
        case "mpin_reset":
            return {
                subject: `Reset your ${appName} MPIN`,
                heading: "MPIN Reset Request",
                description:
                    "Use the code below to reset your MPIN. If you did not request this, please ignore this email.",
            };
        case "signup":
        default:
            return {
                subject: `Your ${appName} Verification Code`,
                heading: "Verify Your Email",
                description: "Use the code below to verify your email address.",
            };
    }
};

/**
 * Sends an OTP email via Mailtrap Email Sending (HTTP API).
 * @param {string} email
 * @param {string} otp
 * @param {string} [otpType="signup"]  — "signup" | "password_reset" | "mpin_reset"
 */
const sendOTPEmail = async (email, otp, otpType = "signup") => {
    const client = getClient();
    const appName = process.env.APP_NAME || "Kharcha";
    const { subject, heading, description } = getOTPCopy(otpType, appName);

    if (!client) {
        console.log(`\n📧  [DEV MODE] OTP (${otpType}) for ${email}: ${otp}\n`);
        return;
    }

    const fromEmail = process.env.MAILTRAP_FROM || `noreply@rachitmanandhar.com.np`;
    const fromName = process.env.APP_NAME || "Kharcha";

    await client.send({
        from: { name: fromName, email: fromEmail },
        to: [{ email }],
        subject,
        text: `${heading}\n\n${description}\n\nYour code: ${otp}\n\nThis code expires in 15 minutes. Do not share it with anyone.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #111827; margin-bottom: 8px;">${appName}</h2>
                <h3 style="color: #374151; margin-bottom: 4px;">${heading}</h3>
                <p style="color: #6b7280; margin-bottom: 24px;">${description}</p>
                <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #111827;">
                    ${otp}
                </div>
                <p style="color: #9ca3af; margin-top: 24px; font-size: 13px;">
                    This code expires in <strong>15 minutes</strong>.<br/>
                    If you did not request this, please ignore this email.
                </p>
            </div>
        `,
    });

    console.log(`📧  OTP email sent to ${email} (type: ${otpType})`);
};

module.exports = { sendOTPEmail };
