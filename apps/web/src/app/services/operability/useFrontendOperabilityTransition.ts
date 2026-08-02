/** Owned concern: emit operability evidence once per observable state occurrence. */
import { useEffect, useRef } from 'react';

import type {
  FrontendOperabilityEvent,
  FrontendOperabilitySink,
} from '../../ports/frontendOperability';
import {
  getFrontendOperabilityEventKey,
  recordFrontendOperabilityEvent,
} from './frontendOperabilityRecorder';

export function useFrontendOperabilityTransition(
  sink: FrontendOperabilitySink,
  event: FrontendOperabilityEvent | null
): void {
  const previousEventKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (event === null) {
      previousEventKeyRef.current = null;
      return;
    }

    const eventKey = getFrontendOperabilityEventKey(event);
    if (previousEventKeyRef.current === eventKey) {
      return;
    }

    previousEventKeyRef.current = eventKey;
    recordFrontendOperabilityEvent(sink, event);
  }, [event, sink]);
}
