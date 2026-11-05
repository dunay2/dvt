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
import { contextFixture } from './codeWorkspaceFileContext.test-support';

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
    directFile = false,
    dbtProject,
    compileAfterOpen = false,
  }: Readonly<{
    editableFile?: boolean;
    directFile?: boolean;
    dbtProject?: DbtProjectGraphProjection;
    compileAfterOpen?: boolean;
  }> = {}): Promise<void> => {
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
        {editableFile || directFile ? (
          <WorkspaceFileCodeEditor
            ref={handle}
            access={editableFile ? 'editable' : 'read-only'}
            authority="dbt-project-files"
            path={fixture.file.path}
            dbtProject={dbtProject}
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
    if (compileAfterOpen) {
      await waitForReactQuery(
        () =>
          container.querySelector<HTMLButtonElement>('[data-slot="code-compile-model"]')
            ?.disabled === false
      );
      await act(async () =>
        container.querySelector<HTMLButtonElement>('[data-slot="code-compile-model"]')?.click()
      );
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
    await waitFor(() => container.querySelector('[data-testid="code-file-viewer"]') !== null);
    expect(analysis).not.toHaveBeenCalled();
    await waitFor(
      () =>
        container.querySelector<HTMLButtonElement>('[data-slot="code-compile-model"]')?.disabled ===
        false
    );
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-slot="code-compile-model"]')?.click()
    );
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

  it('reuses compiled evidence when returning to a file without compiling on navigation', async () => {
    const original = fixture.file;
    await render({ directFile: true, compileAfterOpen: true });
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    fixture.file = {
      ...original,
      path: 'inline_code_demo/models/other.sql',
      name: 'other.sql',
      content: 'select 1',
      contentSha256: sha256HexUtf8('select 1'),
    };
    await render({ directFile: true });
    await waitFor(() => container.querySelector('pre')?.textContent === 'select 1');
    expect(analysis).toHaveBeenCalledTimes(1);
    fixture.file = original;
    await render({ directFile: true });
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    expect(container.textContent).toContain(
      resolveCodeInlineReferenceCopy('en-US').compiledMessage
    );
    expect(analysis).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('shows compilation progress, prevents duplicate clicks and retries only on request', async () => {
    let rejectCompilation: ((error: Error) => void) | undefined;
    analysis.mockImplementationOnce(
      () =>
        new Promise<DbtSelectedModelAnalysis>((_resolve, reject) => {
          rejectCompilation = reject;
        })
    );
    const copy = resolveCodeInlineReferenceCopy('en-US');
    await render({ directFile: true, compileAfterOpen: true });
    await waitFor(() => container.textContent?.includes(copy.compilingMessage) === true);
    const button = container.querySelector<HTMLButtonElement>('[data-slot="code-compile-model"]');
    expect(button?.disabled).toBe(true);
    await act(async () => button?.click());
    expect(analysis).toHaveBeenCalledTimes(1);
    await act(async () => rejectCompilation?.(new Error('Native compilation failed')));
    await waitFor(() => container.textContent?.includes(copy.unavailableMessage) === true);
    expect(button?.disabled).toBe(false);
    expect(analysis).toHaveBeenCalledTimes(1);
    await act(async () => button?.click());
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    expect(analysis).toHaveBeenCalledTimes(2);
  });

  it('requires explicit compilation after a dependency revision changes without changing this file', async () => {
    await render({ directFile: true, compileAfterOpen: true });
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    fixture.project = DbtProjectGraphProjectionSchema.parse({
      ...fixture.project,
      analysisSha256: 'c'.repeat(64),
      projectRevision: { ...fixture.project.projectRevision, contentSetSha256: 'd'.repeat(64) },
    });
    fixture.analysis = DbtSelectedModelAnalysisSchema.parse({
      ...fixture.analysis,
      analysisSha256: fixture.project.analysisSha256,
      projectRevision: fixture.project.projectRevision,
    });
    await act(async () =>
      client.refetchQueries({ queryKey: queryKeys.workspace.dbtProjectGraphRoot() })
    );
    await waitFor(
      () =>
        container.textContent?.includes(
          resolveCodeInlineReferenceCopy('en-US').pendingCompilationMessage
        ) === true
    );
    expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
    expect(analysis).toHaveBeenCalledTimes(1);
    await render({ directFile: true, compileAfterOpen: true });
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    expect(analysis).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['schema.yml', 'yaml'],
    ['schema.yaml', 'YAML'],
    ['manifest.json', 'json'],
    ['README.md', 'markdown'],
  ])('reads %s without reference queries or reference status', async (name, language) => {
    fixture.file = { ...fixture.file, path: `inline_code_demo/${name}`, name, language };
    await render();
    await waitFor(() => container.querySelector('[data-testid="code-file-viewer"]') != null);
    expect(container.querySelector('pre')?.textContent).toBe(fixture.file.content);
    expect(container.querySelector('[data-phase="read_only"]')).not.toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
    expect(graph).not.toHaveBeenCalled();
    expect(analysis).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    const copy = resolveCodeInlineReferenceCopy('en-US');
    expect(container.textContent).not.toContain(copy.checkingMessage);
    expect(container.textContent).not.toContain(copy.unavailableMessage);
  });

  it.each(['discovered', 'provided'] as const)(
    'reads plain SQL with %s project context without reference queries or status',
    async (context) => {
      fixture = contextFixture('select client_id, country from raw.client');
      await render({
        directFile: context === 'provided',
        dbtProject: context === 'provided' ? fixture.project : undefined,
      });
      await waitFor(() => container.querySelector('[data-testid="code-file-viewer"]') != null);
      expect(container.querySelector('pre')?.textContent).toBe(fixture.file.content);
      expect(container.querySelector('[data-phase="read_only"]')).not.toBeNull();
      expect(container.querySelector('textarea')).toBeNull();
      expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(graph).not.toHaveBeenCalled();
      expect(analysis).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
      const copy = resolveCodeInlineReferenceCopy('en-US');
      expect(container.textContent).not.toContain(copy.checkingMessage);
      expect(container.textContent).not.toContain(copy.unavailableMessage);
    }
  );

  it('keeps SQL eligibility case insensitive for a server-selected model', async () => {
    fixture.file.language = 'SQL';
    await render({ compileAfterOpen: true });
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    expect(graph).toHaveBeenCalledTimes(1);
    expect(analysis).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it.each([
    ['late', 'YAML'],
    ['cached', 'YAML'],
    ['late', 'plain SQL'],
    ['cached', 'plain SQL'],
  ] as const)('ignores %s SQL evidence after selecting %s', async (mode, target) => {
    const first = { ...fixture };
    let finishGraph: ((projection: DbtProjectGraphProjection) => void) | undefined;
    const pending = new Promise<DbtProjectGraphProjection>((resolve) => {
      finishGraph = resolve;
    });
    if (mode === 'late') graph.mockImplementationOnce(() => pending);
    try {
      await render({ directFile: true, compileAfterOpen: mode === 'cached' });
      await waitFor(() => graph.mock.calls.length === 1);
      if (mode === 'cached')
        await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
      fixture.file =
        target === 'YAML'
          ? {
              ...first.file,
              path: 'inline_code_demo/models/schema.yml',
              name: 'schema.yml',
              language: 'yaml',
            }
          : {
              ...contextFixture('select client_id, country from raw.client').file,
              path: 'inline_code_demo/models/clientes.sql',
              name: 'clientes.sql',
            };
      const targetFile = fixture.file;
      await render({ directFile: true });
      await act(async () => finishGraph?.(first.project));
      await waitFor(() => container.querySelector('pre')?.textContent === targetFile.content);
      await waitFor(() => client.isFetching() === 0);
      expect(container.querySelector('pre')?.textContent).toBe(targetFile.content);
      expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(container.querySelector('[data-phase="read_only"]')).not.toBeNull();
      const copy = resolveCodeInlineReferenceCopy('en-US');
      expect(container.textContent).not.toContain(copy.checkingMessage);
      expect(container.textContent).not.toContain(copy.unavailableMessage);
      expect(graph).toHaveBeenCalledTimes(1);
      expect(analysis).toHaveBeenCalledTimes(mode === 'late' ? 0 : 1);
      expect(save).not.toHaveBeenCalled();
    } finally {
      await act(async () => finishGraph?.(first.project));
    }
  });

  it('keeps checking, ready, and unavailable in the same read-only status band', async () => {
    const copy = resolveCodeInlineReferenceCopy('en-US');
    let finishGraph: ((projection: DbtProjectGraphProjection) => void) | undefined;
    const pending = new Promise<DbtProjectGraphProjection>((resolve) => {
      finishGraph = resolve;
    });
    graph.mockImplementationOnce(() => pending);
    try {
      await render();
      await waitFor(() => container.textContent?.includes(copy.contextCheckingMessage) === true);
      const band = container.querySelector('[data-slot="code-working-tree-status"]');
      const viewer = container.querySelector('[data-testid="code-file-viewer"]');
      expect(band?.textContent).toContain(copy.contextCheckingMessage);
      expect(band?.getAttribute('data-phase')).toBe('read_only');
      await act(async () => finishGraph?.(fixture.project));
      await render({ compileAfterOpen: true });
      await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
      expect(container.querySelector('[data-slot="code-working-tree-status"]')).toBe(band);
      expect(band?.textContent).toContain(copy.compiledMessage);
      graph.mockRejectedValueOnce(new Error('Project analysis is unavailable.'));
      await act(async () =>
        client.refetchQueries({ queryKey: queryKeys.workspace.dbtProjectGraphRoot() })
      );
      await waitFor(() => band?.textContent?.includes(copy.unavailableMessage) === true);
      expect(container.querySelector('[data-slot="code-working-tree-status"]')).toBe(band);
      expect(container.querySelector('[data-testid="code-file-viewer"]')).toBe(viewer);
      expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(save).not.toHaveBeenCalled();
    } finally {
      await act(async () => finishGraph?.(fixture.project));
    }
  });

  it('withholds cached authority and definition while the file read is being revalidated', async () => {
    const inlineCopy = resolveCodeInlineReferenceCopy('en-US');
    await render({ compileAfterOpen: true });
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
      expect(container.textContent).toContain(inlineCopy.contextCheckingMessage);
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
      await waitFor(() => !container.textContent?.includes(inlineCopy.contextCheckingMessage));
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
    await render({ compileAfterOpen: true });
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toBe(fixture.file.content);
    expect(save).not.toHaveBeenCalled();
    expect(container.querySelector('[data-phase="read_only"]')).not.toBeNull();
  });

  it('compiles a server-authorized file reference without claiming its SQL as graph-generated', async () => {
    graphSnapshot = Promise.resolve({
      authoringAuthority: mockGraphDraftAuthoringAuthority,
      nodes: [
        {
          id: 'placed-model',
          name: 'ventas',
          type: 'MODEL',
          package: 'dvt',
          path: fixture.file.path,
          tags: [],
          status: 'idle',
          dependencies: [],
          metadata: {
            dbtModelReference: {
              schemaVersion: 'workspace-dbt-model-reference.v1',
              canvasId: fixture.project.authorityBinding.canvasId,
              uniqueId: 'model.demo.ventas',
              relationId: 'reference-relation',
              connectionRef: {
                schemaVersion: 'connection-ref.v1',
                provider: 'postgres',
                connectionId: 'warehouse',
              },
              fields: [
                { fieldId: 'client-field', name: 'client_id', dataType: 'text', nullable: true },
              ],
            },
          },
        },
      ],
      edges: [],
    });
    await render({ compileAfterOpen: true });
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    expect(analysis).toHaveBeenCalledTimes(1);
    expect(container.querySelector('textarea')).toBeNull();
    expect(save).not.toHaveBeenCalled();
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
    await render({ editableFile: true, compileAfterOpen: true });
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
    await waitFor(
      () =>
        container.textContent?.includes(
          resolveCodeInlineReferenceCopy('en-US').pendingCompilationMessage
        ) === true
    );
    expect(analysis).toHaveBeenCalledTimes(1);
    await render({ editableFile: true, compileAfterOpen: true });
    await waitFor(() => container.querySelectorAll('[data-reference]').length === 2);
    expect(container.querySelector('textarea')).toBe(editor);
    expect(editor.value).toBe(next);
    expect(save).toHaveBeenCalledTimes(1);
    expect(graph.mock.calls.length).toBeGreaterThan(1);
    expect(
      container.querySelector('[data-slot="code-working-tree-status"]')?.getAttribute('data-phase')
    ).toBe('synchronized');
  });

  it.each([
    ['YAML', 'models/schema.yml', 'yaml', 'version: 2', '# accepted legacy edit'],
    ['plain SQL', 'models/ventas.sql', 'sql', 'select 1 as value', '-- accepted legacy edit'],
  ] as const)(
    'reconciles an accepted legacy %s edit without automatic reference work',
    async (_kind, path, language, content, comment) => {
      fixture.file = {
        ...fixture.file,
        path: `inline_code_demo/${path}`,
        name: path.split('/').at(-1)!,
        language,
        content,
        contentSha256: sha256HexUtf8(content),
      };
      await render({ editableFile: true });
      await waitFor(() => container.querySelector('textarea') != null);
      expect(graph).not.toHaveBeenCalled();
      const editor = container.querySelector('textarea')!;
      const next = `${content}\n${comment}`;
      save.mockImplementationOnce(async (input) => {
        fixture.file = {
          ...fixture.file,
          content: input.content,
          contentSha256: sha256HexUtf8(input.content),
        };
        fixture.project = DbtProjectGraphProjectionSchema.parse({
          ...fixture.project,
          analysisSha256: sha256HexUtf8(`analysis:${input.content}`),
          projectRevision: {
            ...fixture.project.projectRevision,
            contentSetSha256: sha256HexUtf8(input.content),
          },
        });
        return {
          kind: 'saved' as const,
          disposition: 'updated' as const,
          path: input.path,
          contentSha256: fixture.file.contentSha256,
          lastModified: fixture.file.lastModified,
        };
      });
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
          editor,
          next
        );
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        await handle.current?.flush();
      });
      await waitFor(() => container.querySelector('[data-phase="synchronized"]') != null);
      expect(container.querySelector('textarea')).toBe(editor);
      expect(editor.value).toBe(next);
      expect(save).toHaveBeenCalledTimes(1);
      expect(graph).toHaveBeenCalledTimes(1);
      expect(analysis).not.toHaveBeenCalled();
      expect(container.querySelectorAll('[data-reference]')).toHaveLength(0);
    }
  );

  it('keeps cards hidden and exposes reconciliation failure after bytes persist', async () => {
    await render({ editableFile: true, compileAfterOpen: true });
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
  it('does not retry a rejected graph analysis automatically and permits explicit recovery', async () => {
    const { project } = contextFixture();
    const authority = project.authorityBinding.authority;
    if (authority.kind !== 'dbt-project-files') throw new Error('Expected file-backed fixture.');
    const binding = { ...project.authorityBinding, authority };
    const failure = new Error('Project graph analysis request failed.');
    const getProjectGraph = vi.fn(async () => project).mockRejectedValue(failure);
    let observed: ReturnType<typeof useDbtProjectGraphQuery> | undefined;
    function Probe(): null {
      observed = useDbtProjectGraphQuery(binding);
      return null;
    }
    const client = new QueryClient({
      defaultOptions: { queries: { retry: 1, retryDelay: 0 } },
    });
    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          dbtProjectGraphQueryPort: { getProjectGraph },
        }}
      >
        <Probe />
      </AppServicesProvider>,
      client
    );
    try {
      await waitForReactQuery(() => observed?.isError === true);
      expect(observed?.error).toBe(failure);
      expect(getProjectGraph).toHaveBeenCalledTimes(1);
      getProjectGraph.mockResolvedValue(project);
      await act(async () => {
        await observed?.refetch();
      });
      await waitForReactQuery(() => observed?.isSuccess === true);
      expect(observed?.data).toEqual(project);
      expect(getProjectGraph).toHaveBeenCalledTimes(2);
    } finally {
      await mounted.cleanup();
    }
  });

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
      expect(observed?.project).toBeUndefined();
      expect(observed?.status).toBe('inactive');
      expect(getProjectGraph).toHaveBeenCalledTimes(1);
      file = first.file;
      await mounted.render(ui());
      expect(getProjectGraph).toHaveBeenCalledTimes(2);
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
