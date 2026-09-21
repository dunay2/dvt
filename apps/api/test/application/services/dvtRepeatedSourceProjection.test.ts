import {
  DVT_POSTGRES_JOIN_PROFILE_ID,
  DvtTransformAuthoringAuthorityV1Schema,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectDvtPostgresTransform } from '../../../src/application/services/dvtPostgresTransformProjection.js';
import { resolveDvtTerminalTransformClosure } from '../../../src/application/services/resolveDvtTerminalTransformClosure.js';
import { repeatedSourceInput } from '../../fixtures/dvtRepeatedSourceFixture.js';
import { publisherHarness } from '../../fixtures/dvtRepeatedSourcePublisher.js';

describe('protected repeated-source projection', () => {
  it('publishes one canonical self-JOIN with one physical dependency', async () => {
    const input = repeatedSourceInput();
    const before = globalThis.structuredClone(input);
    const { publisher, publish } = publisherHarness();
    const result = await publisher.publish(input);
    expect(result.profileId).toBe(DVT_POSTGRES_JOIN_PROFILE_ID);
    expect(publish).toHaveBeenCalledTimes(1);
    const sql = Buffer.from(publish.mock.calls[0]![0].bytes).toString('utf8');
    expect(sql).toContain('LEFT JOIN raw.records AS right_source');
    expect(sql).toContain('left_source.parent_id = right_source.id');
    expect(input).toEqual(before);
  });

  it('previews the selected JOIN without discarding its second logical use', async () => {
    const closure = resolveDvtTerminalTransformClosure(repeatedSourceInput());
    const relations = closure.authority.semanticDocument.sidecar.relations;
    const projected = await projectDvtPostgresTransform(
      closure,
      undefined,
      relations[2]!.relationId
    );
    expect(projected.outputs.map((f) => f.name)).toEqual([
      'id',
      'parent_id',
      'related_id',
      'related_parent_id',
    ]);
    expect(projected.sql).toContain('raw.records AS right_source');
  });

  it.each([
    'foreign use',
    'ambiguous dependency',
    'unused dependency',
    'wrong physical table',
    'missing edge',
  ])('rejects %s before publishing any SQL', async (corruption) => {
    const input = repeatedSourceInput();
    const source = input.draft.nodes[0]!;
    const transform = input.draft.nodes[1]!;
    if (corruption === 'foreign use') {
      const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
        transform.metadata!.transformAuthoring
      );
      authority.semanticDocument.sidecar.relations[1]!.sourceRef!.sourceObjectId = 'foreign';
      transform.metadata!.transformAuthoring = authority;
    }
    if (corruption === 'wrong physical table') source.metadata!.tableName = 'another_table';
    if (corruption === 'missing edge') input.draft.edges.length = 0;
    if (corruption === 'ambiguous dependency' || corruption === 'unused dependency') {
      const extra = globalThis.structuredClone(source);
      extra.id = 'extra-source';
      if (corruption === 'unused dependency') {
        extra.metadata!.connectedSourceRef = {
          ...(input.draft.nodes[0]!.metadata!.connectedSourceRef as object),
          sourceObjectId: 'unused',
        };
      }
      input.draft.nodes.push(extra);
      input.draft.nodeIds.push(extra.id);
      input.draft.nodePositions[extra.id] = { x: 0, y: 100 };
      input.draft.edges.push({
        id: 'extra-edge',
        sourceId: extra.id,
        targetId: transform.id,
        relation: 'lineage',
      });
    }
    const adjusted = {
      ...input,
      selectedNodeIds: input.draft.nodeIds,
      selectedEdgeIds: input.draft.edges.map((e) => e.id),
    };
    const { publisher, publish } = publisherHarness();
    await expect(publisher.publish(adjusted)).rejects.toThrow(
      corruption === 'wrong physical table'
        ? 'PostgreSQL inputs do not match the protected terminal closure.'
        : corruption === 'missing edge'
          ? 'Expected unique selected edge identities.'
          : 'Transform semantic sources must exactly match the selected connected Sources on one PostgreSQL connection.'
    );
    expect(publish).not.toHaveBeenCalled();
  });
});
