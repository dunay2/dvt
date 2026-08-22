import { type PublishGraphDbtWorkspaceArtifactsRequest } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  WorkspaceFileNotFoundError,
  type IWorkspaceFileBatchMutationPort,
  type IWorkspaceFileRepository,
  type WorkspaceFileContent,
} from '../../../../src/application/ports/workspaceFiles.js';
import type { CanvasAuthoringAuthorityPolicy } from '../../../../src/application/services/canvasAuthoringAuthorityPolicy.js';
import { PublishGraphDbtWorkspaceArtifactsCommand } from '../../../../src/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.js';

const SCOPE = {
  tenantId: 'tenant-graph-dbt',
  projectId: 'project-graph-dbt',
  environmentId: 'environment-graph-dbt',
} as const;

const SQL_PAYLOAD = 'select 2\n';

const REQUEST: PublishGraphDbtWorkspaceArtifactsRequest = {
  canvasId: 'orders-canvas',
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
      content: `-- dvt:graph-draft-content-sha256=${sha256HexUtf8(SQL_PAYLOAD)}\n${SQL_PAYLOAD}`,
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

function authorityPolicy(
  authorizeGraphArtifactPublication: CanvasAuthoringAuthorityPolicy['authorizeGraphArtifactPublication']
): CanvasAuthoringAuthorityPolicy {
  return {
    runAuthorizedGraphArtifactPublication: vi.fn(async (key, projectRoot, operation) => {
      const decision = await authorizeGraphArtifactPublication(key, projectRoot);
      return decision.kind === 'refused'
        ? decision
        : { kind: 'executed', value: await operation() };
    }),
  } as unknown as CanvasAuthoringAuthorityPolicy;
}

function allowedAuthorityPolicy(): CanvasAuthoringAuthorityPolicy {
  return authorityPolicy(
    vi.fn().mockResolvedValue({
      kind: 'allowed',
      binding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: REQUEST.canvasId,
        authority: { kind: 'graph-draft' },
      },
    })
  );
}

function workspaceFile(path: string, content: string, contentSha256: string): WorkspaceFileContent {
  return {
    path,
    name: path.split('/').at(-1)!,
    language: path.endsWith('.sql') ? 'sql' : 'yaml',
    content,
    contentSha256,
    lastModified: '2026-07-31T12:00:00.000Z',
  };
}

function workspaceFiles(
  overrides: Readonly<Record<string, WorkspaceFileContent | null>> = {}
): Pick<IWorkspaceFileRepository, 'getFileContent'> {
  const files: Readonly<Record<string, WorkspaceFileContent | null>> = {
    'dbt_project.yml': workspaceFile(
      'dbt_project.yml',
      'name: previous\n',
      REQUEST.artifacts[0]!.expectedRevision.kind === 'content_sha256'
        ? REQUEST.artifacts[0]!.expectedRevision.value
        : ''
    ),
    'models/orders.sql': workspaceFile(
      'models/orders.sql',
      REQUEST.artifacts[1]!.content,
      REQUEST.artifacts[1]!.expectedRevision.kind === 'content_sha256'
        ? REQUEST.artifacts[1]!.expectedRevision.value
        : ''
    ),
    'models/schema.yml': null,
    ...overrides,
  };

  return {
    async getFileContent(_scope, path) {
      const file = files[path];
      if (!file) throw new WorkspaceFileNotFoundError(path);
      return file;
    },
  };
}

describe('PublishGraphDbtWorkspaceArtifactsCommand', () => {
  it('accepts an authorized revision-consistent publication when every artifact is unchanged', async () => {
    const artifacts = REQUEST.artifacts.map((artifact) => ({
      ...artifact,
      expectedRevision: {
        kind: 'content_sha256' as const,
        value: sha256HexUtf8(artifact.content),
      },
      writeRequired: false,
    }));
    const request: PublishGraphDbtWorkspaceArtifactsRequest = { ...REQUEST, artifacts };
    const apply = vi.fn<IWorkspaceFileBatchMutationPort['apply']>(async (_scope, mutation) => ({
      kind: 'applied',
      idempotencyKey: mutation.idempotencyKey,
      requestHash: 'e'.repeat(64),
      deduplicated: false,
      writes: [],
      deletes: [],
    }));
    const command = new PublishGraphDbtWorkspaceArtifactsCommand(
      allowedAuthorityPolicy(),
      workspaceFiles(
        Object.fromEntries(
          artifacts.map((artifact) => [
            artifact.path,
            workspaceFile(artifact.path, artifact.content, sha256HexUtf8(artifact.content)),
          ])
        )
      ),
      { apply }
    );

    await expect(command.execute({ scope: SCOPE, ...request })).resolves.toMatchObject({
      schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
      kind: 'applied',
      idempotencyKey: request.idempotencyKey,
      requestHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      deduplicated: false,
      writes: [],
    });
    expect(apply).toHaveBeenCalledWith(SCOPE, {
      expectedFiles: artifacts.map((artifact) => ({
        path: artifact.path,
        expectedContentSha256: sha256HexUtf8(artifact.content),
      })),
      writes: [],
      deletes: [],
      idempotencyKey: request.idempotencyKey,
    });
  });

  it('derives writes from proposed content instead of trusting caller write flags', async () => {
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
    const command = new PublishGraphDbtWorkspaceArtifactsCommand(
      allowedAuthorityPolicy(),
      workspaceFiles(),
      { apply }
    );

    await expect(command.execute({ scope: SCOPE, ...REQUEST })).resolves.toMatchObject({
      kind: 'applied',
      deduplicated: true,
      writes: [
        { path: 'dbt_project.yml' },
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
        { path: 'dbt_project.yml', content: REQUEST.artifacts[0]!.content },
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
    const command = new PublishGraphDbtWorkspaceArtifactsCommand(
      allowedAuthorityPolicy(),
      workspaceFiles(),
      { apply }
    );

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

  it('refuses file authority before any workspace mutation', async () => {
    const apply = vi.fn<IWorkspaceFileBatchMutationPort['apply']>();
    const command = new PublishGraphDbtWorkspaceArtifactsCommand(
      authorityPolicy(
        vi.fn().mockResolvedValue({
          kind: 'refused',
          reason: 'dbt_project_files_authority',
        })
      ),
      workspaceFiles(),
      { apply }
    );

    await expect(command.execute({ scope: SCOPE, ...REQUEST })).resolves.toEqual({
      schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
      kind: 'authority_refused',
      canvasId: REQUEST.canvasId,
      reason: 'dbt_project_files_authority',
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it('returns a typed missing-authority refusal before any workspace mutation', async () => {
    const apply = vi.fn<IWorkspaceFileBatchMutationPort['apply']>();
    const command = new PublishGraphDbtWorkspaceArtifactsCommand(
      authorityPolicy(
        vi.fn().mockResolvedValue({
          kind: 'refused',
          reason: 'missing_authority',
        })
      ),
      workspaceFiles(),
      { apply }
    );

    await expect(command.execute({ scope: SCOPE, ...REQUEST })).resolves.toEqual({
      schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
      kind: 'authority_refused',
      canvasId: REQUEST.canvasId,
      reason: 'missing_authority',
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it('returns a typed mixed-authority refusal before any workspace mutation', async () => {
    const apply = vi.fn<IWorkspaceFileBatchMutationPort['apply']>();
    const command = new PublishGraphDbtWorkspaceArtifactsCommand(
      authorityPolicy(
        vi.fn().mockResolvedValue({
          kind: 'refused',
          reason: 'mixed_authority',
        })
      ),
      workspaceFiles(),
      { apply }
    );

    await expect(command.execute({ scope: SCOPE, ...REQUEST })).resolves.toEqual({
      schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
      kind: 'authority_refused',
      canvasId: REQUEST.canvasId,
      reason: 'mixed_authority',
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'unmarked SQL',
      currentContent: 'select * from manually_authored_orders\n',
    },
    {
      name: 'a mismatched divergence marker',
      currentContent: `-- dvt:graph-draft-content-sha256=${'0'.repeat(64)}\nselect 7\n`,
    },
  ])('refuses $name before any workspace mutation', async ({ currentContent }) => {
    const currentContentSha256 = sha256HexUtf8(currentContent);
    const request: PublishGraphDbtWorkspaceArtifactsRequest = {
      ...REQUEST,
      artifacts: REQUEST.artifacts.map((artifact) =>
        artifact.path === 'models/orders.sql'
          ? {
              ...artifact,
              expectedRevision: {
                kind: 'content_sha256' as const,
                value: currentContentSha256,
              },
            }
          : artifact
      ),
    };
    const apply = vi.fn<IWorkspaceFileBatchMutationPort['apply']>();
    const command = new PublishGraphDbtWorkspaceArtifactsCommand(
      allowedAuthorityPolicy(),
      workspaceFiles({
        'models/orders.sql': workspaceFile(
          'models/orders.sql',
          currentContent,
          currentContentSha256
        ),
      }),
      { apply }
    );

    await expect(command.execute({ scope: SCOPE, ...request })).resolves.toEqual({
      schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
      kind: 'conflict',
      conflicts: [
        {
          path: 'models/orders.sql',
          currentContentSha256,
        },
      ],
    });
    expect(apply).not.toHaveBeenCalled();
  });
});
