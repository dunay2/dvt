/** Proves output inspection resolves canonical identity without a second expression authority. */
import { expect } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

export function fixture(alias = 'customer'): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'orders',
      schema: 'raw',
      table: 'orders',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        sourceObjectId: 'raw.orders',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'postgres-main',
          provider: 'postgres',
        },
      },
      fields: [
        { name: 'customer', dataType: 'text' },
        { name: 'country', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-orders',
    outputs: [
      { fieldId: 'output:customer', name: alias, sourceFieldName: 'customer' },
      { fieldId: 'output:country', name: 'country', sourceFieldName: 'country' },
    ],
  });
}

export function node(draft: DvtSubstraitProjectionDraft): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-orders',
      name: 'Orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
    encodeDvtSubstraitProjectionDocument(draft)
  );
}

export function scalar(
  draft: DvtSubstraitProjectionDraft,
  name: string,
  operands: [string, ...string[]],
  alias: string
): Extract<ReturnType<typeof createDvtSubstraitProjectionOutput>, { outcome: 'applied' }> {
  const dataTypes = operands.map(() => 'string');
  const capability = resolveDvtSubstraitColumnFunctions({ dataTypes, provider: 'postgres' }).find(
    (entry) => entry.name.toLowerCase() === name
  );
  expect(capability).toBeDefined();
  const result = createDvtSubstraitProjectionOutput(
    draft,
    {
      alias,
      expression: {
        kind: 'scalar-function',
        capabilityId: capability!.capabilityId,
        operandFieldIds: operands,
      },
    },
    { inputDataTypes: dataTypes, provider: 'postgres' }
  );
  if (result.outcome !== 'applied') throw new Error(result.reason);
  return result;
}
