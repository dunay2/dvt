import { useMemo } from 'react';

import { useCapabilitiesQuery } from '../queries/useCapabilitiesQuery';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { buildShellRuntimeState } from './shellRuntimeModel';

export function useShellRuntime() {
  const capabilitiesQuery = useCapabilitiesQuery();
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);

  const runtime = useMemo(
    () => buildShellRuntimeState(capabilitiesQuery.data, applicationLanguage),
    [applicationLanguage, capabilitiesQuery.data]
  );

  return {
    capabilitiesQuery,
    ...runtime,
  };
}
