import { useMemo } from 'react';

import { useCapabilitiesQuery } from '../queries/useCapabilitiesQuery';
import { buildShellRuntimeState } from './shellRuntimeModel';

export function useShellRuntime() {
  const capabilitiesQuery = useCapabilitiesQuery();

  const runtime = useMemo(
    () => buildShellRuntimeState(capabilitiesQuery.data),
    [capabilitiesQuery.data]
  );

  return {
    capabilitiesQuery,
    ...runtime,
  };
}
