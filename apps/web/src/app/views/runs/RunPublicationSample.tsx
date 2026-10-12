/**
 * Owned concern: connect run publication sampling to existing workspace query ports.
 * @baseline GH-3021-RUN-PUBLICATION-SAMPLE: reuse protected source sampling by publication token.
 * @decision Bind services and subscribed scope only at the Runs composition boundary.
 * @consequence The state view and sample template remain independently testable.
 * @version 1.0.0
 */
import { useSyncExternalStore } from 'react';

import type { RunSnapshot } from '../../ports/runs';
import {
  useSessionContext,
  useWarehouseSourceDataSampleQueryPort,
  useWarehouseSourceImportPort,
} from '../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { RunPublicationSampleTemplate } from './RunPublicationSampleTemplate';
import { runPublicationSampleCopy } from './runPublicationSampleCopy';
import { useRunPublicationSample } from './useRunPublicationSample';

export function RunPublicationSample({ snapshot }: Readonly<{ snapshot: RunSnapshot }>) {
  const sessionContext = useSessionContext();
  const connections = useWarehouseSourceImportPort();
  const samples = useWarehouseSourceDataSampleQueryPort();
  const scope = useSyncExternalStore(
    sessionContext.subscribeWorkspaceScope,
    sessionContext.getWorkspaceScopeSnapshot,
    sessionContext.getWorkspaceScopeSnapshot
  );
  const language = useApplicationLanguageStore((state) => state.language);
  const { state, load } = useRunPublicationSample({
    snapshot,
    scope,
    connections,
    samples,
    getScope: sessionContext.getWorkspaceScope,
  });

  return (
    <RunPublicationSampleTemplate
      state={state}
      onLoad={load}
      copy={runPublicationSampleCopy[language]}
    />
  );
}
