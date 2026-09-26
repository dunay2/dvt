/** React owns lifetime only; canonical analysis and revision changes stay outside presentation. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { ConnectionRef } from '@dvt/contracts';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

export function useCanvasRelationAnalysisSession(
  document: SubstraitDocument | null,
  scope: string,
  connection?: ConnectionRef,
  deniedInputs?: ReadonlySet<string>
) {
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
    document: SubstraitDocument | null;
    session: CanvasRelationAnalysisSession;
    revision: number;
    error: unknown;
  } | null>(null);
  useEffect(() => () => session.dispose(), [session]);
  useEffect(() => {
    try {
      session.receive(document, deniedInputs);
      setReady({ document, session, revision: session.revision, error: null });
    } catch (error) {
      session.dispose();
      setReady({ document, session, revision: session.revision, error });
    }
  }, [document, session, deniedInputs]);
  const refresh = useCallback(() => {
    setReady((current) => (current == null ? null : { ...current, revision: session.revision }));
  }, [session]);
  return useMemo(
    () =>
      ready?.document === document && ready?.session === session ? { ...ready, refresh } : null,
    [ready, document, session, refresh]
  );
}
