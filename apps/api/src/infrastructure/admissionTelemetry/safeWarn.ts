import type { IObservability } from '@dvt/observability';

/**
 * Attempts to emit a warn log. Swallows any logger failure so callers can
 * use this in error-recovery paths without risking re-entrant exceptions.
 */
export function safeWarn(
  logs: IObservability['logs'],
  msg: string,
  err: unknown
): void {
  try {
    logs.warn({ msg, attributes: { error: String(err) } });
  } catch {
    // Logger unavailable — ignore silently.
  }
}
