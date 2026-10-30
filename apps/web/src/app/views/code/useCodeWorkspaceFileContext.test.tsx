// @vitest-environment jsdom
/** Prove normal Code entry discovers only accepted file context and reuses its CAS session. */
import {
  DbtProjectGraphProjectionSchema,
  DbtSelectedModelAnalysisSchema,
  type DbtProjectGraphProjection,
  type DbtSelectedModelAnalysis,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { QueryClient } from '@tanstack/react-query';
import { act, createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import { mockGraphDraftAuthoringAuthority } from '../../../testing/workspacePortDoubles';
import { AppServicesProvider } from '../../services/AppServicesContext';
import CodeView, { type CodeViewHandle } from '../CodeView';
import { WorkspaceFileCodeEditor } from './WorkspaceFileCodeEditor';
import { useCodeWorkspaceFileContext } from './useCodeWorkspaceFileContext';
import { useDbtProjectGraphQuery } from '../../queries/dbtProjectQueries';
import { queryKeys } from '../../queries/queryKeys';
import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import type { FileContent, WorkspaceGraphSnapshot } from '../../ports/workspace';
import { resolveCodeInlineReferenceCopy } from './codeViewCopy';

vi.mock('../../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: ({
    value,
    onChange,
    inlineReferences,
    onInspectReference,
  }: {
    value: string;
    onChange: (value: string) => void;
    inlineReferences?: { items: readonly { id: string; label: string }[] };
    onInspectReference?: (id: string) => void;
  }) => (
    <>
      <textarea aria-label="Code" value={value} onChange={(e) => onChange(e.currentTarget.value)} />
      {inlineReferences?.items.map((r) => (
        <button key={r.id} data-reference={r.id} onClick={() => onInspectReference?.(r.id)}>
          {r.label}
        </button>
      ))}
    </>
  ),
}));
vi.mock('../../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({
    value,
    inlineReferences,
    onInspectReference,
  }: {
    value: string;
    inlineReferences?: { items: readonly { id: string; label: string }[] };
    onInspectReference?: (id: string) => void;
  }) => (
    <>
      <pre data-testid="code-file-viewer">{value}</pre>
      {inlineReferences?.items.map((r) => (
        <button key={r.id} data-reference={r.id} onClick={() => onInspectReference?.(r.id)}>
          {r.label}
        </button>
      ))}
    </>
  ),
}));

function contextFixture(
  sql = "select * from {{ ref('clientes') }} join {{ ref('pedidos') }} on true",
  root = 'inline_code_demo'
): { project: DbtProjectGraphProjection; analysis: DbtSelectedModelAnalysis; file: FileContent } {
  const binding = {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: `canvas-${root}`,
    authority: { kind: 'dbt-project-files', projectRoot: root },
  };
  const nodes = ['ventas', 'clientes', 'pedidos'].map((name) => ({
    uniqueId: `model.demo.${name}`,
    resourceType: 'model',
    name,
    packageName: 'demo',
    originalFilePath: `models/${name}.sql`,
    columns: [],
    tags: [],
    visualEditability: { status: 'code_only', reasons: ['reference-only'] },
  }));
  const project = DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    freshness: 'fresh',
    authorityBinding: binding,
    projectRevision: {
      projectRoot: root,
      projectName: 'demo',
      contentSetSha256: sha256HexUtf8(sql),
      analyzedAt: '2026-10-30T04:00:00.000Z',
      analyzerVersion: 'dbt-cli-v1',
    },
    analysisSha256: sha256HexUtf8(`analysis:${sql}`),
    nodes,
    edges: [],
    diagnostics: [],
    capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 3 },
  });
  const analysis = DbtSelectedModelAnalysisSchema.parse({
    schemaVersion: 'dbt-selected-model-analysis.v1',
    status: 'ready',
    authorityBinding: binding,
    projectRevision: project.projectRevision,
    analysisSha256: project.analysisSha256,
    selectedAnalysisSha256: sha256HexUtf8(`selected:${sql}`),
    selectedUniqueId: 'model.demo.ventas',
    capabilitySet: {
      analyzerVersion: 'dbt-cli-v1',
      supportedRegionKinds: ['ref'],
      capabilitySetSha256: sha256HexUtf8('capabilities'),
    },
    files: ['clientes', 'pedidos', 'ventas'].map((name) => ({
      path: `models/${name}.sql`,
      kind: 'model',
      revisionSha256: sha256HexUtf8(name === 'ventas' ? sql : 'select 1'),
      byteLength: new TextEncoder().encode(name === 'ventas' ? sql : 'select 1').length,
    })),
    identities: [...nodes]
      .sort((a, b) => a.uniqueId.localeCompare(b.uniqueId))
      .map(({ uniqueId, resourceType, name, packageName, originalFilePath }) => ({
        uniqueId,
        resourceType,
        name,
        packageName,
        originalFilePath,
        relationToSelection: name === 'ventas' ? 'selected' : 'upstream',
      })),
    dependencies: [],
    diagnostics: [],
    regions: ['clientes', 'pedidos'].map((name, i) => {
      const source = `{{ ref('${name}') }}`;
      const start = sql.indexOf(source);
      return {
        regionId: `region-${i}`,
        path: 'models/ventas.sql',
        kind: 'ref',
        classification: 'supported',
        targetUniqueId: `model.demo.${name}`,
        range: {
          startByte: new TextEncoder().encode(sql.slice(0, start)).length,
          endByte: new TextEncoder().encode(sql.slice(0, start + source.length)).length,
        },
        sourceSha256: sha256HexUtf8(source),
      };
    }),
  });
  return {
    project,
    analysis,
    file: {
      path: `${root}/models/ventas.sql`,
      name: 'ventas.sql',
      language: 'sql',
      content: sql,
      contentSha256: sha256HexUtf8(sql),
      lastModified: '2026-10-30T04:00:00.000Z',
      authoringAuthority: { kind: 'resolved' as const, binding: project.authorityBinding },
    },
  };
}

describe('Code workspace file context through normal Code entry', () => {
  let fixture = contextFixture();
  const graph = vi.fn(async () => fixture.project);
  const analysis = vi.fn(async () => fixture.analysis);
  const save = vi.fn(async (input: { path: string; content: string }) => {
    fixture = contextFixture(input.content);
    return {
      kind: 'saved' as const,
      disposition: 'updated' as const,
      path: input.path,
      contentSha256: fixture.file.contentSha256,
      lastModified: fixture.file.lastModified,
    };
  });
  let container: HTMLDivElement;
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
  const handle = createRef<CodeViewHandle>();
  let fileAuthority: unknown;
  let graphOwned = false;
  let parentMissing = false;
  let graphSnapshot: Promise<WorkspaceGraphSnapshot> | undefined;
  let fileRead: Promise<FileContent> | undefined;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const render = async ({
    editableFile = false,
  }: Readonly<{ editableFile?: boolean }> = {}): Promise<void> => {
    const ui = (
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          workspaceFilesQuery: {
            listFiles: async () => [{ path: fixture.file.path, name: 'ventas.sql', kind: 'file' }],
            getFileContent: async (path) => {
              if (path === fixture.file.path && fileRead !== undefined) return fileRead;
              return {
                ...fixture.file,
                path,
                content: path === fixture.file.path ? fixture.file.content : 'select 1',
                contentSha256:
                  path === fixture.file.path
                    ? fixture.file.contentSha256
                    : sha256HexUtf8('select 1'),
                authoringAuthority:
                  fileAuthority === undefined ? fixture.file.authoringAuthority : fileAuthority,
              } as typeof fixture.file;
            },
          },
          workspaceGraphSnapshotQuery: {
            getGraphSnapshot: async () =>
              graphSnapshot ?? {
                authoringAuthority: parentMissing
                  ? { kind: 'unresolved', reason: 'missing_authority', canvasId: null }
                  : mockGraphDraftAuthoringAuthority,
                edges: [],
                nodes: graphOwned
                  ? [
                      {
                        id: 'owned',
                        name: 'owned',
                        type: 'MODEL',
                        package: 'demo',
                        path: fixture.file.path,
                        tags: [],
                        status: 'idle',
                        dependencies: [],
                      },
                    ]
                  : [],
              },
          },
          workspaceFileContentCommand: { saveFileContent: save },
          dbtProjectGraphQueryPort: { getProjectGraph: graph },
          dbtSelectedModelAnalysisQueryPort: { analyzeSelectedModel: analysis },
        }}
      >
        {editableFile ? (
          <WorkspaceFileCodeEditor
            ref={handle}
            access="editable"
            authority="dbt-project-files"
            path={fixture.file.path}
          />
        ) : (
          <CodeView
            ref={handle}
            publishRouteBootstrap={false}
            fileScope={{ kind: 'workspace-files' }}
            initialPath={fixture.file.path}
          />
        )}
      </AppServicesProvider>
    );
    if (mounted) {
      await mounted.render(ui);
    } else {
      mounted = await withTestQueryClient(ui, client);
      container = mounted.container;
    }
  };
  const waitFor = waitForReactQuery;
  afterEach(async () => {
    await mounted?.cleanup();
    mounted = undefined;
    client.clear();
    fixture = contextFixture();
    fileAuthority = undefined;
    graphOwned = false;
    parentMissing = false;
    graphSnapshot = undefined;
    fileRead = undefined;
    graph.mockReset().mockImplementation(async () => fixture.project);
    analysis.mockClear();
    save.mockClear();
  });

  it('inspects normal project Code read-only without saving or reconciling', async () => {
    await render();
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    expect(graph).toHaveBeenCalledWith(fixture.project.authorityBinding);
    expect(analysis).toHaveBeenCalledWith(fixture.project.authorityBinding, 'model.demo.ventas');
    expect(container.querySelector('textarea')).toBeNull();
    const viewer = container.querySelector('[data-testid="code-file-viewer"]');
    expect(viewer?.textContent).toBe(fixture.file.content);
    expect(container.querySelector('[data-phase="read_only"]')).not.toBeNull();
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-reference="region-0"]')?.click()
    );
    await waitFor(
      () =>
        container.querySelector('section[aria-label="clientes"] code')?.textContent === 'select 1'
    );
    expect(container.querySelector('[data-testid="code-file-viewer"]')).toBe(viewer);
    expect(graph).toHaveBeenCalledTimes(1);
    expect(analysis).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('withholds cached authority and definition while the file read is being revalidated', async () => {
    const inlineCopy = resolveCodeInlineReferenceCopy('en-US');
    await render();
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    const viewer = container.querySelector('[data-testid="code-file-viewer"]');
    const original = fixture.file.content;
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-reference="region-0"]')?.click()
    );
    await waitFor(
      () =>
        container.querySelector('section[aria-label="clientes"] code')?.textContent === 'select 1'
    );

    let finishGraph: ((projection: DbtProjectGraphProjection) => void) | undefined;
    let finishFile: ((file: FileContent) => void) | undefined;
    const pendingGraph = new Promise<DbtProjectGraphProjection>((resolve) => {
      finishGraph = resolve;
    });
    fileRead = new Promise<FileContent>((resolve) => {
      finishFile = resolve;
    });
    graph.mockImplementationOnce(() => pendingGraph);
    const mixed: FileContent = {
      ...fixture.file,
      authoringAuthority: { kind: 'unresolved', reason: 'mixed_authority', canvasId: null },
    };
    let graphRefresh: Promise<void> | undefined;
    let fileRefresh: Promise<void> | undefined;
    try {
      await act(async () => {
        graphRefresh = client.refetchQueries({
          queryKey: queryKeys.workspace.dbtProjectGraphRoot(),
        });
      });
      await waitFor(() => graph.mock.calls.length === 2);
      await waitFor(() => container.querySelectorAll('[data-reference]').length === 0);
      expect(container.textContent).toContain(inlineCopy.checkingMessage);
      await act(async () => {
        fileRefresh = client.refetchQueries({
          queryKey: ['workspace', 'file-content'],
          predicate: (q) => q.queryKey.at(-1) === fixture.file.path,
        });
      });
      await act(async () => {
        finishGraph?.(fixture.project);
        await graphRefresh;
      });
      await waitFor(() => !container.textContent?.includes(inlineCopy.checkingMessage));
      expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(container.querySelector('section[aria-label="clientes"]')).toBeNull();
      expect(graph).toHaveBeenCalledTimes(2);
      expect(container.querySelector('[data-testid="code-file-viewer"]')).toBe(viewer);
      expect(viewer?.textContent).toBe(original);
      expect(container.querySelector('textarea')).toBeNull();
      expect(save).not.toHaveBeenCalled();
      await act(async () => {
        finishFile?.(mixed);
        await fileRefresh;
      });
      await waitFor(() => container.textContent?.includes(inlineCopy.unavailableMessage) === true);
      expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(graph).toHaveBeenCalledTimes(2);
    } finally {
      await act(async () => {
        finishGraph?.(fixture.project);
        finishFile?.(mixed);
        await Promise.all([graphRefresh, fileRefresh]);
      });
    }
  });

  it.each(['missing', 'mixed', 'graph-owned'] as const)(
    'does not analyze %s context',
    async (kind) => {
      if (kind === 'graph-owned') graphOwned = true;
      else
        fileAuthority = {
          kind: 'unresolved',
          reason: kind === 'mixed' ? 'mixed_authority' : 'missing_authority',
          canvasId: null,
        };
      await render();
      await waitFor(() => container.textContent?.includes('ventas.sql') === true);
      expect(graph).not.toHaveBeenCalled();
      expect(analysis).not.toHaveBeenCalled();
      expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(save).not.toHaveBeenCalled();
    }
  );

  it('inspects server-authorized dbt references without granting editing when parent authority is missing', async () => {
    parentMissing = true;
    await render();
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toBe(fixture.file.content);
    expect(save).not.toHaveBeenCalled();
    expect(container.querySelector('[data-phase="read_only"]')).not.toBeNull();
  });

  it('waits for a pending graph ownership read before allowing file context queries', async () => {
    let resolveGraph: ((snapshot: WorkspaceGraphSnapshot) => void) | undefined;
    graphSnapshot = new Promise((resolve) => {
      resolveGraph = resolve;
    });
    await render();
    expect(container.querySelector('pre')).toBeNull();
    expect(graph).not.toHaveBeenCalled();
    await act(async () =>
      resolveGraph?.({
        authoringAuthority: mockGraphDraftAuthoringAuthority,
        edges: [],
        nodes: [
          {
            id: 'owned',
            name: 'owned',
            type: 'MODEL',
            package: 'demo',
            path: fixture.file.path,
            tags: [],
            status: 'idle',
            dependencies: [],
          },
        ],
      })
    );
    await waitFor(() => container.querySelector('pre') != null);
    expect(graph).not.toHaveBeenCalled();
    expect(analysis).not.toHaveBeenCalled();
    expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
  });

  it('hides dirty references and restores a saved revision in the same editor through existing reconciliation', async () => {
    await render({ editableFile: true });
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    const editor = container.querySelector('textarea')!;
    const next = `${fixture.file.content}\n-- edited`;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        editor,
        next
      );
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
    await act(async () => {
      await handle.current?.flush();
    });
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    expect(container.querySelector('textarea')).toBe(editor);
    expect(editor.value).toBe(next);
    expect(save).toHaveBeenCalledTimes(1);
    expect(graph.mock.calls.length).toBeGreaterThan(1);
    expect(
      container.querySelector('[data-slot="code-working-tree-status"]')?.getAttribute('data-phase')
    ).toBe('synchronized');
  });

  it('keeps cards hidden and exposes reconciliation failure after bytes persist', async () => {
    await render({ editableFile: true });
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    graph.mockRejectedValue(new Error('analysis offline'));
    const editor = container.querySelector('textarea')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        editor,
        `${fixture.file.content}\n-- edit`
      );
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await handle.current?.flush();
    });
    await waitFor(() => container.querySelector('[data-phase="reconciliation_failed"]') != null);
    expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('accepted file context query lifetime', () => {
  it('revalidates the project when returning to an unchanged file after another file changed', async () => {
    const first = contextFixture();
    const nextProject = DbtProjectGraphProjectionSchema.parse({
      ...first.project,
      analysisSha256: sha256HexUtf8('analysis after YAML edit'),
      projectRevision: {
        ...first.project.projectRevision,
        contentSetSha256: sha256HexUtf8('updated project'),
      },
    });
    let file = first.file;
    let finishReturn: ((projection: DbtProjectGraphProjection) => void) | undefined;
    const returning = new Promise<DbtProjectGraphProjection>((resolve) => {
      finishReturn = resolve;
    });
    const getProjectGraph = vi
      .fn()
      .mockResolvedValueOnce(first.project)
      .mockResolvedValueOnce(nextProject)
      .mockImplementationOnce(() => returning);
    let observed: ReturnType<typeof useCodeWorkspaceFileContext> | undefined;
    function Probe(): null {
      observed = useCodeWorkspaceFileContext({ file, project: undefined, allowed: true });
      return null;
    }
    const ui = (): JSX.Element => (
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          dbtProjectGraphQueryPort: { getProjectGraph },
        }}
      >
        <Probe />
      </AppServicesProvider>
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60_000 } },
    });
    const mounted = await withTestQueryClient(ui(), client);
    try {
      await waitForReactQuery(() => observed?.project === first.project);
      file = {
        ...first.file,
        path: 'inline_code_demo/models/schema.yml',
        name: 'schema.yml',
        language: 'yaml',
        content: 'version: 2',
        contentSha256: sha256HexUtf8('version: 2'),
      };
      await mounted.render(ui());
      await waitForReactQuery(() => observed?.project === nextProject);
      file = first.file;
      await mounted.render(ui());
      expect(getProjectGraph).toHaveBeenCalledTimes(3);
      expect(observed?.project).toBeUndefined();
      expect(observed?.status).toBe('checking');
      await act(async () => finishReturn?.(nextProject));
      await waitForReactQuery(
        () => observed?.project?.analysisSha256 === nextProject.analysisSha256
      );
      expect(observed?.project).toEqual(nextProject);
    } finally {
      finishReturn?.(nextProject);
      await mounted.cleanup();
    }
  });

  it('never sends an absent binding, even for an explicit refetch, and isolates revision keys', async () => {
    const getProjectGraph = vi.fn(async () => contextFixture().project);
    let observed: ReturnType<typeof useDbtProjectGraphQuery> | undefined;
    function Probe(): null {
      observed = useDbtProjectGraphQuery(undefined);
      return null;
    }
    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          dbtProjectGraphQueryPort: { getProjectGraph },
        }}
      >
        <Probe />
      </AppServicesProvider>
    );
    try {
      expect(getProjectGraph).not.toHaveBeenCalled();
      let failed = false;
      await act(async () => {
        failed = (await observed?.refetch())?.isError === true;
      });
      expect(failed).toBe(true);
      expect(getProjectGraph).not.toHaveBeenCalled();
      expect(
        queryKeys.workspace.dbtProjectGraph('t', 'p', 'dev', 'canvas', 'root', 'sha-a')
      ).not.toEqual(
        queryKeys.workspace.dbtProjectGraph('t', 'p', 'dev', 'canvas', 'root', 'sha-b')
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it('discards late graph results and cached context after changing file or revoking its binding', async () => {
    const first = contextFixture();
    const second = contextFixture(undefined, 'second');
    let file: FileContent = first.file;
    let resolveOld: ((project: typeof first.project) => void) | undefined;
    const old = new Promise<typeof first.project>((resolve) => {
      resolveOld = resolve;
    });
    const getProjectGraph = vi
      .fn()
      .mockImplementationOnce(() => old)
      .mockResolvedValue(second.project);
    let observed: ReturnType<typeof useCodeWorkspaceFileContext> | undefined;
    function Probe(): null {
      observed = useCodeWorkspaceFileContext({ file, project: undefined, allowed: true });
      return null;
    }
    const ui = (): JSX.Element => (
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          dbtProjectGraphQueryPort: { getProjectGraph },
        }}
      >
        <Probe />
      </AppServicesProvider>
    );
    const mounted = await withTestQueryClient(ui());
    try {
      await waitForReactQuery(() => getProjectGraph.mock.calls.length === 1);
      expect(observed?.status).toBe('checking');
      file = second.file;
      await mounted.render(ui());
      await waitForReactQuery(() => observed?.project === second.project);
      await act(async () => resolveOld?.(first.project));
      expect(observed?.project).toBe(second.project);
      file = {
        ...second.file,
        authoringAuthority: { kind: 'unresolved', reason: 'mixed_authority', canvasId: null },
      };
      await mounted.render(ui());
      expect(observed?.project).toBeUndefined();
      expect(observed?.reconcilePersistedFile).toBeUndefined();
      expect(observed?.status).toBe('unavailable');
      expect(getProjectGraph).toHaveBeenCalledTimes(2);
    } finally {
      await mounted.cleanup();
    }
  });

  it.each(['revoked', 'conflicting'] as const)(
    'rejects %s metadata instead of retaining an explicit project',
    async (mode) => {
      const fixture = contextFixture();
      const file: FileContent = {
        ...fixture.file,
        authoringAuthority:
          mode === 'revoked'
            ? { kind: 'unresolved', reason: 'missing_authority', canvasId: null }
            : {
                kind: 'resolved',
                binding: { ...fixture.project.authorityBinding, canvasId: 'different-canvas' },
              },
      };
      const getProjectGraph = vi.fn(async () => fixture.project);
      let observed: ReturnType<typeof useCodeWorkspaceFileContext> | undefined;
      function Probe(): null {
        observed = useCodeWorkspaceFileContext({ file, project: fixture.project, allowed: true });
        return null;
      }
      const mounted = await withTestQueryClient(
        <AppServicesProvider
          overrides={{
            ...createAppServicesTestOverrides(),
            dbtProjectGraphQueryPort: { getProjectGraph },
          }}
        >
          <Probe />
        </AppServicesProvider>
      );
      try {
        expect(observed?.status).toBe('unavailable');
        expect(observed?.project).toBeUndefined();
        expect(getProjectGraph).not.toHaveBeenCalled();
      } finally {
        await mounted.cleanup();
      }
    }
  );

  it('uses a separate graph query after a granted workspace change', async () => {
    const fixture = contextFixture();
    let scope: WorkspaceScope = {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      targetAdapter: 'temporal',
    };
    const subscribers = new Set<() => void>();
    const sessionContext: SessionContextPort = {
      getWorkspaceScope: () => scope,
      getWorkspaceScopeSnapshot: () => scope,
      subscribeWorkspaceScope: (fn) => {
        subscribers.add(fn);
        return () => {
          subscribers.delete(fn);
        };
      },
      buildRunContext: () => {
        throw new Error('Run is outside inspection.');
      },
    };
    const getProjectGraph = vi.fn(async () => fixture.project);
    function Probe(): null {
      useCodeWorkspaceFileContext({ file: fixture.file, project: undefined, allowed: true });
      return null;
    }
    const cache = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60_000 } },
    });
    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          sessionContext,
          dbtProjectGraphQueryPort: { getProjectGraph },
        }}
      >
        <Probe />
      </AppServicesProvider>,
      cache
    );
    try {
      await waitForReactQuery(() => getProjectGraph.mock.calls.length === 1);
      await act(async () => {
        scope = { ...scope, projectId: 'project-b' };
        subscribers.forEach((fn) => fn());
      });
      await waitForReactQuery(() => getProjectGraph.mock.calls.length === 2);
      expect(
        mounted.queryClient
          .getQueryCache()
          .getAll()
          .map((q) => q.queryKey)
      ).toEqual(
        expect.arrayContaining([
          queryKeys.workspace.dbtProjectGraph(
            'tenant-a',
            'project-a',
            'dev',
            fixture.project.authorityBinding.canvasId,
            'inline_code_demo',
            fixture.file.contentSha256
          ),
          queryKeys.workspace.dbtProjectGraph(
            'tenant-a',
            'project-b',
            'dev',
            fixture.project.authorityBinding.canvasId,
            'inline_code_demo',
            fixture.file.contentSha256
          ),
        ])
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it('keeps stale projections textual and does not treat query errors as fresh reconciliation', async () => {
    const fixture = contextFixture();
    const stale = { ...fixture.project, freshness: 'stale-last-valid' as const };
    const getProjectGraph = vi.fn(async () => stale);
    let observed: ReturnType<typeof useCodeWorkspaceFileContext> | undefined;
    function Probe(): null {
      observed = useCodeWorkspaceFileContext({
        file: fixture.file,
        project: undefined,
        allowed: true,
      });
      return null;
    }
    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          dbtProjectGraphQueryPort: { getProjectGraph },
        }}
      >
        <Probe />
      </AppServicesProvider>
    );
    try {
      await waitForReactQuery(() => observed?.project === stale);
      const receipt = {
        kind: 'unchanged' as const,
        disposition: null,
        path: fixture.file.path,
        contentSha256: fixture.file.contentSha256,
        lastModified: fixture.file.lastModified,
      };
      await expect(observed?.reconcilePersistedFile?.(receipt)).resolves.toEqual({
        kind: 'degraded',
        freshness: 'stale-last-valid',
      });
      getProjectGraph.mockRejectedValue(new Error('query denied'));
      await expect(observed?.reconcilePersistedFile?.(receipt)).rejects.toThrow('query denied');
    } finally {
      await mounted.cleanup();
    }
  });
});
