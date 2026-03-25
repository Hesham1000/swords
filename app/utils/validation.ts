
export function validatePassword(
  password: string,
  firstName?: string,
  email?: string,
  oldPassword?: string
): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
  }

  if (firstName && password.toLowerCase().includes(firstName.toLowerCase())) {
    return "Password cannot contain your first name";
  }

  if (
    email &&
    password.toLowerCase().includes(email.split("@")[0].toLowerCase())
  ) {
    return "Password cannot contain your email username";
  }

  if (oldPassword && password === oldPassword) {
    return "New password must be different from the old password";
  }

  return null;
}