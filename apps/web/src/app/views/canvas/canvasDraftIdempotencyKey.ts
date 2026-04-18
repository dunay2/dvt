export function createCanvasDraftIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `canvas-draft:${crypto.randomUUID()}`;
  }

  return `canvas-draft:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}
