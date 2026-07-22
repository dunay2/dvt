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
