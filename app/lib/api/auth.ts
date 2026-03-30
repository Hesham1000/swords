import { API_URL } from "./utils";

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
