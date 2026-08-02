/** Owned concern: emit operability evidence once per observable state occurrence. */
import { useEffect } from 'react';

import {
  type FrontendOperabilityTransitionChannel,
  type FrontendOperabilityTransitionRecorder,
} from './frontendOperabilityRecorder';
import type { FrontendOperabilityEvent } from '../../ports/frontendOperability';

export function useFrontendOperabilityTransition(
  recorder: FrontendOperabilityTransitionRecorder,
  channel: FrontendOperabilityTransitionChannel,
  event: FrontendOperabilityEvent | null | undefined
): void {
  useEffect(() => {
    if (event === undefined) {
      return;
    }
    recorder.recordTransition(channel, event);
  }, [channel, event, recorder]);

  useEffect(
    () => () => {
      recorder.recordTransition(channel, null);
    },
    [channel, recorder]
  );
}
