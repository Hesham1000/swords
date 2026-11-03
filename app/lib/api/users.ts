// lib/api/users.ts

export interface User {
  _id: string;
  username: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

export interface UsersResponse {
  success: boolean;
  data: User[];
  message?: string;
}

export interface UserActionResponse {
  success: boolean;
  message?: string;
}

/**
 * Fetch all users (admin only), optionally filtered by search term
 */
export async function getUsers(search?: string): Promise<User[]> {
  try {
    const url = search ? `/api/users?search=${encodeURIComponent(search)}` : "/api/users";
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch users");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

/**
 * Update a user's roles and/or active status (admin only)
 */
export async function updateUser(
  id: string,
  data: { roles?: string[]; isActive?: boolean }
): Promise<UserActionResponse> {
  try {
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update user");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(id: string): Promise<UserActionResponse> {
  try {
    const response = await fetch(`/api/users/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete user");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

/**
 * Send a password reset email to a user (admin only)
 */
export async function resetUserPassword(id: string): Promise<UserActionResponse> {
  try {
    const response = await fetch(`/api/users/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send password reset email");
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}
