/** Owned concern: adapt closed frontend operability events to structured browser-console output. */
import type {
  FrontendOperabilityEvent,
  FrontendOperabilitySink,
} from '../../ports/frontendOperability';

type StructuredOperabilityConsole = Readonly<{
  warn(marker: string, event: FrontendOperabilityEvent): void;
}>;

export function createConsoleFrontendOperabilitySink(
  output: StructuredOperabilityConsole = console
): FrontendOperabilitySink {
  return {
    record: (event) => output.warn('[frontend-operability]', event),
  };
}
