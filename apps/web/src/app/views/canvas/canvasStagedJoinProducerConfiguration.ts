/** Compose a configured JOIN from one relation-tree producer and one detached Read. */
import { clone } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { deriveSubstraitSchemas, type SubstraitDocument } from '@dvt/substrait-analysis';
import { hasSameConnectionRef } from '@dvt/postgres-projection';
import { createCanonicalComposition } from './canvasCanonicalComposition';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasDvtJoinFieldPair } from './canvasDvtJoinTypeAdmission';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { isCanvasJoinOperation, type CanvasJoinOperation } from './canvasRelationalTreeJoinType';
import { joinConditionFields } from './canvasSelectedJoin';
import { createSourceDocument } from './canvasSourceDocument';
import { canvasInputConnection } from './canvasSourceRelation';
import { configureCanvasStagedJoin, decodeCanvasStagedJoin } from './canvasStagedJoinConfiguration';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';

type JoinAnalysis = Readonly<{
  document: SubstraitDocument | null;
  revision: number;
  session: CanvasRelationAnalysisSession;
}> | null;

function documentUsesConnection(
  document: SubstraitDocument,
  inputs: readonly CanvasDvtCompositionInput[],
  pendingInput: CanvasDvtCompositionInput
): boolean {
  const expected = canvasInputConnection(pendingInput);
  return document.sidecar.relations.every((binding) => {
    if (binding.sourceRef != null)
      return hasSameConnectionRef(binding.sourceRef.connectionRef, expected);
    if (binding.producerRef == null) return true;
    const input = inputs.find((candidate) => candidate.nodeId === binding.producerRef?.nodeId);
    return input != null && hasSameConnectionRef(canvasInputConnection(input), expected);
  });
}

export async function configureCanvasStagedJoinFromProducer(
  operation: CanvasStagedOperation,
  inputs: readonly CanvasDvtCompositionInput[],
  pendingSources: readonly PendingSourceOccurrence[],
  stagedOperations: readonly CanvasStagedOperation[],
  analysis: JoinAnalysis = null
): Promise<CanvasStagedOperation> {
  const configured = configureCanvasStagedJoin(operation, inputs, pendingSources, analysis);
  if (
    configured.semanticDocument != null ||
    !isCanvasJoinOperation(operation.operation) ||
    operation.inputs.some((input) => input == null)
  )
    return configured;
  const pendingPort = operation.inputs.findIndex((relationId) =>
    pendingSources.some((source) => source.read.binding.relationId === relationId)
  );
  if (pendingPort < 0) return operation;
  const richPort = pendingPort === 0 ? 1 : 0;
  const pending = pendingSources.find(
    (source) => source.read.binding.relationId === operation.inputs[pendingPort]
  );
  const pendingInput = inputs.find((input) => input.nodeId === pending?.sourceNodeId);
  const richId = operation.inputs[richPort];
  const stagedProducer = stagedOperations.find((candidate) => candidate.id === richId);
  const richDocument =
    analysis != null && richId === analysis.session.rootId
      ? analysis.document
      : decodeCanvasStagedJoin(stagedProducer?.semanticDocument);
  if (
    pending == null ||
    pendingInput == null ||
    richDocument == null ||
    richId == null ||
    !documentUsesConnection(richDocument, inputs, pendingInput)
  )
    return operation;
  return composeProducerJoin(
    operation,
    operation.operation,
    pendingPort,
    pending,
    richId,
    richDocument
  );
}

async function composeProducerJoin(
  operation: CanvasStagedOperation,
  joinOperation: CanvasJoinOperation,
  pendingPort: number,
  pending: PendingSourceOccurrence,
  richId: string,
  document: SubstraitDocument
): Promise<CanvasStagedOperation> {
  const session = new CanvasRelationAnalysisSession(`${operation.id}:configuration`);
  try {
    session.receive(document);
    if (session.rootId !== richId) return operation;
    const rich = session.locate(richId, session.revision);
    const richSchema = await session.query(richId);
    const maxAnchor = Math.max(0, ...document.sidecar.relations.map((item) => item.relAnchor));
    const relation = clone(RelSchema, pending.read.relation);
    if (relation.relType.case !== 'read') return operation;
    relation.relType.value.common!.relAnchor = maxAnchor + 1;
    const read = {
      relation,
      binding: { ...pending.read.binding, relAnchor: maxAnchor + 1 },
      fields: pending.read.fields,
    };
    const readSchema = deriveSubstraitSchemas(createSourceDocument([read], read)).schemas.get(
      read.binding.relationId
    );
    if (readSchema == null) return operation;
    const operands = pendingPort === 0 ? [read, rich] : [rich, read];
    const schemas =
      pendingPort === 0 ? [readSchema, richSchema.fields] : [richSchema.fields, readSchema];
    const fields = joinConditionFields(
      schemas.map((schema, port) => ({ bindings: operands[port]!.fields, fields: schema })),
      (field, port) => `${operands[port]!.binding.displayName}.${field.displayName}`
    );
    const options = (port: number) =>
      fields
        .filter((field) => field.inputIndex === port)
        .map((field) => ({
          name: field.label,
          joinDataType: field.dataType,
          fieldId: field.fieldId,
        }));
    const pair = resolveCanvasDvtJoinFieldPair(options(0), options(1));
    if (pair == null) return operation;
    const plan = clone(PlanSchema, document.plan);
    const binding = {
      relationId: operation.id,
      relAnchor: maxAnchor + 2,
      displayName: joinOperation,
    };
    const root = {
      ...createCanonicalComposition({
        plan,
        binding,
        operation: joinOperation,
        inputs: operands,
        schemas,
        predicate: { leftFieldId: pair.left.fieldId, rightFieldId: pair.right.fieldId },
      }),
      binding,
    };
    const entries = document.sidecar.relations.map((item) =>
      session.locate(item.relationId, session.revision)
    );
    return {
      ...operation,
      semanticDocument: encodeDvtSubstraitSemanticDocument(
        createSourceDocument([...entries, read, root], root, root.extensions ?? plan)
      ),
    };
  } catch {
    return operation;
  } finally {
    session.dispose();
  }
}
