import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { inspectDvtSubstraitMixedCrossDraft } from '@dvt/postgres-projection';
import { describe, expect, it } from 'vitest';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createDvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import {
  appendDvtSubstraitCrossInput,
  createDvtSubstraitMixedCrossDraft,
} from './canvasDvtSubstraitCrossComposition';

function input(table: string): CanvasDvtCompositionInput {
  return {
    nodeId: table,
    schema: 'public',
    table,
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        provider: 'postgres',
        connectionId: 'warehouse',
      },
      sourceObjectId: `public.${table}`,
    },
    fields: [{ name: 'id', dataType: 'string', joinDataType: 'string', nullable: false }],
  };
}

describe('Substrait mixed CROSS authoring', () => {
  it.each(['direct', 'append'] as const)(
    'preserves the canonical LEFT JOIN when adding a CROSS input through %s authoring',
    (path) => {
      const customers = input('customers');
      const orders = input('orders');
      const countries = input('countries');
      const leftJoin = createDvtSubstraitJoinDraft({
        left: customers,
        right: orders,
        targetNodeId: 'model',
        joinType: JoinRel_JoinType.LEFT,
      });

      const mixed =
        path === 'direct'
          ? createDvtSubstraitMixedCrossDraft(leftJoin, countries)
          : appendDvtSubstraitCrossInput(leftJoin, [customers, orders, countries]);
      const inspection = inspectDvtSubstraitMixedCrossDraft(mixed);

      expect(inspection.ok).toBe(true);
      if (!inspection.ok) return;
      expect(inspection.projection.leftJoin.joinRelations.at(-1)?.joinType).toBe(
        JoinRel_JoinType.LEFT
      );
      expect(inspection.projection.projection.inputs.map(({ table }) => table)).toEqual([
        'customers',
        'orders',
        'countries',
      ]);
    }
  );
});
