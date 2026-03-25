// lib/utils/email.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmailSetPassword(
  email: string,
  username: string,
  link: string,
  expirationMinutes: number = 8,
  year: number = new Date().getFullYear()
): Promise<void> {
  const projectName = "Kings";

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Set Your Password",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${projectName} - Set Your Password</title>
</head>
<body style="background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 20px; text-align: center;">

  <div style="background-color: #fff; border-radius: 8px; padding: 30px; max-width: 600px; margin: 40px auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); text-align: center;">

    <!-- Logo -->
    <div style="margin-bottom: 10px;">
      <img src="cid:kings-logo" alt="${projectName} Logo" style="width: 120px; height: auto;" />
    </div>

    <!-- Welcome Message + Avatar -->
    <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
      <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">Welcome, ${username}</h1>
      <img src="cid:avatar" alt="User Avatar" style="width: 40px; height: 40px; border-radius: 50%; margin-left: 10px;" />
    </div>

    <p style="font-size: 16px; margin-bottom: 20px;">You've successfully signed up to <strong>${projectName}</strong>.</p>
    <p style="font-size: 16px; margin-bottom: 20px;">Please click the button below to set your password and activate your account.</p>

    <a href="${link}"
       style="background-color: #009C60; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
       Set Your Password
    </a>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px; text-align: left;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Important:</strong> This link will expire in <strong>${expirationMinutes} minute${
      expirationMinutes !== 1 ? "s" : ""
    }</strong>. Please set your password promptly.
      </p>
    </div>

    <p style="font-size: 16px; margin-top: 20px;">If you did not request this email, you can safely ignore it.</p>

    <footer style="margin-top: 30px; font-size: 0.8em; color: #aaa;">
      &copy; ${year} ${projectName}. All rights reserved.
    </footer>

  </div>
</body>
</html>
    `,
    attachments: [
      {
        filename: "suit.jpg",
        path: "public/suit.jpg",
        cid: "kings-logo",
      },
      {
        filename: "training.jpg",
        path: "public/training.jpg",
        cid: "avatar",
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}
