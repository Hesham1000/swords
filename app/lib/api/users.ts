// API client for the admin User Management endpoints.
// NOTE: All calls use relative paths — the Next.js app serves its own /api
// routes on the same origin, so an absolute base URL (e.g. from
// NEXT_PUBLIC_API_URL) is unnecessary and breaks in sandbox/proxy
// environments when the variable is undefined.

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
}

export interface UpdateUserResponse {
  success: boolean;
  message?: string;
}

async function parseError(response: Response): Promise<never> {
  let message = `Request failed with status ${response.status}`;
  try {
    const body = await response.json();
    if (body?.error) message = body.error;
    else if (body?.message) message = body.message;
  } catch {
    // keep default message
  }
  throw new Error(message);
}

export async function getUsers(search?: string): Promise<UsersResponse> {
  let url = "/api/users";
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

export async function updateUser(
  id: string,
  data: { roles?: string[]; isActive?: boolean }
): Promise<UpdateUserResponse> {
  const response = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

export async function deleteUser(id: string): Promise<UpdateUserResponse> {
  const response = await fetch(`/api/users/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

export async function resetUserPassword(
  id: string
): Promise<UpdateUserResponse> {
  const response = await fetch(`/api/users/${id}/reset-password`, {
    method: "POST",
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}
