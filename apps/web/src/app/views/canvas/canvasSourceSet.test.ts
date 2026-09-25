import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { createSourceSet, sourceSetOperations } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

describe('typed canonical SET construction', () => {
  it.each(Object.entries(sourceSetOperations))(
    'retains %s, positional lineage and independent occurrences after persistence',
    (operation, selector) => {
      const inputs = ['north', 'south', 'west'].map((name, index) => ({
        ...source(name),
        fields: [
          { name: `identifier_${index}`, type: 'i64' as const, nullable: false },
          { name: `active_${index}`, type: 'bool' as const, nullable: index === 1 },
        ],
      }));
      const document = createSourceSet({
        inputs,
        targetNodeId: 'model',
        operation: operation as keyof typeof sourceSetOperations,
      });
      const encoded = encodeDvtSubstraitSemanticDocument(document);
      const reopened = decodeDvtSubstraitSemanticDocument(encoded);
      const { index, schemas } = deriveSubstraitSchemas(reopened);
      const root = index.relations.get(index.rootId)!;
      expect(root.relation.relType.case === 'set' && root.relation.relType.value.op).toBe(selector);
      expect(root.inputs.map((id) => index.relations.get(id)!.binding.sourceRef)).toEqual(
        inputs.map((input) => input.sourceRef)
      );
      expect(root.fields.map((field) => field.operandFieldIds)).toEqual(
        [0, 1].map((ordinal) =>
          root.inputs.map((id) => index.relations.get(id)!.fields[ordinal]!.fieldId)
        )
      );
      expect(schemas.get(index.rootId)!.map((field) => field.type.kind.case)).toEqual([
        'i64',
        'bool',
      ]);
      expect(reopened.sidecar).toEqual(encoded.sidecar);
      const second = createSourceSet({
        inputs,
        targetNodeId: 'model',
        operation: operation as keyof typeof sourceSetOperations,
      });
      expect(encodeDvtSubstraitSemanticDocument(second).sidecar.semanticPlanSha256).toBe(
        encoded.sidecar.semanticPlanSha256
      );
      const oldIds = new Set(document.sidecar.fields.map((field) => field.fieldId));
      expect(second.sidecar.fields.every((field) => !oldIds.has(field.fieldId))).toBe(true);
    }
  );

  it.each(['width', 'type', 'connection'] as const)('rejects incompatible input %s', (fault) => {
    const left = source('left');
    const right = source('right');
    const invalid = {
      ...right,
      fields:
        fault === 'width'
          ? right.fields.slice(1)
          : fault === 'type'
            ? right.fields.map((field) => ({ ...field, type: 'i64' as const }))
            : right.fields,
      sourceRef:
        fault === 'connection'
          ? {
              ...right.sourceRef,
              connectionRef: { ...right.sourceRef.connectionRef, connectionId: 'other' },
            }
          : right.sourceRef,
    };
    expect(() => createSourceSet({ inputs: [left, invalid], targetNodeId: 'model' })).toThrow();
  });
});
