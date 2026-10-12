/** Own async connection lifetime; delegate graph policy and semantic materialization. */
import { useEffect, useRef } from 'react';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { createCanvasStagedOperationActions } from './canvasStagedOperationActions';
import type { CanvasRelationalFieldReference } from './canvasRelationalTreeDrag';
import { admitCanvasStagedConnection } from './canvasStagedConnectionAdmission';
import { readCanvasRelationalPublishedField } from './canvasRelationalFieldSelection';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import {
  openCanvasStagedFieldProducer,
  projectCanvasStagedDocument,
} from './canvasStagedOperationDocument';

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
      (analysis?.document == null && reference.producerPlanSha256 == null) ||
      analysis?.error != null
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
    const producer = openCanvasStagedFieldProducer({
      reference,
      operations: args.operations,
      canonical: analysis?.document ?? null,
      canonicalSession: analysis?.session ?? null,
    });
    if (producer == null) return false;
    const scopedReference =
      reference.producerPlanSha256 == null
        ? reference
        : { ...reference, revision: producer.session.revision };
    const controller = new AbortController();
    pending.current = controller;
    const cancelled = () => signal.aborted || controller.signal.aborted;
    const stillCurrent = () =>
      !cancelled() &&
      current.current.analysis?.session === analysis?.session &&
      current.current.analysis?.document === analysis?.document &&
      current.current.analysis?.error == null &&
      producer.session.revision === scopedReference.revision &&
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
      await readCanvasRelationalPublishedField(producer.session, scopedReference, signal);
      if (!stillCurrent()) return false;
      const document = projectCanvasStagedDocument(producer.document, reference.relationId);
      const configured = await configureCanvasStagedTransform(
        { ...target, inputs: [reference.relationId] },
        document,
        reference.fieldId
      );
      await readCanvasRelationalPublishedField(producer.session, scopedReference, signal);
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
      producer.dispose();
      if (pending.current === controller) pending.current = null;
    }
  };
}
