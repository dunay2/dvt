import { sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import {
  GraphDbtWorkspaceArtifactPublicationResultSchema,
  PublishGraphDbtWorkspaceArtifactsRequestSchema,
  type PublishGraphDbtWorkspaceArtifactsRequest,
} from '../src/index.js';

const SQL_PAYLOAD = 'select 1\n';
const MANAGED_SQL = `-- dvt:graph-draft-content-sha256=${sha256HexUtf8(SQL_PAYLOAD)}\n${SQL_PAYLOAD}`;

function request(): PublishGraphDbtWorkspaceArtifactsRequest {
  return {
    canvasId: 'orders-canvas',
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

  it('accepts a complete no-op publication and its empty applied receipt', () => {
    const unchangedRequest = {
      ...request(),
      artifacts: request().artifacts.map((artifact) => ({
        ...artifact,
        writeRequired: false,
      })),
    };

    expect(PublishGraphDbtWorkspaceArtifactsRequestSchema.parse(unchangedRequest)).toEqual(
      unchangedRequest
    );
    expect(
      GraphDbtWorkspaceArtifactPublicationResultSchema.parse({
        schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
        kind: 'applied',
        idempotencyKey: unchangedRequest.idempotencyKey,
        requestHash: 'd'.repeat(64),
        deduplicated: false,
        writes: [],
      })
    ).toMatchObject({ kind: 'applied', writes: [] });
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

  it('rejects graph-draft SQL when the divergence marker does not match its payload', () => {
    const malformed = request();
    malformed.artifacts[1] = {
      ...malformed.artifacts[1]!,
      content: `-- dvt:graph-draft-content-sha256=${'a'.repeat(64)}\n${SQL_PAYLOAD}`,
    };

    expect(() => PublishGraphDbtWorkspaceArtifactsRequestSchema.parse(malformed)).toThrow(
      /divergence marker must match/i
    );
  });

  it('accepts immutable applied, conflict, and authority-refused results', () => {
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

    expect(
      GraphDbtWorkspaceArtifactPublicationResultSchema.parse({
        schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
        kind: 'authority_refused',
        canvasId: 'orders-canvas',
        reason: 'dbt_project_files_authority',
      })
    ).toEqual({
      schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
      kind: 'authority_refused',
      canvasId: 'orders-canvas',
      reason: 'dbt_project_files_authority',
    });
  });

  it('requires explicit Canvas identity for the server-side authority decision', () => {
    const { canvasId: _canvasId, ...missingCanvasIdentity } = request();

    expect(() =>
      PublishGraphDbtWorkspaceArtifactsRequestSchema.parse(missingCanvasIdentity)
    ).toThrow();
  });
});
