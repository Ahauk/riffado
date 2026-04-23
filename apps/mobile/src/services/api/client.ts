export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
