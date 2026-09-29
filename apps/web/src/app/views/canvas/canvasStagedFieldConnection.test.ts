import { describe, expect, it } from 'vitest';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import { admitCanvasStagedConnection } from './canvasStagedConnectionAdmission';
import { readCanvasRelationalPublishedField } from './canvasRelationalFieldSelection';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';

describe('initial field-driven Transform connection', () => {
  it.each(['direct', 'expression'])(
    'selects only the dragged %s and preserves producer identity through reopen',
    async (kind) => {
      let document = connectedNamesProjectionDraft();
      const source = new CanvasRelationAnalysisSession('producer');
      source.receive(document);
      if (kind === 'expression')
        document = await applySelectedRelationDerivedOutput(source, {
          relationId: source.rootId,
          expectedRevision: source.revision,
          intent: 'edit',
          alias: 'greeting',
          formula: "CONCAT(UPPER(first_name), ' hola')",
        });
      const revision = source.revision;
      const published = await source.query(source.rootId);
      const field = published.bindings.at(-1)!;
      const operation: CanvasStagedOperation = {
        id: 'pending-operation:single',
        operation: 'field_transform',
        inputs: [source.rootId],
      };
      const configured = await configureCanvasStagedTransform(operation, document, field.fieldId);
      const reopened = new CanvasRelationAnalysisSession('reopened');
      reopened.receive(decodeCanvasStagedOperation(configured));
      expect(reopened.rootId).toBe(operation.id);
      expect(
        (await reopened.query(operation.id)).bindings.map((entry) => entry.displayName)
      ).toEqual([field.displayName]);
      expect((await reopened.query(source.rootId)).bindings).toEqual(published.bindings);
      expect(source.revision).toBe(revision);
      const sql = await projectSubstraitToPostgresSql(decodeCanvasStagedOperation(configured)!);
      expect(sql.projection.outputs.map((entry) => entry.name)).toEqual([field.displayName]);
      source.dispose();
      reopened.dispose();
    }
  );

  it('never falls back to all fields for an unknown field', async () => {
    const document = connectedNamesProjectionDraft();
    const source = new CanvasRelationAnalysisSession('source');
    source.receive(document);
    const operation: CanvasStagedOperation = {
      id: 'pending-operation:single',
      operation: 'field_transform',
      inputs: [source.rootId],
    };
    expect(await configureCanvasStagedTransform(operation, document, 'missing')).toBe(operation);
    source.dispose();
  });

  it('validates root, revision and publication before admitting the field', async () => {
    const source = new CanvasRelationAnalysisSession('source');
    const document = connectedNamesProjectionDraft();
    source.receive(document);
    const field = (await source.query(source.rootId)).bindings[0]!;
    const reference = {
      rootId: source.rootId,
      revision: source.revision,
      relationId: source.rootId,
      fieldId: field.fieldId,
    };
    expect(await readCanvasRelationalPublishedField(source, reference)).toEqual(field);
    for (const patch of [{ rootId: 'foreign' }, { revision: 99 }, { fieldId: 'absent' }]) {
      await expect(
        readCanvasRelationalPublishedField(source, { ...reference, ...patch })
      ).rejects.toThrow();
    }
    const schema = await source.query(source.rootId);
    source.receive(document, new Set(schema.fields[0]!.sourceFieldIds));
    expect(source.revision).toBe(reference.revision);
    await expect(readCanvasRelationalPublishedField(source, reference)).rejects.toThrow(
      'Field is not published'
    );
    source.dispose();
  });

  it('shares the relation connection policy including ordinal, occupied port, cycles and fan-out', () => {
    const target: CanvasStagedOperation = {
      id: 'target',
      operation: 'field_transform',
      inputs: [null],
    };
    const scope = { editable: true, producerIds: ['source', 'target'], consumedProducerIds: [] };
    expect(admitCanvasStagedConnection(scope, [target], 'target', 0, 'source')).toBe(target);
    expect(admitCanvasStagedConnection(scope, [target], 'target', 0, 'source', 'field')).toBe(
      target
    );
    for (const invalid of [
      { ...target, operation: 'filter' as const },
      { ...target, inputs: ['source'] },
    ]) {
      expect(
        admitCanvasStagedConnection(scope, [invalid], 'target', 0, 'source', 'field')
      ).toBeNull();
    }
    for (const port of [-1, 0.5, 1, Number.NaN]) {
      expect(admitCanvasStagedConnection(scope, [target], 'target', port, 'source')).toBeNull();
    }
    expect(
      admitCanvasStagedConnection({ ...scope, editable: false }, [target], 'target', 0, 'source')
    ).toBeNull();
    expect(
      admitCanvasStagedConnection(
        { ...scope, consumedProducerIds: ['source'] },
        [target],
        'target',
        0,
        'source'
      )
    ).toBeNull();
    expect(admitCanvasStagedConnection(scope, [target], 'absent', 0, 'source')).toBeNull();
    expect(admitCanvasStagedConnection(scope, [target], 'target', 0, 'foreign')).toBeNull();
    expect(admitCanvasStagedConnection(scope, [target], 'target', 0, 'target')).toBeNull();
    expect(
      admitCanvasStagedConnection(scope, [{ ...target, inputs: ['other'] }], 'target', 0, 'source')
    ).toBeNull();
    expect(
      admitCanvasStagedConnection(
        scope,
        [target, { ...target, id: 'other', inputs: ['source'] }],
        'target',
        0,
        'source'
      )
    ).toBeNull();
    expect(
      admitCanvasStagedConnection(
        scope,
        [target, { ...target, id: 'source', inputs: ['target'] }],
        'target',
        0,
        'source'
      )
    ).toBeNull();
  });
});
