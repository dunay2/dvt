/** A save acknowledgement is not a new semantic revision; real changes still invalidate edits. */
import { describe, expect, it } from 'vitest';
import { graphJoin } from './canvasRelationGraph.test-support';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';

describe('canonical document acknowledgements', () => {
  it('retains in-flight analysis and an open edit across an identical wire roundtrip', async () => {
    const { document, session } = graphJoin();
    try {
      const wire = encodeDvtSubstraitSemanticDocument(document);
      session.receive(decodeDvtSubstraitSemanticDocument(wire));
      const revision = session.revision;
      const fields = await session.query(null);
      const work = session.work;
      const pending = session.query(null);
      session.receive(decodeDvtSubstraitSemanticDocument(wire));
      await expect(pending).resolves.toEqual(fields);
      expect(session.revision).toBe(revision);
      expect(session.work).toEqual(work);
      await changeSelectedRelationOutputs(session, {
        relationId: session.rootId,
        expectedRevision: revision,
        outputs: [{ slot: 1 }],
      });
      expect((await session.query(null)).fields).toHaveLength(1);
    } finally {
      session.dispose();
    }
  });

  it.each(['plan', 'sidecar'] as const)('invalidates open edits when the %s really changes', (change) => {
    const { document, session } = graphJoin();
    try {
      const revision = session.revision;
      const next = decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(document));
      if (change === 'sidecar') next.sidecar.relations[0]!.displayName = 'Renamed instance';
      else next.plan.version!.producer = 'Another producer';
      session.receive(decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(next)));
      expect(() => session.locate(session.rootId, revision)).toThrow();
      expect(session.revision).toBeGreaterThan(revision);
    } finally {
      session.dispose();
    }
  });
});
