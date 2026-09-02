import { describe, expect, it } from 'vitest';

import {
  applyDvtSubstraitProjectionFunction,
  createDvtSubstraitProjectionDraft,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { setDvtSubstraitFieldDescription } from './canvasDvtSubstraitFieldDocumentation';

const trimCapabilityId = resolveDvtSubstraitColumnFunctions({
  dataType: 'text',
  provider: 'postgres',
}).find((entry) => entry.name === 'trim')!.capabilityId;

function projectionDraft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'source-orders',
      schema: 'raw',
      table: 'orders',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: 'raw.orders',
      },
      fields: [
        { name: 'customer', dataType: 'text' },
        { name: 'status', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-orders',
    outputs: [
      { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
      { fieldId: 'output:status', name: 'status', sourceFieldName: 'status' },
    ],
  });
}

describe('Substrait projection function aliases', () => {
  it('records the function and output alias atomically without losing source lineage', () => {
    const draft = projectionDraft();
    const nextDraft = applyDvtSubstraitProjectionFunction(draft, {
      fieldId: 'output:customer',
      capabilityId: trimCapabilityId,
      alias: 'customer_clean',
      dataType: 'text',
      provider: 'postgres',
    });

    expect(nextDraft).not.toBe(draft);
    const inspection = inspectDvtSubstraitProjectionDraft(nextDraft);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(
      inspection.projection.outputs.find((output) => output.fieldId === 'output:customer')
    ).toMatchObject({
      name: 'customer_clean',
      sourceFieldName: 'customer',
      operations: ['trim'],
    });
  });

  it('rejects blank and duplicate aliases without partially changing the draft', () => {
    const draft = projectionDraft();
    const apply = (alias: string): DvtSubstraitProjectionDraft =>
      applyDvtSubstraitProjectionFunction(draft, {
        fieldId: 'output:customer',
        capabilityId: trimCapabilityId,
        alias,
        dataType: 'text',
        provider: 'postgres',
      });

    expect(apply('   ')).toBe(draft);
    expect(apply('status')).toBe(draft);
  });

  it('does not let an alias hide an unprojected source field', () => {
    const draft = createDvtSubstraitProjectionDraft({
      source: {
        nodeId: 'source-orders',
        schema: 'raw',
        table: 'orders',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-main',
            provider: 'postgres',
          },
          sourceObjectId: 'raw.orders',
        },
        fields: [
          { name: 'customer', dataType: 'text' },
          { name: 'status', dataType: 'text' },
        ],
      },
      targetNodeId: 'transform-orders',
      outputs: [{ fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' }],
    });

    expect(
      applyDvtSubstraitProjectionFunction(draft, {
        fieldId: 'output:customer',
        capabilityId: trimCapabilityId,
        alias: 'status',
        dataType: 'text',
        provider: 'postgres',
      })
    ).toBe(draft);
  });

  it('keeps field documentation attached while applying a function and alias', () => {
    const draft = projectionDraft();
    const documented = setDvtSubstraitFieldDescription({
      metadata: {
        kind: 'transform',
        mode: 'substrait',
        shape: 'projection',
        plan: draft.plan,
        sidecar: draft.sidecar,
      },
      fieldId: 'output:customer',
      description: 'Customer name prepared for matching',
    });
    const nextDraft = applyDvtSubstraitProjectionFunction(
      { plan: documented.plan, sidecar: documented.sidecar },
      {
        fieldId: 'output:customer',
        capabilityId: trimCapabilityId,
        alias: 'customer_clean',
        dataType: 'text',
        provider: 'postgres',
      }
    );
    const inspection = inspectDvtSubstraitProjectionDraft(nextDraft);

    expect(inspection.ok ? inspection.projection.outputs[0] : null).toMatchObject({
      name: 'customer_clean',
      description: 'Customer name prepared for matching',
    });
  });
});
