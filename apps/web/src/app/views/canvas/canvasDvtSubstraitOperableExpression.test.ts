import type { ConnectedSourceRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionOutput,
  type DvtSubstraitCreateOutputRequest,
} from './canvasDvtSubstraitCalculatedColumn';
import { projectDvtSubstraitOperableOutput } from './canvasDvtSubstraitOperableExpression';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitColumnFunctions,
  resolveDvtSubstraitProjectionEntry,
  type DvtSubstraitProjection,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';

const OPAQUE_FIELD_ID =
  /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const sourceRef: ConnectedSourceRef = {
  schemaVersion: 'connected-source-ref.v1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'postgres-main',
    provider: 'postgres',
  },
  sourceObjectId: 'raw.orders',
};

const source: CanonicalNode = {
  id: 'source-orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: sourceRef,
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
    ],
  },
};

const target: CanonicalNode = {
  id: 'transform-orders',
  name: 'Transform orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};

function baseDraft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'raw',
      table: 'orders',
      sourceRef,
      fields: [
        { name: 'order_id', dataType: 'integer' },
        { name: 'customer', dataType: 'text' },
      ],
    },
    targetNodeId: target.id,
    outputs: [
      { fieldId: 'legacy-output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
      { fieldId: 'legacy-output:customer', name: 'customer', sourceFieldName: 'customer' },
    ],
  });
}

function resolveProjection(draft: DvtSubstraitProjectionDraft): DvtSubstraitProjection {
  const projection = resolveDvtSubstraitProjectionEntry({
    targetNode: target,
    nodes: [source, target],
    edges: [{ sourceId: source.id, targetId: target.id }],
    draft,
  });
  if (projection == null) throw new Error('Expected an admitted projection fixture.');
  return projection;
}

function createOutput(
  draft: DvtSubstraitProjectionDraft,
  request: DvtSubstraitCreateOutputRequest
): Readonly<{ draft: DvtSubstraitProjectionDraft; createdFieldId: string }> {
  const projection = resolveProjection(draft);
  const inputFieldId =
    request.expression.kind === 'scalar-function' ? request.expression.inputFieldId : undefined;
  const input = projection.outputs.find((output) => output.fieldId === inputFieldId);
  const result = createDvtSubstraitProjectionOutput(
    draft,
    request,
    request.expression.kind === 'scalar-function' && input != null
      ? {
          inputDataType: input.dataType,
          provider: projection.source.sourceRef.connectionRef.provider,
        }
      : undefined
  );
  if (result.outcome !== 'applied') throw new Error('Expected output creation to be admitted.');
  return { draft: result.draft, createdFieldId: result.createdFieldId };
}

describe('DVT Substrait operable output grammar', () => {
  it('projects a direct output as one FieldRef without mutating canonical authority', () => {
    const draft = baseDraft();
    const before = encodeDvtSubstraitProjectionDocument(draft);
    const projection = resolveProjection(draft);

    const operable = projectDvtSubstraitOperableOutput({
      draft,
      projection,
      fieldId: 'legacy-output:customer',
    });

    expect(operable).toMatchObject({
      fieldId: 'legacy-output:customer',
      alias: 'customer',
      expression: { kind: 'field-ref', name: 'customer', dataType: 'text' },
    });
    expect(operable?.expression.kind === 'field-ref' && operable.expression.fieldId).toMatch(
      OPAQUE_FIELD_ID
    );
    expect(encodeDvtSubstraitProjectionDocument(draft)).toEqual(before);
  });

  it('returns the created FieldId directly and reuses a derived scalar output as another operand', () => {
    const functions = resolveDvtSubstraitColumnFunctions({ dataType: 'text', provider: 'postgres' });
    const trim = functions.find((candidate) => candidate.name === 'trim');
    const upper = functions.find((candidate) => candidate.name === 'upper');
    if (trim == null || upper == null) throw new Error('Expected admitted text capabilities.');

    const first = createOutput(baseDraft(), {
      alias: 'customer_clean',
      expression: {
        kind: 'scalar-function',
        inputFieldId: 'legacy-output:customer',
        capabilityId: trim.capabilityId,
      },
    });
    expect(first.createdFieldId).toMatch(OPAQUE_FIELD_ID);
    expect(first.createdFieldId).not.toContain('customer_clean');

    const second = createOutput(first.draft, {
      alias: 'customer_normalized',
      expression: {
        kind: 'scalar-function',
        inputFieldId: first.createdFieldId,
        capabilityId: upper.capabilityId,
      },
    });
    expect(second.createdFieldId).toMatch(OPAQUE_FIELD_ID);
    expect(second.createdFieldId).not.toBe(first.createdFieldId);

    const canonicalProjection = resolveProjection(second.draft);
    const misleadingLinearProjection: DvtSubstraitProjection = {
      ...canonicalProjection,
      outputs: canonicalProjection.outputs.map((output) =>
        output.fieldId === second.createdFieldId ? { ...output, operations: ['lower'] } : output
      ),
    };
    const operable = projectDvtSubstraitOperableOutput({
      draft: second.draft,
      projection: misleadingLinearProjection,
      fieldId: second.createdFieldId,
    });
    expect(operable).toMatchObject({
      fieldId: second.createdFieldId,
      alias: 'customer_normalized',
      expression: {
        kind: 'scalar-function',
        name: 'upper',
        arguments: [
          {
            kind: 'scalar-function',
            name: 'trim',
            arguments: [{ kind: 'field-ref', name: 'customer', dataType: 'text' }],
          },
        ],
      },
    });
  });

  it('projects admitted literal and row-number outputs from canonical Substrait semantics', () => {
    const literal = createOutput(baseDraft(), {
      alias: 'channel',
      expression: { kind: 'string-literal', value: 'web' },
    });
    const rowNumber = createOutput(literal.draft, {
      alias: 'row_id',
      expression: { kind: 'row-number', orderFieldId: 'legacy-output:order_id' },
    });
    const projection = resolveProjection(rowNumber.draft);

    expect(
      projectDvtSubstraitOperableOutput({
        draft: rowNumber.draft,
        projection,
        fieldId: literal.createdFieldId,
      })
    ).toEqual({
      fieldId: literal.createdFieldId,
      alias: 'channel',
      expression: { kind: 'literal', literalType: 'string', value: 'web' },
    });
    expect(
      projectDvtSubstraitOperableOutput({
        draft: rowNumber.draft,
        projection,
        fieldId: rowNumber.createdFieldId,
      })
    ).toMatchObject({
      fieldId: rowNumber.createdFieldId,
      alias: 'row_id',
      expression: {
        kind: 'row-number',
        orderBy: { kind: 'field-ref', name: 'order_id', dataType: 'integer' },
      },
    });
  });
});
