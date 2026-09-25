/** Physical canvas IDs follow occurrence identity, not sidecar serialization order. */
import { describe, expect, it } from 'vitest';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { createSourceSet } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';
import { retainedSourceInputIds } from './useCanvasRelationalTreeRemoval';
import { prepareRelationRemoval } from './canvasPrepareRelationRemoval';

describe('retained source occurrence slots', () => {
  it.each(['left', 'right'] as const)(
    'retains %s identity with shuffled bindings and repeated physical sources',
    async (keep) => {
      const document = createSourceSet({
        inputs: [source('employees'), source('employees')],
        targetNodeId: 'model',
      });
      const shuffled = {
        ...document,
        sidecar: { ...document.sidecar, relations: [...document.sidecar.relations].reverse() },
      };
      const session = new CanvasRelationAnalysisSession('model');
      session.receive(shuffled);
      const proposal = await prepareRelationRemoval(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        keep,
      });
      const next = session.apply(proposal.change);
      expect(retainedSourceInputIds(shuffled, next, ['employees', 'employees'])).toEqual([
        'employees',
      ]);
      expect(
        next.sidecar.relations
          .filter((binding) => binding.sourceRef != null)
          .map((binding) => binding.relationId)
      ).toEqual([document.sidecar.relations[keep === 'left' ? 0 : 1]!.relationId]);
      expect(() => retainedSourceInputIds(shuffled, next, ['employees'])).toThrow();
      session.dispose();
    }
  );
});
