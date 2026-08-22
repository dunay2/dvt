import { PublishGraphDbtWorkspaceArtifactsRequestSchema } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it, vi } from 'vitest';

import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type { FileContent, IWorkspaceFilesQueryPort } from '../../ports/workspace';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';
import { createGraphDraftMarkedDbtModelSql } from './dbtGraphModelSqlPublicationPolicy';
import { publishGraphDbtWorkspaceArtifacts } from './dbtGraphWorkspaceArtifactPublisher';

const FIRST_SQL = createGraphDraftMarkedDbtModelSql('select 1 as order_id\n');
const NEXT_SQL = createGraphDraftMarkedDbtModelSql('select 2 as order_id\n');
const CANVAS_ID = 'orders-canvas';

function file(path: string, content: string, revision: string): FileContent {
  return {
    path,
    name: path.split('/').at(-1) ?? path,
    language: path.endsWith('.sql') ? 'sql' : 'yaml',
    content,
    contentSha256: revision,
    lastModified: '2026-07-22T00:00:00.000Z',
  };
}

function applied(
  request: Parameters<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>[0]
): Awaited<ReturnType<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>> {
  return {
    schemaVersion: 'graph-dbt-workspace-artifact-publication.v1' as const,
    kind: 'applied' as const,
    idempotencyKey: request.idempotencyKey,
    requestHash: sha256HexUtf8(JSON.stringify(request)),
    deduplicated: false,
    writes: request.artifacts
      .filter((artifact) => artifact.writeRequired)
      .map((artifact) => ({
        path: artifact.path,
        contentSha256: sha256HexUtf8(artifact.content),
      })),
  };
}

describe('DBT graph workspace artifact publisher', () => {
  it('preflights every artifact and refuses divergent pre-marker SQL', async () => {
    const publish = vi.fn<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>();
    const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>(async (path) => {
      if (path === 'models/second.sql') {
        return file(path, 'select externally_edited from orders\n', 'b'.repeat(64));
      }
      throw new WorkspaceFileLoadError('not_found', path);
    });

    const result = await publishGraphDbtWorkspaceArtifacts({
      canvasId: CANVAS_ID,
      artifacts: [
        { path: 'dbt_project.yml', language: 'yaml', content: 'name: analytics\n' },
        { path: 'models/first.sql', language: 'sql', content: FIRST_SQL },
        { path: 'models/second.sql', language: 'sql', content: NEXT_SQL },
        { path: 'models/schema.yml', language: 'yaml', content: 'version: 2\n' },
      ],
      workspaceFilesQuery: { listFiles: vi.fn(), getFileContent },
      publicationCommand: { publish },
    });

    expect(result).toMatchObject({
      ok: false,
      kind: 'non_replaceable_conflict',
      conflictPath: 'models/second.sql',
      reason: 'unmarked',
    });
    expect(getFileContent).toHaveBeenCalledTimes(4);
    expect(publish).not.toHaveBeenCalled();
  });

  it('never offers replacement for a malformed managed marker', async () => {
    const publish = vi.fn<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>();
    const malformed = `${FIRST_SQL.slice(0, 55)}${'0'.repeat(64)}\nselect tampered\n`;

    const result = await publishGraphDbtWorkspaceArtifacts({
      canvasId: CANVAS_ID,
      artifacts: [{ path: 'models/orders.sql', language: 'sql', content: NEXT_SQL }],
      workspaceFilesQuery: {
        listFiles: vi.fn(),
        getFileContent: vi.fn(async (path) => file(path, malformed, 'c'.repeat(64))),
      },
      publicationCommand: { publish },
    });

    expect(result).toEqual({
      ok: false,
      kind: 'non_replaceable_conflict',
      conflictPath: 'models/orders.sql',
      reason: 'invalid_marker',
    });
    expect(publish).not.toHaveBeenCalled();
  });

  it('leaves every artifact unchanged when the protected atomic command fails', async () => {
    const originalYaml = 'name: existing_analytics\n';
    const originalSql = FIRST_SQL;
    const originalSchema = 'version: 2\n';
    const persisted = new Map<string, string>([
      ['dbt_project.yml', originalYaml],
      ['models/orders.sql', originalSql],
      ['models/schema.yml', originalSchema],
    ]);
    const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>(async (path) => {
      const content = persisted.get(path);
      if (content == null) {
        throw new WorkspaceFileLoadError('not_found', path);
      }
      return file(path, content, sha256HexUtf8(content));
    });
    const publish = vi.fn<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>(async () => {
      throw new Error('simulated second-artifact publication failure');
    });

    await expect(
      publishGraphDbtWorkspaceArtifacts({
        canvasId: CANVAS_ID,
        artifacts: [
          { path: 'dbt_project.yml', language: 'yaml', content: 'name: analytics\n' },
          { path: 'models/orders.sql', language: 'sql', content: NEXT_SQL },
          { path: 'models/schema.yml', language: 'yaml', content: 'version: 2\nmodels: []\n' },
        ],
        workspaceFilesQuery: { listFiles: vi.fn(), getFileContent },
        publicationCommand: { publish },
      })
    ).rejects.toThrow('simulated second-artifact publication failure');

    expect(publish).toHaveBeenCalledTimes(1);
    expect(persisted.get('dbt_project.yml')).toBe(originalYaml);
    expect(persisted.get('models/orders.sql')).toBe(originalSql);
    expect(persisted.get('models/schema.yml')).toBe(originalSchema);
  });

  it('binds every observed revision and changed artifact into one publication command', async () => {
    const publish = vi.fn<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>(
      async (request) => applied(request)
    );
    const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>(async (path) => {
      if (path === 'dbt_project.yml') {
        return file(path, 'name: analytics\n', 'd'.repeat(64));
      }
      if (path === 'models/schema.yml') {
        return file(path, 'version: 2\n', 'e'.repeat(64));
      }
      return file(path, FIRST_SQL, 'a'.repeat(64));
    });

    const result = await publishGraphDbtWorkspaceArtifacts({
      canvasId: CANVAS_ID,
      artifacts: [
        { path: 'dbt_project.yml', language: 'yaml', content: 'name: analytics\n' },
        { path: 'models/orders.sql', language: 'sql', content: NEXT_SQL },
        { path: 'models/schema.yml', language: 'yaml', content: 'version: 2\nmodels: []\n' },
      ],
      workspaceFilesQuery: { listFiles: vi.fn(), getFileContent },
      publicationCommand: { publish },
    });

    expect(result).toEqual({
      ok: true,
      writtenArtifactPaths: ['models/orders.sql', 'models/schema.yml'],
    });
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith({
      canvasId: CANVAS_ID,
      artifacts: [
        {
          path: 'dbt_project.yml',
          language: 'yaml',
          content: 'name: analytics\n',
          expectedRevision: { kind: 'content_sha256', value: 'd'.repeat(64) },
          writeRequired: false,
        },
        {
          path: 'models/orders.sql',
          language: 'sql',
          content: NEXT_SQL,
          expectedRevision: { kind: 'content_sha256', value: 'a'.repeat(64) },
          writeRequired: true,
        },
        {
          path: 'models/schema.yml',
          language: 'yaml',
          content: 'version: 2\nmodels: []\n',
          expectedRevision: { kind: 'content_sha256', value: 'e'.repeat(64) },
          writeRequired: true,
        },
      ],
      idempotencyKey: expect.stringMatching(/^graph-dbt:[a-f0-9]{64}$/u),
    });
  });

  it('publishes absent artifacts with absent revision preconditions', async () => {
    const publish = vi.fn<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>(
      async (request) => applied(request)
    );

    const result = await publishGraphDbtWorkspaceArtifacts({
      canvasId: CANVAS_ID,
      artifacts: [
        { path: 'dbt_project.yml', language: 'yaml', content: 'name: analytics\n' },
        { path: 'models/orders.sql', language: 'sql', content: FIRST_SQL },
        { path: 'models/schema.yml', language: 'yaml', content: 'version: 2\n' },
      ],
      workspaceFilesQuery: {
        listFiles: vi.fn(),
        getFileContent: vi.fn(async (path) => {
          throw new WorkspaceFileLoadError('not_found', path);
        }),
      },
      publicationCommand: { publish },
    });

    expect(result).toEqual({
      ok: true,
      writtenArtifactPaths: ['dbt_project.yml', 'models/orders.sql', 'models/schema.yml'],
    });
    expect(publish).toHaveBeenCalledTimes(1);
    const request = publish.mock.calls[0]![0];
    expect(request.artifacts.every((artifact) => artifact.expectedRevision.kind === 'absent')).toBe(
      true
    );
    expect(request.artifacts.every((artifact) => artifact.writeRequired)).toBe(true);
  });

  it('projects a server authority refusal without treating it as a file conflict', async () => {
    const publish = vi.fn<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>(
      async () => ({
        schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
        kind: 'authority_refused',
        canvasId: CANVAS_ID,
        reason: 'mixed_authority',
      })
    );

    const result = await publishGraphDbtWorkspaceArtifacts({
      canvasId: CANVAS_ID,
      artifacts: [
        { path: 'dbt_project.yml', language: 'yaml', content: 'name: analytics\n' },
        { path: 'models/orders.sql', language: 'sql', content: FIRST_SQL },
        { path: 'models/schema.yml', language: 'yaml', content: 'version: 2\n' },
      ],
      workspaceFilesQuery: {
        listFiles: vi.fn(),
        getFileContent: vi.fn(async (path) => {
          throw new WorkspaceFileLoadError('not_found', path);
        }),
      },
      publicationCommand: { publish },
    });

    expect(result).toEqual({
      ok: false,
      kind: 'authority_refused',
      reason: 'mixed_authority',
    });
  });

  it('still asks the server to authorize an unchanged artifact set', async () => {
    const publish = vi.fn<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>(
      async (request) => {
        PublishGraphDbtWorkspaceArtifactsRequestSchema.parse(request);
        return {
          schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
          kind: 'authority_refused',
          canvasId: CANVAS_ID,
          reason: 'mixed_authority',
        };
      }
    );
    const unchangedProject = 'name: analytics\n';
    const unchangedSchema = 'version: 2\n';

    const result = await publishGraphDbtWorkspaceArtifacts({
      canvasId: CANVAS_ID,
      artifacts: [
        { path: 'dbt_project.yml', language: 'yaml', content: unchangedProject },
        { path: 'models/orders.sql', language: 'sql', content: FIRST_SQL },
        { path: 'models/schema.yml', language: 'yaml', content: unchangedSchema },
      ],
      workspaceFilesQuery: {
        listFiles: vi.fn(),
        getFileContent: vi.fn(async (path) => {
          const content =
            path === 'dbt_project.yml'
              ? unchangedProject
              : path === 'models/schema.yml'
                ? unchangedSchema
                : FIRST_SQL;
          return file(path, content, sha256HexUtf8(content));
        }),
      },
      publicationCommand: { publish },
    });

    expect(result).toEqual({
      ok: false,
      kind: 'authority_refused',
      reason: 'mixed_authority',
    });
    expect(publish).toHaveBeenCalledWith({
      canvasId: CANVAS_ID,
      artifacts: [
        expect.objectContaining({
          path: 'dbt_project.yml',
          writeRequired: false,
        }),
        expect.objectContaining({
          path: 'models/orders.sql',
          writeRequired: false,
        }),
        expect.objectContaining({
          path: 'models/schema.yml',
          writeRequired: false,
        }),
      ],
      idempotencyKey: expect.stringMatching(/^graph-dbt:[a-f0-9]{64}$/u),
    });
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('preserves a server revision conflict as a concurrent-edit outcome', async () => {
    const result = await publishGraphDbtWorkspaceArtifacts({
      canvasId: CANVAS_ID,
      artifacts: [
        { path: 'dbt_project.yml', language: 'yaml', content: 'name: analytics\n' },
        { path: 'models/orders.sql', language: 'sql', content: FIRST_SQL },
        { path: 'models/schema.yml', language: 'yaml', content: 'version: 2\n' },
      ],
      workspaceFilesQuery: {
        listFiles: vi.fn(),
        getFileContent: vi.fn(async (path) => {
          throw new WorkspaceFileLoadError('not_found', path);
        }),
      },
      publicationCommand: {
        publish: vi.fn<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>(async () => ({
          schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
          kind: 'conflict',
          conflicts: [
            {
              path: 'models/orders.sql',
              currentContentSha256: 'f'.repeat(64),
            },
          ],
        })),
      },
    });

    expect(result).toEqual({
      ok: false,
      kind: 'non_replaceable_conflict',
      conflictPath: 'models/orders.sql',
      reason: 'revision_conflict',
    });
  });
});
