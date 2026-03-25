import { RegisteredErrorType } from "./error-registry";

interface BuildErrorUrlParams {
  message: string;
  type?: RegisteredErrorType;
  source?: string;
  email?: string;
}

export function buildErrorUrl(params: BuildErrorUrlParams): string {
  const { message, type = "default", source, email } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("message", message);
  searchParams.set("type", type);

  if (source) {
    searchParams.set("source", source);
  }
  if (email) {
    searchParams.set("email", email);
  }

  return `/error?${searchParams.toString()}`;
}
