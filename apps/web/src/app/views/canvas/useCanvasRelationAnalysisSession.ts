/**
 * Owned concern: expose the canonical session and its accepted graph-derived eligibility.
 * @baseline GH-3596 / GH-3578: equivalent acknowledgements do not change command authority.
 * @decision Admit received inputs by value before applying effects to the working session.
 * @consequence Equivalent acknowledgements cannot overwrite a local edit awaiting publication.
 * @version 1.3.0
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { ConnectionRef } from '@dvt/contracts';
import {
  areCanvasRelationDocumentsEqual,
  CanvasRelationAnalysisSession,
} from './canvasRelationAnalysisSession';

export function useCanvasRelationAnalysisSession(
  document: SubstraitDocument | null,
  scope: string,
  connection?: ConnectionRef,
  deniedInputs?: ReadonlySet<string>,
  disconnectedInputs?: ReadonlySet<string>
) {
  const permissionIdentity = useMemo(
    () =>
      JSON.stringify(
        [deniedInputs, disconnectedInputs].map((fields) =>
          [...(fields ?? [])].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
        )
      ),
    [deniedInputs, disconnectedInputs]
  );
  const [received, setReceived] = useState({
    document,
    deniedInputs,
    disconnectedInputs,
    permissionIdentity,
  });
  const sameDocument = useMemo(
    () => areCanvasRelationDocumentsEqual(received.document, document),
    [received.document, document]
  );
  if (!sameDocument || received.permissionIdentity !== permissionIdentity)
    setReceived({ document, deniedInputs, disconnectedInputs, permissionIdentity });
  const provider = connection?.provider;
  const connectionId = connection?.connectionId;
  const session = useMemo(
    () =>
      new CanvasRelationAnalysisSession(
        scope,
        provider == null || connectionId == null
          ? undefined
          : { schemaVersion: 'connection-ref.v1', provider, connectionId }
      ),
    [scope, provider, connectionId]
  );
  const [ready, setReady] = useState<{
    received: typeof received;
    session: CanvasRelationAnalysisSession;
    revision: number;
    error: unknown;
  } | null>(null);
  useEffect(() => () => session.dispose(), [session]);
  useEffect(() => {
    try {
      session.receive(received.document, received.deniedInputs, received.disconnectedInputs);
      setReady({ received, session, revision: session.revision, error: null });
    } catch (error) {
      session.dispose();
      setReady({ received, session, revision: session.revision, error });
    }
  }, [received, session]);
  const refresh = useCallback(() => {
    setReady((current) => (current == null ? null : { ...current, revision: session.revision }));
  }, [session]);
  return useMemo(() => {
    if (ready?.session !== session) return null;
    const retained = ready.received === received && ready.error == null;
    if (
      !retained &&
      (ready.received.permissionIdentity !== received.permissionIdentity ||
        !session.hasDocument(received.document))
    )
      return null;
    return {
      session,
      document: received.document,
      revision: retained ? ready.revision : session.revision,
      permissionIdentity: received.permissionIdentity,
      error: ready.error,
      refresh,
    };
  }, [ready, received, session, refresh]);
}
