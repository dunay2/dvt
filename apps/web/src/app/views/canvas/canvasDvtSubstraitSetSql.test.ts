import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { describe, expect, it } from 'vitest';

import { projectDvtSubstraitUnionAllToPostgresSql } from './canvasDvtSubstraitPostgresProjection';
import {
  applyDvtSubstraitUnionAllFieldEdit,
  applyDvtSubstraitUnionAllGrouping,
  applyDvtSubstraitUnionAllGroupedRowNumber,
  createDvtSubstraitUnionAllDraft,
  createDvtSubstraitUnionDistinctDraft,
  inspectDvtSubstraitUnionAllDraft,
} from './canvasDvtSubstraitSetComposition';

describe('Canvas SET SQL uses the canonical projection', () => {
  it.each([createDvtSubstraitUnionAllDraft, createDvtSubstraitUnionDistinctDraft])(
    'projects edited fields and grouped results without a second SQL interpretation %#',
    async (createDraft) => {
      let draft = createDraft({
        targetNodeId: 'result',
        inputs: ['north', 'south', 'west'].map((region) => ({
          nodeId: region,
          schema: 'tenant-data',
          table: `customers-${region}`,
          fields: ['customer_id', 'name', 'country'].map((name) => ({
            name,
            type: 'string' as const,
          })),
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            sourceObjectId: region,
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'warehouse',
              provider: 'postgres',
            },
          },
        })),
      });
      draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
        kind: 'rename',
        fieldKey: 'country',
        outputName: 'region',
      });
      draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
        kind: 'set-selected',
        fieldKey: 'name',
        selected: false,
      });
      draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
        kind: 'move',
        fieldKey: 'country',
        direction: 'up',
      });
      const before = globalThis.structuredClone(draft);
      const projected = await projectSubstraitToPostgresSql(draft);
      expect(projected.projection.outputs.map((field) => field.name)).toEqual([
        'region',
        'customer_id',
      ]);
      expect(await projectDvtSubstraitUnionAllToPostgresSql(draft)).toBe(projected.sql);
      expect(draft).toEqual(before);

      const inspection = inspectDvtSubstraitUnionAllDraft(draft);
      if (!inspection.ok) throw new Error('Expected SET authoring output');
      draft = applyDvtSubstraitUnionAllGrouping(draft, {
        groupFieldId: inspection.projection.outputs[0]!.fieldId,
        countOutputName: 'count',
      });
      draft = applyDvtSubstraitUnionAllGroupedRowNumber(draft, { outputName: 'rank' });
      const grouped = await projectSubstraitToPostgresSql(draft);
      expect(grouped.projection.outputs.map((field) => field.name)).toEqual([
        'region',
        'count',
        'rank',
      ]);
      expect(await projectDvtSubstraitUnionAllToPostgresSql(draft)).toBe(grouped.sql);
    }
  );
});
