const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" = "GET",
  body?: any
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    let result: any;
    try {
      result = await response.json();
    } catch (e) {
      throw new Error(`Server returned status ${response.status}`);
    }

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "An unexpected error occurred");
    }

    // Standard backend wraps response in { success: true, message: ..., data: ... }
    return result.data as T;
  } catch (error: any) {
    console.error(`API Error on ${endpoint}:`, error.message);
    throw error;
  }
}
