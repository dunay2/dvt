import {
  ExtensionLeafRelSchema,
  RelSchema,
  SortField_SortDirection,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';
import { createDvtSubstraitPilotDraft } from './canvasDvtSubstraitPilot';
import {
  applyDvtSubstraitFetch,
  applyDvtSubstraitSort,
  resolveDvtSubstraitSortFetchInputFields,
} from './canvasDvtSubstraitSortFetch';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { resolveDvtTransformAuthoringMetadata } from './canvasDvtTransformAuthoring';
import { transformNode } from './CanvasRelationalTreeWorkbench.test-support';

describe('unsupported wrapped relation authoring', () => {
  it.each(['sort', 'fetch'] as const)(
    'rejects %s over ExtensionLeaf without an uncaught selection error',
    (operation) => {
      const draft = createDvtSubstraitPilotDraft({
        sourceNodeId: 'source',
        targetNodeId: 'transform',
      });
      const root = draft.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
        throw new Error('Expected pilot project');
      const common = root.value.input.relType.value.common!;
      const binding = draft.sidecar.relations.find(
        (relation) => relation.relAnchor === common.relAnchor
      )!;
      root.value.input = create(RelSchema, {
        relType: { case: 'extensionLeaf', value: create(ExtensionLeafRelSchema, { common }) },
      });
      const leaf = {
        plan: draft.plan,
        sidecar: {
          ...draft.sidecar,
          semanticPlanSha256: '0'.repeat(64),
          relations: [binding],
          fields: draft.sidecar.fields
            .filter((field) => field.relationId === binding.relationId)
            .map(({ sourceFieldId: _sourceFieldId, ...field }) => field),
        },
      };
      const fields = resolveDvtSubstraitSortFetchInputFields(leaf);
      const wrapped =
        operation === 'fetch'
          ? applyDvtSubstraitFetch(leaf, { count: 20n })
          : applyDvtSubstraitSort(leaf, [
              { fieldId: fields[0]!.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST },
            ]);
      const node = applyDvtSubstraitSemanticDocument(
        transformNode(),
        encodeDvtSubstraitSemanticDocument(wrapped)
      );
      expect(resolveDvtTransformAuthoringMetadata(node)).toEqual({
        outcome: 'rejected',
        reason: 'unsupported_shape',
      });
    }
  );
});
