export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'number' || typeof error === 'boolean' || typeof error === 'bigint') {
    return error.toString();
  }
  if (typeof error === 'symbol') {
    return error.description ?? error.toString();
  }
  if (error === null) return 'null';
  if (error === undefined) return 'undefined';
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return Object.prototype.toString.call(error);
    }
  }
  if (typeof error === 'function') {
    return error.name ? `[function ${error.name}]` : '[function anonymous]';
  }
  return Object.prototype.toString.call(error);
}
