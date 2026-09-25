/** Serialize asynchronous analysis, then commit through the existing draft rail with authority CAS. */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { jcsCanonicalize } from '@dvt/crypto';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { canvasDraftSession } from './canvasDraftSession';
import {
  resolveCanvasSessionNode,
  type CanvasColumnMappingResult,
} from './canvasColumnMappingModel';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import type { CanvasDraftSessionCommandRunner } from './useCanvasWorkspaceDraftSession';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { relationOutputIntent, type RelationOutputIntent } from './canvasRelationOutputIntent';

export function useCanvasRelationOutputCommand(
  nodes: ReadonlyMap<string, CanonicalNode>,
  run: CanvasDraftSessionCommandRunner
) {
  const session = useMemo(() => new CanvasRelationAnalysisSession('canvas-output-authoring'), []);
  const latest = useRef<{ nodeId: string; authority: unknown } | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => {
      controller.abort();
      session.dispose();
      latest.current = null;
    };
  }, [session, run]);
  return useCallback(
    (
      intent: RelationOutputIntent,
      fallback: () => CanvasColumnMappingResult
    ): Promise<CanvasColumnMappingResult> => {
      const signal = lifetime.current.signal;
      const execute = async (): Promise<CanvasColumnMappingResult> => {
        try {
          signal.throwIfAborted();
          const { node } = run((current) => ({
            outcome: 'no_changes',
            node: resolveCanvasSessionNode(current, nodes, intent.nodeId),
          }));
          if (node == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
          const authority = readDvtTransformAuthoringAuthority(node);
          if (
            node.kind !== 'dvt:transform' ||
            authority == null ||
            ('parentColumnId' in intent && intent.parentColumnId != null)
          )
            return fallback();
          if (
            latest.current?.nodeId !== node.id ||
            latest.current.authority !== node.metadata?.transformAuthoring
          ) {
            session.receive(decodeDvtSubstraitSemanticDocument(authority.semanticDocument));
            latest.current = { nodeId: node.id, authority: node.metadata?.transformAuthoring };
          }
          const target = session.locate(session.rootId, session.revision);
          const inputs = await Promise.all(target.inputs.map((id) => session.query(id, signal)));
          const outputs = relationOutputIntent(relationOutputSlots(target, inputs), intent);
          const document = await changeSelectedRelationOutputs(session, {
            relationId: session.rootId,
            expectedRevision: session.revision,
            outputs,
            signal,
          });
          signal.throwIfAborted();
          const encoded = encodeDvtSubstraitSemanticDocument(document);
          const result = run((current): CanvasColumnMappingResult => {
            const now = resolveCanvasSessionNode(current, nodes, node.id);
            if (
              now == null ||
              (now.metadata?.transformAuthoring !== node.metadata?.transformAuthoring &&
                jcsCanonicalize(now.metadata?.transformAuthoring ?? null) !==
                  jcsCanonicalize(node.metadata?.transformAuthoring ?? null))
            )
              return { outcome: 'rejected', reason: 'invalid_transform_authority' };
            return {
              outcome: 'applied',
              draftSession: canvasDraftSession.workingSet.upsertNode(
                current,
                applyDvtSubstraitSemanticDocument(now, encoded)
              ),
            };
          });
          latest.current =
            result.outcome === 'applied'
              ? {
                  nodeId: node.id,
                  authority:
                    result.draftSession.localNodeCatalog?.[node.id]?.metadata?.transformAuthoring,
                }
              : null;
          return result;
        } catch {
          latest.current = null;
          return { outcome: 'rejected', reason: 'invalid_transform_authority' };
        }
      };
      const result = queue.current.then(execute, execute);
      queue.current = result;
      return result;
    },
    [nodes, run, session]
  );
}
