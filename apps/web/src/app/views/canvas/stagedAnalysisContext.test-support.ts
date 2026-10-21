/** Real canonical documents and admitted inputs for staged context regression tests. */
import type { ConnectionRef } from '@dvt/contracts';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { source } from './canvasRelationalOperator.test-support';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { configureCanvasStagedComposition } from './canvasStagedCompositionConfiguration';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';

export function compositionInput(
  name: string,
  model: boolean,
  connection: ConnectionRef = source(name).sourceRef.connectionRef
): CanvasDvtCompositionInput {
  const physical = source(name);
  const sourceRef = { ...physical.sourceRef, connectionRef: connection };
  const fields = physical.fields.map((field) => ({
    name: field.name,
    dataType: field.type,
    joinDataType: field.type,
  }));
  if (!model) return { nodeId: name, schema: 'public', table: name, sourceRef, fields };
  const nodeId = `${name}-model`;
  const document = createDvtSubstraitProjectionDraft({
    source: { ...physical, sourceRef, fields },
    targetNodeId: nodeId,
    outputs: fields.map((field) => ({
      fieldId: `${name}:${field.name}`,
      name: field.name,
      sourceFieldName: field.name,
    })),
  });
  return {
    nodeId,
    schema: '',
    table: nodeId,
    sourceRef: null,
    producer: { nodeId, name: nodeId, document, connection },
    fields: fields.map((field) => ({ ...field, id: `${name}:${field.name}` })),
  };
}

export function stagedModelJoinFixture(models: readonly [boolean, boolean] = [true, true]) {
  const inputs = models.map((model, port) =>
    compositionInput(port === 0 ? 'left' : 'right', model)
  );
  const sources = inputs.map(createPendingSourceOccurrence);
  const staged = configureCanvasStagedComposition(
    {
      id: 'pending-operation:join',
      operation: 'inner_join',
      inputs: sources.map((item) => item.read.binding.relationId),
    },
    inputs,
    sources,
    []
  );
  const document = decodeCanvasStagedOperation(staged)!;
  return {
    inputs,
    staged,
    document,
    binding: {
      inputs,
      readFieldEligibility: () => ({ denied: new Set<string>(), disconnected: new Set<string>() }),
    },
  };
}
