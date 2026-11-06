// @vitest-environment jsdom
import { createRef, isValidElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/dom';

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../services/AppServicesContext';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceFileCodeEditorHandle } from '../code/WorkspaceFileCodeEditor';
import { contextFixture } from '../code/codeWorkspaceFileContext.test-support';
import { buildDbtWorkspaceFileCodeContributions } from './dbtWorkspaceFileCodeContribution';

vi.mock('../code/WorkspaceFileCodeEditor', async () => {
  const { useWorkspaceFileContentQuery } = await import('../../queries/workspaceQueries');
  return {
    WorkspaceFileCodeEditor: ({ path }: { path?: string }) => {
      const file = useWorkspaceFileContentQuery(path);
      return (
        <output data-file-path={path}>{file.isSuccess ? file.data.content : 'Loading'}</output>
      );
    },
  };
});

let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
afterEach(async () => {
  await mounted?.cleanup();
  mounted = undefined;
});

const NODE: CanonicalNode = {
  id: 'model.analytics.orders',
  name: 'orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  path: 'models/orders.sql',
  metadata: {
    authority: 'dbt-project-files',
    dbt: { packageName: 'analytics' },
  },
};

function referencedNode(path: string | undefined, canvasId: string): CanonicalNode {
  return {
    ...NODE,
    path,
    metadata: {
      dbtModelReference: {
        schemaVersion: 'workspace-dbt-model-reference.v1',
        canvasId,
        uniqueId: 'model.demo.ventas',
        relationId: 'placed-output',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: 'warehouse',
        },
        fields: [{ fieldId: 'placed-id', name: 'id', dataType: 'text', nullable: true }],
      },
    },
  };
}

describe('buildDbtWorkspaceFileCodeContributions', () => {
  it('opens a persisted model instance using current authority after relocation and a fresh mount', async () => {
    const old = contextFixture('select 1', 'old-root');
    const current = contextFixture('select 2 as relocated', 'models');
    current.project.authorityBinding.canvasId = old.project.authorityBinding.canvasId;
    current.file.authoringAuthority = {
      kind: 'resolved',
      binding: current.project.authorityBinding,
    };
    const node = referencedNode(old.file.path, old.project.authorityBinding.canvasId);
    const listFiles = vi
      .fn()
      .mockResolvedValue([
        { name: 'dbt_project.yml', path: 'models/dbt_project.yml', kind: 'file' },
      ]);
    const getFileContent = vi.fn(async (path: string) => {
      if (path === 'models/dbt_project.yml')
        return {
          ...current.file,
          name: 'dbt_project.yml',
          path,
          language: 'yaml',
          content: 'name: demo',
        };
      if (path === current.file.path) return current.file;
      throw new Error(`Unexpected historic file read: ${path}`);
    });
    const getProjectGraph = vi.fn().mockResolvedValue(current.project);
    const saveFileContent = vi.fn();
    for (let reload = 0; reload < 2; reload += 1) {
      const contributions = buildDbtWorkspaceFileCodeContributions({ node });
      mounted = await withTestQueryClient(
        <AppServicesProvider
          overrides={{
            ...createAppServicesTestOverrides(),
            workspaceFilesQuery: { listFiles, getFileContent },
            dbtProjectGraphQueryPort: { getProjectGraph },
            workspaceFileContentCommand: { saveFileContent },
          }}
        >
          {contributions[0]?.content}
        </AppServicesProvider>
      );
      expect(getFileContent).not.toHaveBeenCalledWith(old.file.path);
      await waitForReactQuery(() => screen.queryByText(current.file.content) != null);
      expect(screen.getByRole('status').getAttribute('data-file-path')).toBe(
        'models/models/ventas.sql'
      );
      await mounted.cleanup();
      mounted = undefined;
    }
    expect(getProjectGraph).toHaveBeenCalledWith(current.project.authorityBinding);
    expect(getFileContent).not.toHaveBeenCalledWith(old.file.path);
    expect(saveFileContent).not.toHaveBeenCalled();
    expect(node.path).toBe(old.file.path);
  });

  it.each([
    'different-canvas',
    'stale-projection',
    'missing-model',
    'ambiguous-project',
    'unavailable-authority',
  ] as const)('never falls back to a historic path for %s', async (reason) => {
    const current = contextFixture('select 1', 'current');
    const config = {
      ...current.file,
      name: 'dbt_project.yml',
      path: 'current/dbt_project.yml',
      language: 'yaml',
      content: 'name: demo',
    };
    const node = referencedNode(
      'old/models/ventas.sql',
      reason === 'different-canvas' ? 'other-canvas' : current.project.authorityBinding.canvasId
    );
    const listFiles = vi
      .fn()
      .mockResolvedValue([
        { name: config.name, path: config.path, kind: 'file' },
        ...(reason === 'ambiguous-project'
          ? [{ name: config.name, path: 'other/dbt_project.yml', kind: 'file' }]
          : []),
      ]);
    const getFileContent = vi
      .fn()
      .mockResolvedValue(
        reason === 'unavailable-authority'
          ? { ...config, authoringAuthority: { kind: 'unresolved', reason: 'missing_authority' } }
          : config
      );
    const getProjectGraph = vi
      .fn()
      .mockResolvedValue({
        ...current.project,
        freshness: reason === 'stale-projection' ? 'stale' : 'fresh',
        nodes: reason === 'missing-model' ? [] : current.project.nodes,
      });
    const saveFileContent = vi.fn();
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          workspaceFilesQuery: { listFiles, getFileContent },
          dbtProjectGraphQueryPort: { getProjectGraph },
          workspaceFileContentCommand: { saveFileContent },
        }}
      >
        {buildDbtWorkspaceFileCodeContributions({ node })[0]?.content}
      </AppServicesProvider>
    );
    await waitForReactQuery(() => screen.queryByRole('alert') != null);
    expect(screen.queryByRole('status')).toBeNull();
    expect(getFileContent.mock.calls.every(([path]) => path === config.path)).toBe(true);
    expect(saveFileContent).not.toHaveBeenCalled();
    if (
      reason === 'different-canvas' ||
      reason === 'ambiguous-project' ||
      reason === 'unavailable-authority'
    )
      expect(getProjectGraph).not.toHaveBeenCalled();
  });

  it('keeps reference identity independent of a captured path', () => {
    expect(
      buildDbtWorkspaceFileCodeContributions({ node: referencedNode(undefined, 'owner') })
    ).toHaveLength(1);
  });

  it('binds a file-backed dbt node to shared read-only Code without changing its authority', () => {
    const editorRef = createRef<WorkspaceFileCodeEditorHandle>();
    const reconcilePersistedFile = vi.fn();
    const contributions = buildDbtWorkspaceFileCodeContributions({
      node: NODE,
      projectRoot: 'analytics',
      editorRef,
      reconcilePersistedFile,
    });

    expect(contributions).toHaveLength(1);
    expect(contributions[0]).toMatchObject({
      id: 'dbt-workspace-file-code-editor',
      nodeId: NODE.id,
      sectionId: 'code',
      placement: 'before-body',
    });
    expect(isValidElement(contributions[0]?.content)).toBe(true);
    if (!isValidElement(contributions[0]?.content)) {
      throw new Error('expected a workspace file editor contribution');
    }
    expect(contributions[0].content.props).toMatchObject({
      authority: 'dbt-project-files',
      access: 'read-only',
      path: 'analytics/models/orders.sql',
      reconcilePersistedFile,
    });
  });

  it.each([
    { projectRoot: '.', nodePath: 'models/orders.sql', expected: 'models/orders.sql' },
    {
      projectRoot: 'models',
      nodePath: 'models/orders.sql',
      expected: 'models/models/orders.sql',
    },
  ])('keeps canonical workspace path $expected stable', ({ projectRoot, nodePath, expected }) => {
    const contributions = buildDbtWorkspaceFileCodeContributions({
      node: { ...NODE, path: nodePath },
      projectRoot,
      editorRef: createRef<WorkspaceFileCodeEditorHandle>(),
      reconcilePersistedFile: vi.fn(),
    });

    expect(contributions).toHaveLength(1);
    if (!isValidElement(contributions[0]?.content)) {
      throw new Error('expected a workspace file editor contribution');
    }
    expect(contributions[0].content.props).toMatchObject({ path: expected });
  });

  it('does not substitute a workspace file for an external dbt package', () => {
    expect(
      buildDbtWorkspaceFileCodeContributions({
        node: {
          ...NODE,
          id: 'model.dbt_utils.orders',
          metadata: {
            authority: 'dbt-project-files',
            dbt: { packageName: 'dbt_utils' },
            packageName: 'dbt_utils',
            visualEditability: { status: 'code_only', reasons: ['external_package'] },
          },
        },
        projectRoot: 'analytics',
        editorRef: createRef<WorkspaceFileCodeEditorHandle>(),
        reconcilePersistedFile: vi.fn(),
      })
    ).toEqual([]);
  });

  it('does not invent a Code file for a pathless node', () => {
    expect(
      buildDbtWorkspaceFileCodeContributions({
        node: { ...NODE, path: undefined },
        projectRoot: 'analytics',
        editorRef: createRef<WorkspaceFileCodeEditorHandle>(),
        reconcilePersistedFile: vi.fn(),
      })
    ).toEqual([]);
  });
});
