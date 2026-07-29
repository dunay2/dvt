import {
  GraphDbtWorkspaceArtifactPublicationResultSchema,
  PublishGraphDbtWorkspaceArtifactsRequestSchema,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

const MANAGED_SQL = `-- dvt:graph-draft-content-sha256=${'a'.repeat(64)}\nselect 1\n`;

function request() {
  return {
    artifacts: [
      {
        path: 'dbt_project.yml',
        content: 'name: analytics\n',
        language: 'yaml' as const,
        expectedRevision: { kind: 'absent' as const },
        writeRequired: true,
      },
      {
        path: 'models/orders.sql',
        content: MANAGED_SQL,
        language: 'sql' as const,
        expectedRevision: { kind: 'content_sha256' as const, value: 'b'.repeat(64) },
        writeRequired: true,
      },
      {
        path: 'models/schema.yml',
        content: 'version: 2\n',
        language: 'yaml' as const,
        expectedRevision: { kind: 'absent' as const },
        writeRequired: false,
      },
    ],
    idempotencyKey: 'graph-dbt:' + 'c'.repeat(64),
  };
}

describe('graph DBT workspace artifact publication contract', () => {
  it('accepts one complete, revision-bound graph project publication', () => {
    expect(PublishGraphDbtWorkspaceArtifactsRequestSchema.parse(request())).toEqual(request());
  });

  it('rejects generic workspace paths and incomplete project proposals', () => {
    expect(() =>
      PublishGraphDbtWorkspaceArtifactsRequestSchema.parse({
        ...request(),
        artifacts: [
          {
            ...request().artifacts[1],
            path: 'arbitrary/secrets.sql',
          },
        ],
      })
    ).toThrow();
  });

  it('accepts immutable applied and conflict results', () => {
    expect(
      GraphDbtWorkspaceArtifactPublicationResultSchema.parse({
        schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
        kind: 'applied',
        idempotencyKey: request().idempotencyKey,
        requestHash: 'd'.repeat(64),
        deduplicated: true,
        writes: [{ path: 'models/orders.sql', contentSha256: 'e'.repeat(64) }],
      })
    ).toMatchObject({ kind: 'applied', deduplicated: true });

    expect(
      GraphDbtWorkspaceArtifactPublicationResultSchema.parse({
        schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
        kind: 'conflict',
        conflicts: [{ path: 'models/orders.sql', currentContentSha256: null }],
      })
    ).toMatchObject({ kind: 'conflict' });
  });
});
