import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import type { CanonicalNode } from '../../types/canonical';

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../../..');

export const RETIRED_ROUTE_SHIM_TERM_PATTERNS = [
  String.raw`\b${'leg'}${'acy'}\b`,
  String.raw`${'back'}ward ${'compati'}${'bility'}`,
  String.raw`\b${'compati'}${'bility'}\b`,
  String.raw`@${'depre'}${'cated'}`,
];

export const ownedConcernModules = [
  {
    label: 'route bootstrap contract',
    path: '../../bootstrap/routeBootstrapContract.ts',
    phrase: 'Owned concern: define route bootstrap handles and helper factories',
  },
  {
    label: 'workspace draft HTTP boundary',
    path: '../../services/workspace/workspaceGraphDraftHttp.ts',
    phrase: 'Owned concern: centralize workspace graph draft HTTP endpoint',
  },
  {
    label: 'workspace draft API port adapter',
    path: '../../services/workspace/workspaceGraphDraftAuthoring.api.ts',
    phrase: 'Owned concern: adapt the workspace graph draft authoring port',
  },
  {
    label: 'frontend API auth config',
    path: '../../services/api/apiAuthConfig.ts',
    phrase: 'Owned concern: resolve explicit API bearer-token posture',
  },
  {
    label: 'frontend API client',
    path: '../../services/api/createApiClient.ts',
    phrase: 'Owned concern: create typed frontend API clients',
  },
  {
    label: 'workspace service API snapshot projection',
    path: '../../services/workspace/workspacePorts.api.ts',
    phrase: 'Owned concern: adapt workspace capability ports',
  },
  {
    label: 'workspace draft DBT snapshot projection',
    path: '../../services/workspace/workspaceGraphDraftSnapshotProjection.ts',
    phrase: 'Owned concern: project workspace graph semantic truth into DBT-shaped graph snapshots',
  },
  {
    label: 'canvas node mapper',
    path: 'canvasNodeMapper.ts',
    phrase: 'Owned concern: project canonical graph primitives into React Flow nodes',
  },
  {
    label: 'canvas graph lifecycle node component',
    path: 'canvasGraphLifecycle.node.ts',
    phrase: 'Owned concern: own Canvas node lifecycle transitions',
  },
  {
    label: 'canvas graph lifecycle contracts',
    path: 'canvasGraphLifecycle.types.ts',
    phrase: 'Owned concern: define Canvas graph lifecycle contracts',
  },
  {
    label: 'canvas layout persistence component',
    path: 'useCanvasLayoutPersistence.ts',
    phrase: 'Owned concern: persist Canvas viewport and node-layout observations',
  },
  {
    label: 'canvas draft layout hydration policy',
    path: 'canvasDraftLayoutHydrationPolicy.ts',
    phrase:
      'Owned concern: decide when remote draft coordinates may seed local Canvas layout persistence',
  },
  {
    label: 'canvas viewport graph model',
    path: 'useCanvasViewportGraphModel.ts',
    phrase: 'Owned concern: project semantic authoring truth into React Flow viewport state',
  },
  {
    label: 'create canvas command policy',
    path: 'canvasCreateCanvasDocumentCommandPolicy.ts',
    phrase: 'Owned concern: decide create-canvas document CAS eligibility',
  },
  {
    label: 'create canvas command save result',
    path: 'canvasCreateCanvasDocumentSaveResult.ts',
    phrase: 'Owned concern: apply authoritative create-canvas save outcomes',
  },
  {
    label: 'canvas playground host templates',
    path: 'CanvasPlaygroundHost.templates.tsx',
    phrase: 'Owned concern: render Canvas playground first-document host templates',
  },
  {
    label: 'canvas recovery banner model',
    path: 'canvasRecoveryBannerModel.ts',
    phrase: 'Owned concern: resolve Canvas recovery-banner state',
  },
  {
    label: 'canvas recovery banner templates',
    path: 'CanvasRecoveryBanner.templates.tsx',
    phrase: 'Owned concern: render Canvas recovery-banner templates',
  },
  {
    label: 'canvas draft auth transport posture',
    path: 'canvasDraftAuthTransportPosture.ts',
    phrase: 'Owned concern: normalize protected Canvas draft query auth transport failures',
  },
  {
    label: 'canvas draft access posture model',
    path: 'canvasDraftAccessPostureModel.ts',
    phrase: 'Owned concern: resolve protected Canvas draft access into one route-visible posture',
  },
  {
    label: 'canvas draft access recovery template',
    path: 'CanvasDraftAccessRecovery.templates.tsx',
    phrase: 'Owned concern: render passive Canvas draft-access recovery actions',
  },
  {
    label: 'canvas draft status state',
    path: 'canvasDraftStatusState.ts',
    phrase: 'Owned concern: resolve Canvas draft recovery reasons and status labels',
  },
  {
    label: 'DVT node renderer',
    path: '../../components/canvas/DbtNodeComponent.tsx',
    phrase: 'Owned concern: render canonical Canvas nodes',
  },
] as const;

export function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

export function repoFileExists(relativePath: string): boolean {
  return existsSync(path.join(REPO_ROOT, relativePath));
}

export function readAppSource(relativePathFromCanvas: string): string {
  return readFileSync(path.resolve(import.meta.dirname, relativePathFromCanvas), 'utf8');
}

export function listCanvasSourceFiles(): string[] {
  const canvasRoot = import.meta.dirname;
  const files: string[] = [];

  function visit(directory: string): void {
    for (const entry of readdirSync(directory)) {
      const absolutePath = path.join(directory, entry);
      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        visit(absolutePath);
        continue;
      }

      if (!/\.(?:ts|tsx)$/.test(entry)) {
        continue;
      }

      files.push(path.relative(canvasRoot, absolutePath).replace(/\\/g, '/'));
    }
  }

  visit(canvasRoot);
  return files.sort();
}

export function buildCanonicalNode(id: string): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
  };
}
