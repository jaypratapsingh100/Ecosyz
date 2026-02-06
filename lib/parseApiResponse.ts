export type ParsedApiResponse<T = unknown> = {
  ok: boolean;
  status: number;
  statusText: string;
  data: T | string | null;
  raw?: string;
};

export async function parseApiResponse<T = unknown>(
  res: Response
): Promise<ParsedApiResponse<T>> {
  const text = await res.text();
  let data: T | string | null = null;

  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch (parseError) {
      // Log raw response if JSON parsing fails
      console.warn('[parseApiResponse] Failed to parse JSON:', {
        status: res.status,
        statusText: res.statusText,
        rawText: text.substring(0, 500), // First 500 chars
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      data = text;
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    data,
    raw: text || undefined,
  };
}
