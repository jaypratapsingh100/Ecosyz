/**
 * Common error handling utilities for API responses
 */

export interface ApiError {
  error?: string;
  message?: string;
  details?: any;
  code?: string;
}

export async function parseApiError(response: Response): Promise<ApiError> {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    return { error: text || `HTTP ${response.status}: ${response.statusText || 'Unknown error'}` };
  } catch {
    return { error: `HTTP ${response.status}: ${response.statusText || 'Unknown error'}` };
  }
}

export function getErrorMessage(errorData: ApiError): string {
  return errorData.error || errorData.message || 'Unknown error';
}

export function shouldLogError(status: number): boolean {
  // Don't log auth errors (401/403) as they're expected
  return status !== 401 && status !== 403;
}
