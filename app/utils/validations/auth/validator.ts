export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }
  return null;
}


export function validateUsername(username: string): string | null {
  const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

  if (!username || !username.trim()) {
    return "Username is required";
  }

  if (username.length < 3) {
    return "Username must be at least 3 characters long";
  }

  if (username.length > 20) {
    return "Username must not exceed 20 characters";
  }

  if (!USERNAME_REGEX.test(username)) {
    return "Username can only contain letters, numbers, and underscores";
  }

  // Optional: Add reserved username checks
  const reservedUsernames = [
    "admin",
    "root",
    "system",
    "support",
    "help",
    "info",
  ];
  if (reservedUsernames.includes(username.toLowerCase())) {
    return "This username is reserved. Please choose a different one";
  }

  // Optional: Check for consecutive special characters or patterns
  if (username.includes("__")) {
    return "Username cannot contain consecutive underscores";
  }

  if (username.startsWith("_") || username.endsWith("_")) {
    return "Username cannot start or end with an underscore";
  }

  // Optional: Check for numbers only
  if (/^\d+$/.test(username)) {
    return "Username cannot consist of only numbers";
  }

  return null;
}

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

