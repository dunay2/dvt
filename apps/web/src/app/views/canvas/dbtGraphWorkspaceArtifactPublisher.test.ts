import { describe, expect, it, vi } from 'vitest';

import type {
  FileContent,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';
import { createGraphManagedDbtModelSql } from './dbtGraphModelSqlPublicationPolicy';
import { publishGraphDbtWorkspaceArtifacts } from './dbtGraphWorkspaceArtifactPublisher';

const FIRST_SQL = createGraphManagedDbtModelSql('select 1 as order_id\n');
const NEXT_SQL = createGraphManagedDbtModelSql('select 2 as order_id\n');

function file(path: string, content: string, revision: string): FileContent {
  return {
    path,
    name: path.split('/').at(-1) ?? path,
    language: path.endsWith('.sql') ? 'sql' : 'yaml',
    content,
    contentSha256: revision,
    lastModified: '2026-07-22T00:00:00.000Z',
  } as const;
}

describe('DBT graph workspace artifact publisher', () => {
  it('preflights every artifact and writes nothing when a later model SQL file diverges', async () => {
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
    const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>(async (path) => {
      if (path === 'models/second.sql') {
        return file(path, 'select externally_edited from orders\n', 'b'.repeat(64));
      }
      throw new WorkspaceFileLoadError('not_found', path);
    });

    const result = await publishGraphDbtWorkspaceArtifacts({
      artifacts: [
        { path: 'dbt_project.yml', language: 'yaml', content: 'name: analytics\n' },
        { path: 'models/first.sql', language: 'sql', content: FIRST_SQL },
        { path: 'models/second.sql', language: 'sql', content: NEXT_SQL },
      ],
      workspaceFilesQuery: { listFiles: vi.fn(), getFileContent },
      workspaceFileContentCommand: { saveFileContent },
    });

    expect(result).toEqual({ ok: false, conflictPath: 'models/second.sql' });
    expect(getFileContent).toHaveBeenCalledTimes(3);
    expect(saveFileContent).not.toHaveBeenCalled();
  });

  // Red phase: the current per-file loop mutates the first artifact before a later write fails.
  it('leaves every artifact unchanged when a later revision-guarded write fails', async () => {
    const originalYaml = 'name: existing_analytics\n';
    const originalSql = FIRST_SQL;
    const persisted = new Map<string, string>([
      ['dbt_project.yml', originalYaml],
      ['models/orders.sql', originalSql],
    ]);
    const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>(async (path) => {
      const content = persisted.get(path);
      if (content == null) {
        throw new WorkspaceFileLoadError('not_found', path);
      }
      return file(path, content, path.endsWith('.sql') ? 'a'.repeat(64) : 'd'.repeat(64));
    });
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>(
      async (input) => {
        if (input.path === 'models/orders.sql') {
          throw new Error('simulated second-artifact revision conflict');
        }
        persisted.set(input.path, input.content);
        return {
          kind: 'saved',
          disposition: 'updated',
          path: input.path,
          contentSha256: 'f'.repeat(64),
          lastModified: '2026-07-22T00:00:01.000Z',
        };
      }
    );

    await expect(
      publishGraphDbtWorkspaceArtifacts({
        artifacts: [
          { path: 'dbt_project.yml', language: 'yaml', content: 'name: analytics\n' },
          { path: 'models/orders.sql', language: 'sql', content: NEXT_SQL },
        ],
        workspaceFilesQuery: { listFiles: vi.fn(), getFileContent },
        workspaceFileContentCommand: { saveFileContent },
      })
    ).rejects.toThrow('simulated second-artifact revision conflict');

    expect(persisted.get('dbt_project.yml')).toBe(originalYaml);
    expect(persisted.get('models/orders.sql')).toBe(originalSql);
  });

  it('uses preflight revisions and skips byte-identical artifacts', async () => {
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>(
      async (input) => ({
        kind: 'saved',
        disposition: 'updated',
        path: input.path,
        contentSha256: 'c'.repeat(64),
        lastModified: '2026-07-22T00:00:01.000Z',
      })
    );
    const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>(async (path) =>
      path.endsWith('.sql')
        ? file(path, FIRST_SQL, 'a'.repeat(64))
        : file(path, 'name: analytics\n', 'd'.repeat(64))
    );

    const result = await publishGraphDbtWorkspaceArtifacts({
      artifacts: [
        { path: 'dbt_project.yml', language: 'yaml', content: 'name: analytics\n' },
        { path: 'models/orders.sql', language: 'sql', content: NEXT_SQL },
      ],
      workspaceFilesQuery: { listFiles: vi.fn(), getFileContent },
      workspaceFileContentCommand: { saveFileContent },
    });

    expect(result).toEqual({ ok: true, writtenArtifactPaths: ['models/orders.sql'] });
    expect(saveFileContent).toHaveBeenCalledTimes(1);
    expect(saveFileContent).toHaveBeenCalledWith({
      path: 'models/orders.sql',
      content: NEXT_SQL,
      expectedRevision: { kind: 'content_sha256', value: 'a'.repeat(64) },
    });
  });

  it('publishes absent artifacts with an absent revision precondition', async () => {
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>(
      async (input) => ({
        kind: 'saved',
        disposition: 'created',
        path: input.path,
        contentSha256: 'e'.repeat(64),
        lastModified: '2026-07-22T00:00:01.000Z',
      })
    );

    const result = await publishGraphDbtWorkspaceArtifacts({
      artifacts: [{ path: 'models/orders.sql', language: 'sql', content: FIRST_SQL }],
      workspaceFilesQuery: {
        listFiles: vi.fn(),
        getFileContent: vi.fn(async (path) => {
          throw new WorkspaceFileLoadError('not_found', path);
        }),
      },
      workspaceFileContentCommand: { saveFileContent },
    });

    expect(result).toEqual({ ok: true, writtenArtifactPaths: ['models/orders.sql'] });
    expect(saveFileContent).toHaveBeenCalledWith({
      path: 'models/orders.sql',
      content: FIRST_SQL,
      expectedRevision: { kind: 'absent' },
    });
  });
});
