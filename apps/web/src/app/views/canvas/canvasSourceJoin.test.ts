import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { createSourceJoin } from './canvasSourceJoin';

describe('source JOIN creation', () => {
  it('creates distinct occurrences of the same physical source with arbitrary fields', () => {
    const source = {
      nodeId: 'countries',
      schema: 'raw',
      table: 'countries',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1' as const,
        sourceObjectId: 'raw.countries',
        connectionRef: {
          schemaVersion: 'connection-ref.v1' as const,
          provider: 'postgres' as const,
          connectionId: 'warehouse',
        },
      },
    };
    const input = { source, fields: ['code', 'label'] };
    const document = createSourceJoin({
      left: input,
      right: input,
      leftFieldName: 'code',
      rightFieldName: 'code',
      targetNodeId: 'model',
    });
    const { index, schemas } = deriveSubstraitSchemas(document);
    const root = index.relations.get(index.rootId)!;
    expect(new Set(root.inputs).size).toBe(2);
    expect(schemas.get(index.rootId)).toHaveLength(4);
    expect(new Set(document.sidecar.fields.map((field) => field.fieldId)).size).toBe(
      document.sidecar.fields.length
    );
    expect(new Set(root.fields.map((field) => field.displayName)).size).toBe(4);
  });
});
