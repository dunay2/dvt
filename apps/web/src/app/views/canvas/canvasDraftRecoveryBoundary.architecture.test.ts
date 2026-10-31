import { promises as fsPromises, readdirSync, statSync, type Dirent } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readArchitectureSources } from '../../../testing/vitestSuites.architecture.support';
import {
  listCanvasSourceFiles,
  readAppSource,
  readRepoFile,
} from './canvasStartupAndDraftRecovery.architecture.support';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readdirSync: vi.fn(actual.readdirSync),
    statSync: vi.fn(actual.statSync),
  };
});

afterEach(async () => {
  vi.restoreAllMocks();
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  vi.mocked(readdirSync).mockReset().mockImplementation(actual.readdirSync);
  vi.mocked(statSync).mockReset().mockImplementation(actual.statSync);
});

function sourceEntry(name: string, kind: 'file' | 'directory' | 'symlink'): Dirent {
  return {
    name,
    isDirectory: () => kind === 'directory',
    isSymbolicLink: () => kind === 'symlink',
  } as Dirent;
}

describe('canvas draft recovery boundary architecture', () => {
  it('documents and guards protected-runtime token refresh and layout persistence semantics', () => {
    const authGuide = readRepoFile(
      'docs/architecture/components/web/frontend-data-boundary-architecture.md'
    );
    const layoutGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-layout-persistence-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md'
    );

    for (const guide of [authGuide, layoutGuide]) {
      expect(guide).toContain('## Public API');
      expect(guide).toContain('## Invariants');
      expect(guide).toContain('## Transitions');
      expect(guide).toContain('## Consumers');
      expect(guide).toContain('```mermaid');
    }
    expect(authGuide).toContain('VITE_API_BEARER_TOKEN_REFRESH_URL');
    expect(authGuide).toContain('401');
    expect(layoutGuide).toContain('drag-stop event payload');
    expect(layoutGuide).toContain('persistedNodePositions');

    expect(userStories).toContain('US-CANVAS-AUTH-001');
    expect(userStories).toContain('US-CANVAS-AUTH-002');
    expect(userStories).toContain('US-CANVAS-LAYOUT-001');
    expect(userStories).toContain('US-CANVAS-LAYOUT-003');

    const apiAuthSource = readAppSource('../../services/api/apiAuthConfig.ts');
    const apiClientSource = readAppSource('../../services/api/createApiClient.ts');
    const layoutPersistenceSource = readAppSource('useCanvasLayoutPersistence.ts');
    const controllerSource = readAppSource('useCanvasController.ts');

    expect(apiAuthSource).toContain('resolveApiBearerTokenForRequest');
    expect(apiAuthSource).toContain('VITE_API_BEARER_TOKEN_REFRESH_URL');
    expect(apiAuthSource).toContain('isExpiredOrExpiring');
    expect(apiClientSource).toContain('dispatchRequest(true)');
    expect(apiClientSource).toContain('canRetryRequestBody');

    expect(layoutPersistenceSource).toContain('function useCanvasNodePositionPersistence(');
    expect(layoutPersistenceSource).toContain('function useCanvasViewportPersistenceHandler(');
    expect(layoutPersistenceSource).toContain(
      'mergeDraggedNodePosition([...nodes, ...draggedNodes], draggedNode)'
    );
    expect(layoutPersistenceSource).not.toContain('workspaceGraphDraftAuthoringPort');
    expect(layoutPersistenceSource).not.toContain('saveGraphDraft');
    expect(readAppSource('canvasDraftLayoutHydrationPolicy.ts')).toContain(
      'function shouldSeedCanvasLayoutFromRemoteDraft('
    );
    expect(controllerSource).toContain('nodes: graphModel.nodes');
    expect(controllerSource).toContain('persistedNodePositions: store.persistedNodePositions');
  });

  it('keeps projection and replacement command decisions behind named semantic helpers', () => {
    const projectionSource = readAppSource(
      '../../services/workspace/workspaceGraphDraftProjection.ts'
    );
    const snapshotProjectionSource = readAppSource(
      '../../services/workspace/workspaceGraphDraftSnapshotProjection.ts'
    );
    const createCommandSource = readAppSource('canvasCreateCanvasDocumentCommand.ts');
    const createCommandPolicySource = readAppSource('canvasCreateCanvasDocumentCommandPolicy.ts');
    const createCommandSaveResultSource = readAppSource('canvasCreateCanvasDocumentSaveResult.ts');

    expect(projectionSource).toContain('function buildCanonicalEdgeProjection(');
    expect(projectionSource).not.toContain('DBT_NODE_TYPE_RULES');
    expect(projectionSource).not.toContain('DbtNodeType');

    expect(snapshotProjectionSource).toContain('const DBT_NODE_TYPE_RULES');
    expect(snapshotProjectionSource).toContain('function matchesDbtNodeTypeRule(');
    expect(snapshotProjectionSource).toContain('function projectCanonicalNodeToDbtNode(');

    expect(createCommandPolicySource).toContain(
      'function resolveCreateCanvasDocumentCommandEligibility('
    );
    expect(createCommandPolicySource).toContain('function buildBlankCanvasDocumentDraftInput(');
    expect(createCommandSaveResultSource).toContain('function applyCanvasDocumentSaveSuccess(');
    expect(createCommandSaveResultSource).toContain('function applyCanvasDocumentSaveConflict(');
    expect(createCommandSource).not.toContain(
      'function resolveCreateCanvasDocumentCommandEligibility('
    );
  });

  it('keeps Canvas authoring draft persistence on aggregate-native types', async () => {
    const canvasFiles = listCanvasSourceFiles();
    const explicitPaths = [
      '../../ports/workspace.ts',
      '../../services/workspace/workspacePorts.ts',
      'canvasDraftRepository.ts',
      'canvasDraftAuthoring.ts',
      'canvasDraftStructuralSignature.ts',
    ].map((relativePath) => path.resolve(import.meta.dirname, relativePath));
    const sourcePaths = [
      ...new Set([
        ...explicitPaths,
        ...canvasFiles.map((relativePath) => path.resolve(import.meta.dirname, relativePath)),
      ]),
    ];
    const read = vi.spyOn(fsPromises, 'readFile');
    const sources = await readArchitectureSources(sourcePaths);
    expect([...sources.keys()]).toEqual(sourcePaths);
    expect(read).toHaveBeenCalledTimes(sourcePaths.length);
    const [
      workspacePortSource,
      workspacePortsSource,
      repositorySource,
      authoringSource,
      structuralSignatureSource,
    ] = explicitPaths.map((filePath) => sources.get(filePath));

    for (const retiredExport of [
      'export type WorkspaceGraphDraft',
      'export type WorkspaceGraphDraftRecord',
      'export type SaveWorkspaceGraphDraftInput',
      'export type SaveWorkspaceGraphDraftResult',
    ]) {
      expect(workspacePortSource).not.toContain(retiredExport);
      expect(workspacePortsSource).not.toContain(retiredExport.replace('export type ', ''));
    }

    expect(repositorySource).toContain('draft: WorkspaceGraphAuthoringDraft');
    expect(repositorySource).not.toContain('CanvasDraftAuthoringPayload');
    expect(repositorySource).not.toContain('buildCanvasDraftAuthoringGraph');
    expect(repositorySource).not.toContain('projectedDraft');

    expect(authoringSource).not.toContain('CanvasDraftAuthoringPayload');
    expect(authoringSource).not.toContain('projectedDraft');
    expect(authoringSource).not.toContain("from '../../ports/workspace'");
    expect(structuralSignatureSource).toContain('WorkspaceGraphAuthoringDraft');
    expect(structuralSignatureSource).not.toContain('WorkspaceGraphDraft');

    const bannedWorkspaceDraftImport =
      /import\s+type\s+\{[^}]*\b(?:WorkspaceGraphDraft|WorkspaceGraphDraftRecord)\b[^}]*\}\s+from\s+['"]\.\.\/\.\.\/ports\/workspace['"]/;
    for (const relativePath of canvasFiles) {
      const source = sources.get(path.resolve(import.meta.dirname, relativePath));
      expect(source, relativePath).not.toMatch(bannedWorkspaceDraftImport);
    }
  });

  it('keeps canvas node viewport projection options behind a named argument object', () => {
    const mapperSource = readAppSource('canvasNodeMapper.ts');

    expect(mapperSource).toContain('type MapCanonicalNodeToCanvasNodeArgs = {');
    expect(mapperSource).toContain('export function mapCanonicalNodeToCanvasNode({');
    expect(mapperSource).toContain('}: MapCanonicalNodeToCanvasNodeArgs): Node<DbtNodeData>');
    expect(mapperSource).not.toContain('canonicalNode: CanonicalNode,\n  index: number,');
  });

  it('keeps first-canvas and recovery banner HTML behind passive templates', () => {
    const hostSource = readAppSource('CanvasPlaygroundHost.tsx');
    const hostTemplateSource = readAppSource('CanvasPlaygroundHost.templates.tsx');
    const recoveryBannerSource = readAppSource('CanvasRecoveryBanner.tsx');
    const recoveryModelSource = readAppSource('canvasRecoveryBannerModel.ts');
    const recoveryTemplateSource = readAppSource('CanvasRecoveryBanner.templates.tsx');

    expect(hostSource).toContain("from './CanvasPlaygroundHost.templates'");
    expect(hostSource).toContain('onCreateCanvas');
    expect(hostSource).not.toContain('<div');
    expect(hostSource).not.toContain('Button');
    expect(hostSource).not.toContain('Card');
    expect(hostTemplateSource).toContain('function CanvasPlaygroundHostTemplate(');
    expect(hostTemplateSource).not.toContain('CanvasCreateCanvasDocumentCommand');
    expect(hostTemplateSource).not.toContain('canvasViewCopy');

    expect(recoveryBannerSource).toContain("from './canvasRecoveryBannerModel'");
    expect(recoveryBannerSource).toContain("from './CanvasRecoveryBanner.templates'");
    expect(recoveryBannerSource).not.toContain('<div');
    expect(recoveryBannerSource).not.toContain('Button');
    expect(recoveryBannerSource).not.toContain('canvasViewCopy');
    expect(recoveryModelSource).toContain('function resolveCanvasRecoveryBannerViewState(');
    expect(recoveryModelSource).not.toContain('JSX.Element');
    expect(recoveryTemplateSource).toContain('function CanvasRecoveryBannerTemplate(');
    expect(recoveryTemplateSource).not.toContain('CanvasDraftPresentationState');
    expect(recoveryTemplateSource).not.toContain('canvasViewCopy');
  });
});

describe('Canvas source inventory', () => {
  it('retains nested TypeScript, tests, and sorted paths without stat calls for normal entries', () => {
    const root = import.meta.dirname;
    const tree = new Map<string, Dirent[]>([
      [
        root,
        [
          sourceEntry('z.tsx', 'file'),
          sourceEntry('nested', 'directory'),
          sourceEntry('ignored.md', 'file'),
          sourceEntry('boundary.architecture.test.ts', 'file'),
          sourceEntry('a.ts', 'file'),
        ],
      ],
      [
        path.join(root, 'nested'),
        [sourceEntry('inner.ts', 'file'), sourceEntry('deeper', 'directory')],
      ],
      [path.join(root, 'nested/deeper'), [sourceEntry('fixture.test.tsx', 'file')]],
    ]);
    vi.mocked(readdirSync).mockImplementation((directory, options) => {
      expect(options).toEqual({ withFileTypes: true });
      const entries = tree.get(String(directory));
      if (entries === undefined) throw new Error(`Unexpected directory: ${String(directory)}`);
      return entries as unknown as ReturnType<typeof readdirSync>;
    });

    expect(listCanvasSourceFiles()).toEqual([
      'a.ts',
      'boundary.architecture.test.ts',
      'nested/deeper/fixture.test.tsx',
      'nested/inner.ts',
      'z.tsx',
    ]);
    expect(readdirSync).toHaveBeenCalledTimes(3);
    expect(statSync).not.toHaveBeenCalled();
  });

  it('follows directory and file symlinks using metadata only for those links', () => {
    const root = import.meta.dirname;
    vi.mocked(readdirSync).mockImplementation((directory, options) => {
      expect(options).toEqual({ withFileTypes: true });
      return (String(directory) === root
        ? [
            sourceEntry('linked', 'symlink'),
            sourceEntry('linked.ts', 'symlink'),
            sourceEntry('a.ts', 'file'),
          ]
        : [sourceEntry('nested.tsx', 'file')]) as unknown as ReturnType<typeof readdirSync>;
    });
    vi.mocked(statSync).mockImplementation(
      (file) =>
        ({ isDirectory: () => String(file) === path.join(root, 'linked') }) as ReturnType<
          typeof statSync
        >
    );

    expect(listCanvasSourceFiles()).toEqual(['a.ts', 'linked.ts', 'linked/nested.tsx']);
    expect(readdirSync).toHaveBeenCalledTimes(2);
    expect(vi.mocked(statSync).mock.calls.map(([file]) => String(file))).toEqual([
      path.join(root, 'linked'),
      path.join(root, 'linked.ts'),
    ]);
  });

  it('propagates directory enumeration failure', () => {
    const failure = new Error('Directory read denied');
    vi.mocked(readdirSync).mockImplementation(() => {
      throw failure;
    });
    expect(() => listCanvasSourceFiles()).toThrow(failure);
    expect(statSync).not.toHaveBeenCalled();
  });

  it('propagates symlink metadata failure', () => {
    const failure = new Error('Symlink metadata denied');
    vi.mocked(readdirSync).mockReturnValue([
      sourceEntry('linked', 'symlink'),
    ] as unknown as ReturnType<typeof readdirSync>);
    vi.mocked(statSync).mockImplementation(() => {
      throw failure;
    });
    expect(() => listCanvasSourceFiles()).toThrow(failure);
  });
});
