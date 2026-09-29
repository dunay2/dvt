/** Own async connection lifetime; delegate graph policy and semantic materialization. */
import { useEffect, useRef } from 'react';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { createCanvasStagedOperationActions } from './canvasStagedOperationActions';
import type { CanvasRelationalFieldReference } from './canvasRelationalTreeDrag';
import { admitCanvasStagedConnection } from './canvasStagedConnectionAdmission';
import { readCanvasRelationalPublishedField } from './canvasRelationalFieldSelection';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import { projectCanvasStagedDocument } from './canvasStagedOperationDocument';

export function useCanvasStagedFieldConnection(
  args: Parameters<typeof createCanvasStagedOperationActions>[0],
  analysis: ReturnType<typeof useCanvasRelationAnalysisSession>
) {
  const current = useRef({ args, analysis });
  current.current = { args, analysis };
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  return async (
    reference: CanvasRelationalFieldReference,
    id: string,
    port: number,
    signal: AbortSignal
  ): Promise<boolean> => {
    if (
      pending.current != null ||
      signal.aborted ||
      analysis?.document == null ||
      analysis.error != null
    )
      return false;
    const target = admitCanvasStagedConnection(
      args,
      args.operations,
      id,
      port,
      reference.relationId,
      'field'
    );
    if (target == null) return false;
    const controller = new AbortController();
    pending.current = controller;
    const cancelled = () => signal.aborted || controller.signal.aborted;
    const stillCurrent = () =>
      !cancelled() &&
      current.current.analysis?.session === analysis.session &&
      current.current.analysis.document === analysis.document &&
      current.current.analysis.error == null &&
      analysis.session.revision === reference.revision &&
      current.current.args.operations === args.operations &&
      admitCanvasStagedConnection(
        current.current.args,
        args.operations,
        id,
        port,
        reference.relationId,
        'field'
      ) === target;
    try {
      await readCanvasRelationalPublishedField(analysis.session, reference, signal);
      if (!stillCurrent()) return false;
      const producer = projectCanvasStagedDocument(analysis.document, reference.relationId);
      const configured = await configureCanvasStagedTransform(
        { ...target, inputs: [reference.relationId] },
        producer,
        reference.fieldId
      );
      await readCanvasRelationalPublishedField(analysis.session, reference, signal);
      if (configured.semanticDocument == null || !stillCurrent()) return false;
      args.setOperations((operations) =>
        operations !== args.operations || !stillCurrent()
          ? operations
          : operations.map((operation) => (operation === target ? configured : operation))
      );
      args.setSelectedId(id);
      return true;
    } catch {
      return false;
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  };
}
