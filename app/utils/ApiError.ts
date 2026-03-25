export default class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = "ApiError";

    Error.captureStackTrace?.(this, this.constructor);
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  // Static helpers for common HTTP errors
  static badRequest(message: string = "Bad Request") {
    return new ApiError(400, message);
  }

  static unauthorized(message: string = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message: string = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message: string = "Not Found") {
    return new ApiError(404, message);
  }

  static conflict(message: string = "Conflict") {
    return new ApiError(409, message);
  }

  static tooManyRequests(message: string = "Too Many Requests") {
    return new ApiError(429, message);
  }

  static internal(message: string = "Internal Server Error") {
    return new ApiError(500, message, false); // Not operational
  }
}
