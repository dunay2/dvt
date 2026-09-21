import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DvtPostgresTargetProjectionPublisher } from '../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
import { projectDvtPostgresTransform } from '../../src/application/services/dvtPostgresTransformProjection.js';
import { resolveDvtTerminalTransformClosure } from '../../src/application/services/resolveDvtTerminalTransformClosure.js';
import {
  buildDvtRepeatedSourceDraft,
  repeatedSourceInput,
} from '../fixtures/dvtRepeatedSourceFixture.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeIfPostgres = databaseUrl === undefined ? describe.skip : describe;
const records = [
  ['A', null],
  ['B', 'A'],
  ['B', 'A'],
  ['C', 'B'],
  ['D', 'missing'],
  ['SELF', 'SELF'],
  [null, 'A'],
  ['NULL_ROW', null],
] as const;
const innerPairs = [
  [1, 0],
  [2, 0],
  [3, 1],
  [3, 2],
  [5, 5],
  [6, 0],
] as const;
const leftOnlyPairs = [
  [0, null],
  [4, null],
  [7, null],
] as const;
const rightOnlyPairs = [
  [null, 3],
  [null, 4],
  [null, 6],
  [null, 7],
] as const;

describeIfPostgres('protected repeated-source PostgreSQL result semantics', () => {
  const databaseName = `dvt_read_uses_${randomUUID().replaceAll('-', '')}`;
  let admin: Client;
  let client: Client;
  let created = false;

  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrl! });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    const isolated = new URL(databaseUrl!);
    isolated.pathname = `/${databaseName}`;
    client = new Client({ connectionString: isolated.toString() });
    await client.connect();
    await client.query('CREATE SCHEMA raw');
    await client.query('CREATE TABLE raw.records (id text, parent_id text)');
    for (const row of records)
      await client.query('INSERT INTO raw.records VALUES ($1, $2)', [...row]);
  });

  afterAll(async () => {
    await client?.end();
    if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    await admin?.end();
  });

  it.each([
    [JoinRel_JoinType.INNER, innerPairs],
    [JoinRel_JoinType.LEFT, [...innerPairs, ...leftOnlyPairs]],
    [JoinRel_JoinType.RIGHT, [...innerPairs, ...rightOnlyPairs]],
    [JoinRel_JoinType.OUTER, [...innerPairs, ...leftOnlyPairs, ...rightOnlyPairs]],
  ] as const)(
    'executes selector %i with exact duplicate and NULL behavior',
    async (type, pairs) => {
      const input = repeatedSourceInput(buildDvtRepeatedSourceDraft(type));
      let publishedSql = '';
      const publisher = new DvtPostgresTargetProjectionPublisher({
        artifactStore: {
          publish: async (request) => {
            publishedSql = Buffer.from(request.bytes).toString('utf8');
            return { ...request, disposition: 'created' };
          },
        },
        locateArtifact: ({ sha256 }) => `memory://read-uses/${sha256}`,
      });
      await publisher.publish(input);
      expect(publishedSql.length).toBeGreaterThan(0);
      const result = await client.query(publishedSql);
      const expected = pairs.map(([l, r]) => ({
        id: l == null ? null : records[l][0],
        parent_id: l == null ? null : records[l][1],
        related_id: r == null ? null : records[r][0],
        related_parent_id: r == null ? null : records[r][1],
      }));
      expect(result.rows.map((row) => JSON.stringify(row)).sort()).toEqual(
        expected.map((row) => JSON.stringify(row)).sort()
      );

      const closure = resolveDvtTerminalTransformClosure(input);
      const selected = await projectDvtPostgresTransform(
        closure,
        undefined,
        closure.authority.semanticDocument.sidecar.relations[2]!.relationId
      );
      const preview = await client.query(selected.sql);
      expect(preview.rows.map((row) => JSON.stringify(row)).sort()).toEqual(
        expected.map((row) => JSON.stringify(row)).sort()
      );
    }
  );

  it.each([
    [JoinRel_JoinType.LEFT_SEMI, [1, 2, 3, 5, 6], false],
    [JoinRel_JoinType.LEFT_ANTI, [0, 4, 7], false],
    [JoinRel_JoinType.RIGHT_SEMI, [0, 1, 2, 5], true],
    [JoinRel_JoinType.RIGHT_ANTI, [3, 4, 6, 7], true],
  ] as const)(
    'executes retained-side selector %i without deduplicating rows',
    async (type, indices, right) => {
      const closure = resolveDvtTerminalTransformClosure(
        repeatedSourceInput(buildDvtRepeatedSourceDraft(type))
      );
      const projected = await projectDvtPostgresTransform(closure);
      const result = await client.query(projected.sql);
      const expected = indices.map((index) =>
        right
          ? { related_id: records[index][0], related_parent_id: records[index][1] }
          : { id: records[index][0], parent_id: records[index][1] }
      );
      expect(result.rows.map((row) => JSON.stringify(row)).sort()).toEqual(
        expected.map((row) => JSON.stringify(row)).sort()
      );
    }
  );

  it('keeps real PostgreSQL results unchanged when the two Read occurrences have independent aliases', async () => {
    const input = repeatedSourceInput();
    const before = resolveDvtTerminalTransformClosure(input);
    const semanticDocument = globalThis.structuredClone(before.authority.semanticDocument);
    const reads = semanticDocument.sidecar.relations.filter(
      (relation) => relation.sourceRef != null
    );
    reads[0]!.displayName = 'Records in this role';
    reads[1]!.displayName = 'Related records in another role';
    const aliased = repeatedSourceInput({
      ...input.draft,
      nodes: input.draft.nodes.map((node) =>
        node.role !== 'transform'
          ? node
          : {
              ...node,
              metadata: {
                ...node.metadata,
                transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument },
              },
            }
      ),
    });
    const original = await projectDvtPostgresTransform(before);
    const after = resolveDvtTerminalTransformClosure(aliased);
    expect(
      after.authority.semanticDocument.sidecar.relations
        .filter((relation) => relation.sourceRef != null)
        .map((relation) => relation.displayName)
    ).toEqual(['Records in this role', 'Related records in another role']);
    const changed = await projectDvtPostgresTransform(after);
    expect(changed.sql).toBe(original.sql);
    const actual = await client.query(changed.sql);
    const expected = await client.query(original.sql);
    expect(actual.rows).toEqual(expected.rows);
    expect(actual.rows).toHaveLength(innerPairs.length + leftOnlyPairs.length);
  });
});
