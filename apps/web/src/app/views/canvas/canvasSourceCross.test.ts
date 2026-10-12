import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { source } from './canvasRelationalOperator.test-support';
import { createSourceCross } from './canvasSourceCross';

describe('typed source CROSS', () => {
  it('creates independent occurrences and preserves mixed types across three inputs', async () => {
    const input = {
      ...source('shared'),
      fields: [
        { name: 'id', dataType: 'i64', joinDataType: 'i64' as const, nullable: false },
        { name: 'active', dataType: 'bool', joinDataType: 'bool' as const, nullable: true },
      ],
    };
    const document = createSourceCross([input, input, input]);
    const session = new CanvasRelationAnalysisSession('cross');
    session.receive(document);
    const output = await session.query(session.rootId);
    expect(output.fields.map((field) => field.type.kind.case)).toEqual([
      'i64',
      'bool',
      'i64',
      'bool',
      'i64',
      'bool',
    ]);
    expect(new Set(output.bindings.map((field) => field.displayName)).size).toBe(6);
    const sources = session.matchingSources(input.sourceRef, session.revision);
    expect(sources).toHaveLength(3);
    const physicalFields = await Promise.all(sources.map((id) => session.query(id)));
    expect(
      new Set(physicalFields.flatMap((entry) => entry.bindings.map((field) => field.fieldId))).size
    ).toBe(6);
    expect(deriveSubstraitSchemas(document).schemas.get(session.rootId)).toEqual(output.fields);
  });
});
