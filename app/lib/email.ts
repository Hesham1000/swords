// app/lib/email.ts
import { sendEmailSetPassword } from "../utils/email";
import { PASSWORD_TOKEN_EXPIRATION_MINUTES } from "./auth/token";

export async function sendPasswordSetupEmail(
  email: string,
  username: string,
  token: string
): Promise<void> {
  const link = `${process.env.REDIRECT_URL}/set-password?token=${encodeURIComponent(token)}`;
  await sendEmailSetPassword(email, username, link, PASSWORD_TOKEN_EXPIRATION_MINUTES);
}

export async function sendPasswordResetEmail(
  email: string,
  username: string,
  token: string
): Promise<void> {
  const link = `${process.env.REDIRECT_URL}/set-password?token=${encodeURIComponent(token)}`;
  await sendEmailSetPassword(email, username, link, PASSWORD_TOKEN_EXPIRATION_MINUTES);
}
