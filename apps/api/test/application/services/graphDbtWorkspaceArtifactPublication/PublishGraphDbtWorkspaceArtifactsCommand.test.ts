import type { PublishGraphDbtWorkspaceArtifactsRequest } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  IWorkspaceFileBatchMutationPort,
} from '../../../../src/application/ports/workspaceFiles.js';
import { PublishGraphDbtWorkspaceArtifactsCommand } from '../../../../src/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.js';

const SCOPE = {
  tenantId: 'tenant-graph-dbt',
  projectId: 'project-graph-dbt',
  environmentId: 'environment-graph-dbt',
} as const;

const REQUEST: PublishGraphDbtWorkspaceArtifactsRequest = {
  artifacts: [
    {
      path: 'dbt_project.yml',
      content: 'name: analytics\n',
      language: 'yaml',
      expectedRevision: { kind: 'content_sha256', value: 'a'.repeat(64) },
      writeRequired: false,
    },
    {
      path: 'models/orders.sql',
      content: `-- dvt:graph-draft-content-sha256=${'b'.repeat(64)}\nselect 2\n`,
      language: 'sql',
      expectedRevision: { kind: 'content_sha256', value: 'c'.repeat(64) },
      writeRequired: true,
    },
    {
      path: 'models/schema.yml',
      content: 'version: 2\nmodels: []\n',
      language: 'yaml',
      expectedRevision: { kind: 'absent' },
      writeRequired: true,
    },
  ],
  idempotencyKey: 'graph-dbt:' + 'd'.repeat(64),
};

describe('PublishGraphDbtWorkspaceArtifactsCommand', () => {
  it('sends every expected revision and every required write through one batch apply', async () => {
    const apply = vi.fn<IWorkspaceFileBatchMutationPort['apply']>(async (_scope, mutation) => ({
      kind: 'applied',
      idempotencyKey: mutation.idempotencyKey,
      requestHash: 'e'.repeat(64),
      deduplicated: true,
      writes: mutation.writes.map((write) => ({
        path: write.path,
        contentSha256: 'f'.repeat(64),
      })),
      deletes: [],
    }));
    const command = new PublishGraphDbtWorkspaceArtifactsCommand({ apply });

    await expect(command.execute({ scope: SCOPE, ...REQUEST })).resolves.toMatchObject({
      kind: 'applied',
      deduplicated: true,
      writes: [
        { path: 'models/orders.sql' },
        { path: 'models/schema.yml' },
      ],
    });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(SCOPE, {
      expectedFiles: [
        { path: 'dbt_project.yml', expectedContentSha256: 'a'.repeat(64) },
        { path: 'models/orders.sql', expectedContentSha256: 'c'.repeat(64) },
        { path: 'models/schema.yml' },
      ],
      writes: [
        { path: 'models/orders.sql', content: REQUEST.artifacts[1]!.content },
        { path: 'models/schema.yml', content: REQUEST.artifacts[2]!.content },
      ],
      deletes: [],
      idempotencyKey: REQUEST.idempotencyKey,
    });
  });

  it('returns the complete conflict set without attempting compensating writes', async () => {
    const apply = vi.fn<IWorkspaceFileBatchMutationPort['apply']>(async () => ({
      kind: 'conflict',
      conflicts: [
        { path: 'models/orders.sql', currentContentSha256: '1'.repeat(64) },
        { path: 'models/schema.yml', currentContentSha256: null },
      ],
    }));
    const command = new PublishGraphDbtWorkspaceArtifactsCommand({ apply });

    await expect(command.execute({ scope: SCOPE, ...REQUEST })).resolves.toEqual({
      schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
      kind: 'conflict',
      conflicts: [
        { path: 'models/orders.sql', currentContentSha256: '1'.repeat(64) },
        { path: 'models/schema.yml', currentContentSha256: null },
      ],
    });
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
