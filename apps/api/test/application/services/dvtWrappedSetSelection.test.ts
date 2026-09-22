import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectDvtPostgresTransform } from '../../../src/application/services/dvtPostgresTransformProjection.js';
import { resolveDvtTerminalTransformClosure } from '../../../src/application/services/resolveDvtTerminalTransformClosure.js';
import { buildDvtSetPreviewDraft } from '../../fixtures/dvtSetPreviewFixture.js';
import { buildDvtSortFetchPreviewDraft } from '../../fixtures/dvtSortFetchFixture.js';

describe.each(['aggregate', 'window'] as const)('protected selected %s over Set', (wrapper) => {
  it.each([
    'union_distinct',
    'intersect_distinct',
    'except_distinct',
    'intersect_all',
    'except_all',
  ] as const)(
    'keeps %s semantics through full and selected Sort/Fetch projection',
    async (operation) => {
      const base = buildDvtSetPreviewDraft(wrapper, operation);
      const authority = base.nodes.find((node) => node.id === 'transform-customers')!.metadata![
        'transformAuthoring'
      ] as { semanticDocument: unknown };
      const document = DvtSubstraitSemanticDocumentV1Schema.parse(authority.semanticDocument);
      const root = decodeDvtSubstraitPlanV1(document).relations[0]!.relType;
      if (root.case !== 'root') throw new Error('Expected root');
      const relation = root.value.input!.relType;
      if (relation.case !== 'aggregate' && relation.case !== 'project')
        throw new Error('Expected wrapper');
      const wrapperId = document.sidecar.relations.find(
        (binding) => binding.relAnchor === relation.value.common!.relAnchor
      )!.relationId;
      const { draft, sortRelationId, fetchRelationId } = buildDvtSortFetchPreviewDraft(false, base);
      const closure = resolveDvtTerminalTransformClosure({
        draft,
        selectedNodeIds: draft.nodeIds,
        selectedEdgeIds: draft.edges.map((edge) => edge.id),
      });
      const expected = await projectDvtPostgresTransform(
        resolveDvtTerminalTransformClosure({
          draft: base,
          selectedNodeIds: base.nodeIds,
          selectedEdgeIds: base.edges.map((edge) => edge.id),
        })
      );
      expect((await projectDvtPostgresTransform(closure, undefined, wrapperId)).sql).toBe(
        expected.sql
      );
      const sorted = await projectDvtPostgresTransform(closure, undefined, sortRelationId);
      expect(sorted.sql).toMatch(/ORDER BY\s+customer_id\s+DESC\s+NULLS LAST/);
      expect(sorted.outputs).toEqual(expected.outputs);
      const model = await projectDvtPostgresTransform(closure);
      expect((await projectDvtPostgresTransform(closure, undefined, fetchRelationId)).sql).toBe(
        model.sql
      );
      expect(model.sql).toMatch(/LIMIT\s+3\s+OFFSET\s+2/);
      expect(model.outputs).toEqual(expected.outputs);
    }
  );
});
