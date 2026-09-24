/** Canonical authoring persistence is independent of the input relation family. */
import { describe, expect, it } from 'vitest';
import {
  JoinRel_JoinType,
  SortField_SortDirection,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { createDvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { createDvtSubstraitSetDraft } from './canvasDvtSubstraitSetComposition';
import { createDvtSubstraitPilotDraft } from './canvasDvtSubstraitPilot';
import { source } from './canvasRelationalOperator.test-support';
import { transformNode } from './CanvasRelationalTreeWorkbench.test-support';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { resolveDvtTransformAuthoringMetadata } from './canvasDvtTransformAuthoring';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';
import { resolveCanvasRelationalOperatorTools } from './canvasRelationalTreeOperatorModel';
import { applyCanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorCommands';

const joinTypes = [
  JoinRel_JoinType.INNER,
  JoinRel_JoinType.LEFT,
  JoinRel_JoinType.RIGHT,
  JoinRel_JoinType.OUTER,
  JoinRel_JoinType.LEFT_SEMI,
  JoinRel_JoinType.LEFT_ANTI,
  JoinRel_JoinType.RIGHT_SEMI,
  JoinRel_JoinType.RIGHT_ANTI,
] as const;
const scenarios = [
  {
    operation: 'projection' as const,
    create: () => createDvtSubstraitPilotDraft({ sourceNodeId: 'records', targetNodeId: 'model' }),
  },
  ...joinTypes.map((joinType) => ({
    operation: canvasJoinOperationForType(joinType)!,
    create: () =>
      createDvtSubstraitJoinDraft({
        left: source('left'),
        right: source('right'),
        targetNodeId: 'model',
        joinType,
      }),
  })),
  ...(
    ['union_all', 'intersect_distinct', 'except_distinct', 'intersect_all', 'except_all'] as const
  ).map((operation) => ({
    operation,
    create: () =>
      createDvtSubstraitSetDraft({
        inputs: [source('north'), source('south')],
        targetNodeId: 'model',
        operation,
      }),
  })),
];

describe('selected unary persistence', () => {
  it.each(scenarios)(
    'retains $operation semantics, grouping, windows and identities on Apply and reopen',
    async ({ operation, create }) => {
      if (operation === 'unsupported') throw new Error('Fixture uses an unsupported JOIN');
      const original = create();
      let document = original;
      if (operation !== 'projection') {
        const group = resolveCanvasRelationalOperatorTools(document).find(
          (tool) => tool.id === 'aggregate'
        )!;
        expect(group.enabled).toBe(true);
        document = applyCanvasRelationalOperatorTool(document, {
          tool: 'aggregate',
          fieldId: group.fields[0]!.fieldId,
          alias: 'total',
        });
        document = applyCanvasRelationalOperatorTool(document, {
          tool: 'window',
          alias: 'position',
        });
      }
      const session = new CanvasRelationAnalysisSession('model');
      session.receive(document);
      const schema = await session.query(session.rootId);
      await applySelectedRelationSortFetch(session, {
        intent: 'insert',
        operation: 'sort',
        relationId: session.rootId,
        expectedRevision: session.revision,
        keys: [
          {
            fieldId: schema.bindings[0]!.fieldId,
            direction: SortField_SortDirection.ASC_NULLS_LAST,
          },
        ],
      });
      const sortedId = session.rootId;
      const fetched = await applySelectedRelationSortFetch(session, {
        intent: 'insert',
        operation: 'fetch',
        relationId: sortedId,
        expectedRevision: session.revision,
        offset: 2n,
        count: 3n,
      });
      const node = transformNode();
      const saved = applyCanvasInspectorNodeDraft(
        node,
        createCanvasRelationalTreeNodeDraft(node, operation, fetched)
      );
      const reopened = resolveDvtTransformAuthoringMetadata(saved);
      if (reopened.outcome !== 'resolved' || reopened.metadata.mode === 'uninitialized')
        throw new Error('Canonical document did not reopen');
      expect(reopened.metadata.plan).toEqual(fetched.plan);
      expect(reopened.metadata.sidecar).toEqual(fetched.sidecar);
      const reloaded = new CanvasRelationAnalysisSession('model');
      reloaded.receive(reopened.metadata);
      expect((await reloaded.query(reloaded.rootId)).fields).toEqual(schema.fields);
      for (const binding of document.sidecar.relations) {
        expect(reloaded.locate(binding.relationId, reloaded.revision).binding).toEqual(binding);
      }
      expect(reloaded.locate(reloaded.rootId, reloaded.revision).inputs).toEqual([sortedId]);
      session.dispose();
      reloaded.dispose();
    }
  );
});
