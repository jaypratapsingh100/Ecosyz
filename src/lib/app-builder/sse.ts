/**
 * Server-Sent Events helper for streaming AI generation progress to the client.
 */

export type SSEEventType = 'status' | 'token' | 'file-created' | 'done' | 'error' | 'plan' | 'architecture';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

/**
 * Create a ReadableStream that emits SSE-formatted events.
 * Returns the stream and an emitter to push events.
 */
export function createSSEStream() {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
    },
    cancel() {
      controller = null;
    },
  });

  function emit(event: SSEEvent) {
    if (!controller) return;
    try {
      const data = JSON.stringify(event);
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    } catch {
      // Stream may have been closed
    }
  }

  function close() {
    if (!controller) return;
    try {
      controller.close();
    } catch {
      // Already closed
    }
    controller = null;
  }

  return { stream, emit, close };
}

/**
 * Create a Response with SSE headers for streaming.
 */
export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
