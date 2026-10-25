import bcrypt from "bcryptjs";

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}


export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates password strength.
 * Rules: at least 8 characters, one uppercase, one lowercase, one number,
 * and must not contain the user's first name (if provided).
 */
export function validatePassword(
  password: string,
  firstName?: string
): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (firstName && firstName.length > 2 && password.toLowerCase().includes(firstName.toLowerCase())) {
    errors.push("Password must not contain your name");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
