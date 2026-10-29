/** Prove CodeView authority without duplicating its host or editor boundary. */
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  IWorkspaceFileContentCommandPort,
  WorkspaceGraphSnapshot,
} from '../../ports/workspace';
import { mockGraphDraftAuthoringAuthority } from '../../../testing/workspacePortDoubles';
import { createCodeViewTestHarness } from './tests/CodeView.test-support';

describe('CodeView authority', () => {
  const harness = createCodeViewTestHarness();
  const {
    copy,
    buildWorkspaceFilesQueryPort,
    waitFor,
    getContainer,
    setupContainer,
    renderCodeView,
  } = harness;
  afterEach(harness.cleanup);

  it('opens authorized project files outside the graph without making generated files editable', async () => {
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
    const getGraphSnapshot = vi.fn(async (): Promise<WorkspaceGraphSnapshot> => ({
      authoringAuthority: mockGraphDraftAuthoringAuthority,
      nodes: [
        {
          id: 'graph_model',
          name: 'Graph model',
          type: 'MODEL',
          package: 'dvt',
          path: 'models/graph_model.sql',
          tags: [],
          status: 'idle',
          dependencies: [],
        },
      ],
      edges: [],
    }));
    setupContainer();
    await renderCodeView({ saveFileContent }, false, undefined, {
      fileScope: { kind: 'workspace-files' },
      initialPath: 'models/graph_model.sql',
      fileSelectionRequest: { path: 'README.md' },
      workspaceGraphSnapshotQuery: { getGraphSnapshot },
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({
        listFiles: async () => [
          { path: 'README.md', name: 'README.md', kind: 'file' },
          {
            path: 'models',
            name: 'models',
            kind: 'directory',
            children: [{ path: 'models/graph_model.sql', name: 'graph_model.sql', kind: 'file' }],
          },
        ],
      }),
    });
    await waitFor(
      () =>
        getContainer().querySelector(
          '[data-testid="monaco-code-editor"], [data-slot="code-route-empty-state"]'
        ) != null
    );
    expect(getGraphSnapshot).toHaveBeenCalled();
    expect(
      getContainer().querySelector('[data-testid="monaco-code-editor"]')?.getAttribute('data-path')
    ).toBe('README.md');
    const generated = getContainer().querySelector<HTMLButtonElement>(
      '[data-slot="code-workspace-file-entry"][data-workspace-path="models/graph_model.sql"]'
    );
    expect(generated).not.toBeNull();
    await act(async () => generated?.click());
    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-testid="monaco-code-viewer"]')
          ?.getAttribute('data-path') === 'models/graph_model.sql'
    );
    expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
    expect(saveFileContent).not.toHaveBeenCalled();
  });

  it('keeps workspace files read-only when graph authoring authority is missing', async () => {
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
    setupContainer();
    await renderCodeView({ saveFileContent }, false, undefined, {
      fileScope: { kind: 'workspace-files' },
      initialPath: 'README.md',
      workspaceGraphSnapshotQuery: {
        getGraphSnapshot: async () => ({
          nodes: [],
          edges: [],
          authoringAuthority: { kind: 'unresolved', reason: 'missing_authority', canvasId: null },
        }),
      },
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({
        listFiles: async () => [{ path: 'README.md', name: 'README.md', kind: 'file' }],
      }),
    });
    await waitFor(
      () =>
        getContainer().querySelector(
          '[data-testid="monaco-code-viewer"], [data-slot="code-route-empty-state"]'
        ) != null
    );
    expect(
      getContainer().querySelector('[data-testid="monaco-code-viewer"]')?.getAttribute('data-path')
    ).toBe('README.md');
    expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
    expect(saveFileContent).not.toHaveBeenCalled();
  });

  it('opens a Canvas workflow pipeline file as project code', async () => {
    setupContainer();
    await renderCodeView(undefined, true, undefined, {
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({
        listFiles: async () => [
          {
            path: 'pipelines',
            name: 'pipelines',
            kind: 'directory',
            children: [
              {
                path: 'pipelines/sales_pipeline.yaml',
                name: 'sales_pipeline.yaml',
                kind: 'file',
              },
            ],
          },
          {
            path: 'models',
            name: 'models',
            kind: 'directory',
            children: [
              {
                path: 'models/analytics/model_orders.sql',
                name: 'model_orders.sql',
                kind: 'file',
              },
            ],
          },
        ],
      }),
    });

    await waitFor(() => getContainer()?.textContent?.includes('sales_pipeline.yaml') === true);
    await waitFor(
      () => getContainer()?.querySelector('[data-testid="monaco-code-editor"]') != null
    );

    const editor = getContainer().querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );
    expect(editor?.getAttribute('data-path')).toBe('pipelines/sales_pipeline.yaml');
    expect(editor?.getAttribute('data-language')).toBe('yaml');
    expect(editor?.value).toContain('entrypoint: "models/analytics/model_orders.sql"');
  });

  it('scopes the explorer to files that represent the active graph', async () => {
    const graphSnapshot: WorkspaceGraphSnapshot = {
      authoringAuthority: mockGraphDraftAuthoringAuthority,
      nodes: [
        {
          id: 'orders_model',
          name: 'payments model',
          type: 'MODEL',
          package: 'dbt',
          path: '',
          tags: ['model'],
          status: 'idle',
          dependencies: ['warehouse_payments'],
        },
      ],
      edges: [],
    };

    setupContainer();
    await renderCodeView(undefined, true, undefined, {
      workspaceGraphSnapshotQuery: {
        getGraphSnapshot: async () => graphSnapshot,
      },
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({
        listFiles: async () => [
          {
            path: 'dbt_project.yml',
            name: 'dbt_project.yml',
            kind: 'file',
          },
          {
            path: 'models',
            name: 'models',
            kind: 'directory',
            children: [
              {
                path: 'models/orders_model.sql',
                name: 'orders_model.sql',
                kind: 'file',
              },
              {
                path: 'models/payments_model.sql',
                name: 'payments_model.sql',
                kind: 'file',
              },
              {
                path: 'models/schema.yml',
                name: 'schema.yml',
                kind: 'file',
              },
            ],
          },
        ],
        getFileContent: async (path) => ({
          path,
          name: path.split('/').at(-1) ?? path,
          language: path.endsWith('.sql') ? 'sql' : 'yaml',
          content:
            path === 'models/payments_model.sql'
              ? "{{ config(materialized='table') }}\n\nselect *\nfrom {{ source('finance_warehouse', 'payments_final') }}"
              : 'version: 2',
          contentSha256: 'a'.repeat(64),
          lastModified: '2026-06-01T00:00:00.000Z',
        }),
      }),
    });

    await waitFor(() => getContainer()?.textContent?.includes('payments_model.sql') === true);
    await waitFor(
      () => getContainer()?.querySelector('[data-testid="monaco-code-viewer"]') != null
    );

    const currentContainer = getContainer();
    expect(currentContainer.textContent).toContain('dbt_project.yml');
    expect(currentContainer.textContent).toContain('payments_model.sql');
    expect(currentContainer.textContent).toContain('schema.yml');
    expect(currentContainer.textContent).not.toContain('orders_model.sql');

    const viewer = currentContainer.querySelector<HTMLElement>(
      '[data-testid="monaco-code-viewer"]'
    );
    expect(viewer?.getAttribute('data-path')).toBe('models/payments_model.sql');
    expect(viewer?.textContent).toContain("{{ source('finance_warehouse', 'payments_final') }}");
    expect(currentContainer.textContent).not.toContain(copy.workingTreeGraphOwnedReadOnlyLabel);
    expect(currentContainer.querySelector('[data-slot="code-working-tree-status"]')).toBeNull();
  });

  it('opens a project-scoped resource without querying the graph-draft snapshot', async () => {
    const getGraphSnapshot = vi.fn(async () => {
      throw new Error('file-backed Code must not query graph draft');
    });
    setupContainer();

    await renderCodeView(undefined, false, undefined, {
      workspaceGraphSnapshotQuery: { getGraphSnapshot },
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({
        listFiles: async () => [
          { path: 'dbt_project.yml', name: 'dbt_project.yml', kind: 'file' },
          {
            path: 'models',
            name: 'models',
            kind: 'directory',
            children: [{ path: 'models/orders.sql', name: 'orders.sql', kind: 'file' }],
          },
        ],
      }),
      fileScope: {
        kind: 'dbt-project-files',
        projectRoot: '.',
        initialPath: 'models/orders.sql',
      },
    });

    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-testid="monaco-code-editor"]')
          ?.getAttribute('data-path') === 'models/orders.sql'
    );
    expect(getGraphSnapshot).not.toHaveBeenCalled();
  });
});
