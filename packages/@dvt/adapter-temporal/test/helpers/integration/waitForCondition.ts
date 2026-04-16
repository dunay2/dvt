export type WaitForConditionFn = <T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  opts?: { timeoutMs?: number; intervalMs?: number }
) => Promise<T>;

export async function waitForCondition<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  opts: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 5_000;
  const intervalMs = opts.intervalMs ?? 50;
  const deadline = Date.now() + timeoutMs;

  while (true) {
    const value = await fn();
    if (predicate(value)) {
      return value;
    }
    if (Date.now() >= deadline) {
      throw new Error(`TIMEOUT_WAITING_FOR_CONDITION after ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
