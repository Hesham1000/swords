import { API_URL } from "./utils";

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
}

export async function getCurrentUser(): Promise<{ user: User } | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Essential for sending cookies
    });

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.location.replace("/sign-in");
      }
      throw new SessionExpiredError();
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
