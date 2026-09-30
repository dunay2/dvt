/** Test inputs for real configurators; unsupported catalog additions fail explicitly. */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { compositionGraphHarness } from './canvasCompositionSequence.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { configureCanvasStagedBinary } from './canvasStagedBinaryConfiguration';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import {
  readCanvasStagedCompositionSignature,
  type CanvasStagedOperationKind,
} from './canvasStagedOperation';
import {
  assignCanvasStagedRoot,
  resolveCanvasStagedProducerDocument,
} from './canvasStagedOperationDocument';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { insertSelectedRelationTransform } from './canvasSelectedRelationTransform';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { applySelectedUnaryTool } from './relational-operator-form/applySelectedUnaryTool';

export async function configureCompositionStep(
  harness: ReturnType<typeof compositionGraphHarness>,
  kind: CanvasStagedOperationKind,
  producers: readonly string[]
): Promise<string> {
  const id = harness.commands().stage(kind)!;
  producers.forEach((producer, port) => harness.commands().connect(id, port, producer));
  const operation = harness.state.operations.find((entry) => entry.id === id)!;
  const signature = readCanvasStagedCompositionSignature(kind);
  let configured = operation;
  if (signature.configuration === 'binary') {
    configured = configureCanvasStagedBinary(
      operation,
      harness.inputs,
      harness.state.sources,
      harness.state.operations
    );
  } else {
    const document = resolveCanvasStagedProducerDocument({
      relationId: producers[0]!,
      canonical: null,
      ...harness.state,
    });
    if (document == null) throw new Error(`Missing input for ${kind}`);
    if (signature.configuration === 'transform') {
      configured = await configureCanvasStagedTransform(operation, document);
    } else {
      const session = new CanvasRelationAnalysisSession(id);
      try {
        session.receive(document);
        const request = { relationId: session.rootId, expectedRevision: session.revision };
        let next: SubstraitDocument;
        if (kind === 'projection') {
          next = (await insertSelectedRelationTransform(session, request)).document;
        } else if (
          kind === 'filter' ||
          kind === 'sort' ||
          kind === 'fetch' ||
          kind === 'aggregate' ||
          kind === 'window'
        ) {
          const fieldId = (await session.query(session.rootId)).bindings[0]!.fieldId;
          next = await applySelectedUnaryTool(session, {
            ...request,
            intent: 'insert',
            tool: kind,
            fieldId,
            alias: 'metric',
            value: 'C-001',
            capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
            sortKeys: [{ fieldId, direction: SortField_SortDirection.DESC_NULLS_LAST }],
            offset: '1',
            count: '7',
          });
        } else {
          throw new Error(`No semantic test configuration for catalog operation ${kind}`);
        }
        configured = {
          ...operation,
          semanticDocument: encodeDvtSubstraitSemanticDocument(assignCanvasStagedRoot(next, id)),
        };
      } finally {
        session.dispose();
      }
    }
  }
  if (
    configured.semanticDocument == null ||
    !harness.commands().updateConfiguration(id, configured)
  ) {
    throw new Error(`Configuration rejected for ${kind}`);
  }
  return id;
}

export async function configureCalculatedProducer(
  harness: ReturnType<typeof compositionGraphHarness>,
  sourceIndex: number
): Promise<string> {
  const id = await configureCompositionStep(harness, 'field_transform', [
    harness.state.sources[sourceIndex]!.read.binding.relationId,
  ]);
  const document = resolveCanvasStagedProducerDocument({
    relationId: id,
    canonical: null,
    ...harness.state,
  })!;
  const session = new CanvasRelationAnalysisSession(id);
  try {
    session.receive(document);
    const next = await applySelectedRelationDerivedOutput(session, {
      relationId: id,
      expectedRevision: session.revision,
      intent: 'edit',
      alias: 'normalized',
      formula: 'COALESCE(UPPER(TRIM("name")), NULL)',
    });
    const semanticDocument = encodeDvtSubstraitSemanticDocument(next);
    if (
      !harness
        .commands()
        .updateConfiguration(id, { operation: 'field_transform', semanticDocument })
    ) {
      throw new Error('Calculated producer update rejected');
    }
    return id;
  } finally {
    session.dispose();
  }
}
