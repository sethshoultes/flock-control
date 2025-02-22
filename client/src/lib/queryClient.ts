import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Enhanced error handling utilities
interface APIError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

async function parseErrorResponse(res: Response): Promise<APIError> {
  try {
    const data = await res.json();
    return {
      message: data.message || data.error || 'An unexpected error occurred',
      code: data.code,
      details: data.details
    };
  } catch {
    return {
      message: res.statusText || 'An unexpected error occurred',
      code: res.status.toString()
    };
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message, { cause: error });
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Enhance error messages for common scenarios
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network and try again.');
    }
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to the server. Please try again later.');
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Enhance error messages for queries
      if (error instanceof Error) {
        console.error(`Query error for ${queryKey[0]}:`, error);
        if (error.cause) {
          console.error('Error details:', error.cause);
        }
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Don't retry on 401/403 errors
        if (error instanceof Error && error.cause && 
            (error.cause as APIError).code?.match(/^40[13]/)) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});