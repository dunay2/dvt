/**
 * Owned concern: expose the canonical session and its accepted graph-derived eligibility.
 * @baseline GH-3596 / GH-3578: equivalent acknowledgements do not change command authority.
 * @decision Identify both eligibility sets by content alongside the accepted revision.
 * @consequence React wrapper refreshes remain distinct from semantic or permission changes.
 * @version 1.2.0
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { ConnectionRef } from '@dvt/contracts';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

export function useCanvasRelationAnalysisSession(
  document: SubstraitDocument | null,
  scope: string,
  connection?: ConnectionRef,
  deniedInputs?: ReadonlySet<string>,
  disconnectedInputs?: ReadonlySet<string>
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
    permissionIdentity: string;
    error: unknown;
  } | null>(null);
  useEffect(() => () => session.dispose(), [session]);
  useEffect(() => {
    const permissionIdentity = JSON.stringify(
      [deniedInputs, disconnectedInputs].map((fields) =>
        [...(fields ?? [])].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
      )
    );
    try {
      session.receive(document, deniedInputs, disconnectedInputs);
      setReady({ document, session, revision: session.revision, permissionIdentity, error: null });
    } catch (error) {
      session.dispose();
      setReady({ document, session, revision: session.revision, permissionIdentity, error });
    }
  }, [document, session, deniedInputs, disconnectedInputs]);
  const refresh = useCallback(() => {
    setReady((current) => (current == null ? null : { ...current, revision: session.revision }));
  }, [session]);
  return useMemo(() => {
    if (ready?.session !== session || !session.hasDocument(document)) return null;
    return {
      ...ready,
      document,
      revision: session.revision,
      refresh,
    };
  }, [ready, document, session, refresh]);
}
