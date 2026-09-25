import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { applySelectedRelationWindow } from './canvasSelectedRelationWindow';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { prepareRelationRemoval } from './canvasPrepareRelationRemoval';

describe('atomic selected relation retirement', () => {
  it.each(['left', 'right'] as const)(
    'keeps the chosen %s operand without publishing during preparation',
    async (keep) => {
      const { session, root, document } = selectedUnaryScenario();
      const retained = root.inputs[keep === 'left' ? 0 : 1]!;
      const before = await session.query(retained);
      const revision = session.revision;
      const proposal = await prepareRelationRemoval(session, {
        relationId: root.binding.relationId,
        expectedRevision: revision,
        keep,
      });
      expect(session.revision).toBe(revision);
      expect(session.rootId).toBe(root.binding.relationId);
      expect(proposal.operations).toEqual([]);
      const next = session.apply(proposal.change);
      expect(session.rootId).toBe(root.binding.relationId);
      expect(session.locate(session.rootId, session.revision).inputs).toEqual([retained]);
      expect((await session.query(retained)).fields).toEqual(before.fields);
      expect(next.sidecar.relations).toHaveLength(2);
      expect(document.sidecar.relations).toHaveLength(3);
      expect(deriveSubstraitSchemas(next).schemas.get(retained)).toEqual(before.fields);
    }
  );

  it('preserves a consumer when removing one of two transformed inputs', async () => {
    const { session, root } = selectedUnaryScenario();
    await applySelectedRelationSortFetch(session, {
      operation: 'fetch',
      relationId: root.binding.relationId,
      expectedRevision: session.revision,
      intent: 'insert',
      count: 20n,
      offset: 0n,
    });
    const fetchId = session.rootId;
    const proposal = await prepareRelationRemoval(session, {
      relationId: root.inputs[1]!,
      expectedRevision: session.revision,
    });
    expect(proposal.operations).toEqual([]);
    const next = session.apply(proposal.change);
    expect(session.rootId).toBe(fetchId);
    expect(session.locate(fetchId, session.revision).inputs).toEqual([root.binding.relationId]);
    expect(session.locate(root.binding.relationId, session.revision).inputs).toEqual([
      root.inputs[0],
    ]);
    const fields = (await session.query(fetchId)).fields;
    expect(fields.length).toBeGreaterThan(0);
    expect(deriveSubstraitSchemas(next).schemas.get(fetchId)).toEqual(fields);
  });

  it('requests consent for dependent WINDOW removal and commits both changes atomically', async () => {
    const { session } = selectedUnaryScenario();
    const input = await session.query(session.rootId);
    await applySelectedRelationAggregate(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'insert',
      fieldId: input.bindings[0]!.fieldId,
      alias: 'total',
    });
    const aggregateId = session.rootId;
    const aggregate = await session.query(aggregateId);
    const count = aggregate.bindings.find((field) => field.sourceFieldId == null)!;
    await applySelectedRelationWindow(session, {
      relationId: aggregateId,
      expectedRevision: session.revision,
      intent: 'insert',
      fieldId: count.fieldId,
      alias: 'rank',
    });
    const revision = session.revision;
    const proposal = await prepareRelationRemoval(session, {
      relationId: aggregateId,
      expectedRevision: revision,
    });
    expect(proposal.operations).toHaveLength(1);
    expect(session.revision).toBe(revision);
    const next = session.apply(proposal.change);
    expect(session.rootId).toBe(input.relationId);
    expect(session.revision).toBe(revision + 1);
    expect(deriveSubstraitSchemas(next).schemas.get(session.rootId)).toEqual(input.fields);
  });

  it('rejects stale confirmation and ambiguous branch removal', async () => {
    const { session, root } = selectedUnaryScenario();
    await expect(
      prepareRelationRemoval(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
      })
    ).rejects.toThrow();
    const proposal = await prepareRelationRemoval(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      keep: 'left',
    });
    await applySelectedRelationSortFetch(session, {
      operation: 'fetch',
      relationId: root.binding.relationId,
      expectedRevision: session.revision,
      intent: 'insert',
      count: 3n,
    });
    const current = session.rootId;
    expect(() => session.apply(proposal.change)).toThrow();
    expect(session.rootId).toBe(current);
  });
});
