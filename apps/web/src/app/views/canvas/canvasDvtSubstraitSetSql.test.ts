import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { describe, expect, it } from 'vitest';
import { createSourceSet } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { applySelectedRelationWindow } from './canvasSelectedRelationWindow';

describe('canonical SET SQL projection', () => {
  it.each(['union_all', 'union_distinct'] as const)(
    'projects %s after output selection, grouping and window authoring',
    async (operation) => {
      const session = new CanvasRelationAnalysisSession('set-sql');
      session.receive(
        createSourceSet({
          targetNodeId: 'model',
          operation,
          inputs: ['north', 'south', 'west'].map((name) => ({
            ...source(name),
            fields: [
              { name: 'id', type: 'string' as const },
              { name: 'country', type: 'string' as const },
            ],
          })),
        })
      );
      const selected = await changeSelectedRelationOutputs(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        outputs: [{ slot: 1, alias: 'region' }, { slot: 0 }],
      });
      const projected = await projectSubstraitToPostgresSql(selected);
      expect(projected.projection.outputs.map((field) => field.name)).toEqual(['region', 'id']);
      const group = await session.query(session.rootId);
      await applySelectedRelationAggregate(session, {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: session.revision,
        fieldId: group.bindings[0]!.fieldId,
        alias: 'count',
      });
      const aggregate = await session.query(session.rootId);
      const window = await applySelectedRelationWindow(session, {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: session.revision,
        fieldId: aggregate.bindings[0]!.fieldId,
        alias: 'rank',
      });
      const grouped = await projectSubstraitToPostgresSql(window);
      expect(grouped.projection.outputs.map((field) => field.name)).toEqual([
        'region',
        'count',
        'rank',
      ]);
    }
  );
});
