/** Combine independent form drafts before allowing the owning model to apply or close. */
import { useEffect, useRef, useState } from 'react';

export function usePendingRelationEdits(onChange?: (pending: boolean) => void) {
  const [properties, setProperties] = useState(false);
  const [outputs, setOutputs] = useState(false);
  const callback = useRef(onChange);
  callback.current = onChange;
  const pending = properties || outputs;
  useEffect(() => {
    callback.current?.(pending);
    return () => callback.current?.(false);
  }, [pending]);
  return { setProperties, setOutputs };
}
