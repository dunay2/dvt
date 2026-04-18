import { useContext } from 'react';
import { UNSAFE_DataRouterContext, UNSAFE_DataRouterStateContext } from 'react-router';

// React Router does not expose a stable public hook for "is a Data Router present?".
// Keep the unstable context seam isolated to one bootstrap-internal module.
export function useHasDataRouterContext(): boolean {
  const dataRouterContext = useContext(UNSAFE_DataRouterContext);
  const dataRouterState = useContext(UNSAFE_DataRouterStateContext);
  return Boolean(dataRouterContext && dataRouterState);
}
