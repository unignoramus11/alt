import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTPEmail(
  email: string,
  otp: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@alt-auth.com",
      to: email,
      subject: "Your verification code",
      text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; background-color: #F2EBE2;">
          <div style="background-color: #614051; padding: 20px; text-align: center;">
            <h1 style="color: #F2EBE2; margin: 0; font-size: 24px;">Verification Code</h1>
          </div>
          <div style="padding: 30px; text-align: center;">
            <p style="color: #614051; font-size: 16px; margin-bottom: 20px;">Your verification code is:</p>
            <div style="background-color: #614051; color: #F2EBE2; font-size: 32px; letter-spacing: 8px; padding: 20px; font-weight: bold;">
              ${otp}
            </div>
            <p style="color: #614051; font-size: 14px; margin-top: 20px;">This code expires in 10 minutes.</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
}
