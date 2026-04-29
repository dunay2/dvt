import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createFailedRouteBootstrapPresentation } from '../../bootstrap/routeBootstrapContract';
import {
  buildWorkspaceGraphDraftEndpoint,
  WORKSPACE_GRAPH_DRAFT_ENDPOINT,
} from '../../services/workspace/workspaceGraphDraftHttp';
import type { CanonicalNode } from '../../types/canonical';
import {
  CANVAS_NODE_DRAG_HANDLE_SELECTOR,
  mapCanonicalNodeToCanvasNode,
  mapDroppedCanonicalNodeToCanvasNode,
} from './canvasNodeMapper';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../../..');
const RETIRED_ROUTE_SHIM_TERM_PATTERNS = [
  String.raw`\b${'leg'}${'acy'}\b`,
  String.raw`${'back'}ward ${'compati'}${'bility'}`,
  String.raw`\b${'compati'}${'bility'}\b`,
  String.raw`@${'depre'}${'cated'}`,
];

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function repoFileExists(relativePath: string): boolean {
  return existsSync(path.join(REPO_ROOT, relativePath));
}

function readAppSource(relativePathFromCanvas: string): string {
  return readFileSync(path.resolve(import.meta.dirname, relativePathFromCanvas), 'utf8');
}

const ownedConcernModules = [
  {
    label: 'route bootstrap contract',
    path: '../../bootstrap/routeBootstrapContract.ts',
    phrase: 'Owned concern: define route bootstrap presentation statuses',
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
    label: 'workspace service API snapshot projection',
    path: '../../services/workspace/workspaceService.api.ts',
    phrase: 'Owned concern: adapt the workspace service port',
  },
  {
    label: 'canvas node mapper',
    path: 'canvasNodeMapper.ts',
    phrase: 'Owned concern: project canonical graph primitives into React Flow nodes',
  },
  {
    label: 'canvas tab-strip replacement model',
    path: 'canvasPlaygroundTabStripModel.ts',
    phrase: 'Owned concern: resolve Canvas playground tab-strip replacement policy',
  },
  {
    label: 'canvas tab-strip presentation templates',
    path: 'CanvasPlaygroundTabStrip.templates.tsx',
    phrase: 'Owned concern: render Canvas playground tab-strip presentation templates',
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
    label: 'DVT node renderer',
    path: '../../components/canvas/DbtNodeComponent.tsx',
    phrase: 'Owned concern: render canonical Canvas nodes',
  },
] as const;

function buildCanonicalNode(id: string): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:sql_transform',
    role: 'transform',
    status: 'idle',
    tags: [],
  };
}

describe('canvas startup and draft recovery architecture', () => {
  it('documents the Fowler analysis and local component guide for the branch semantics', () => {
    const mailbox = readRepoFile(
      'buzon/20260428-codex-fowler-web-graph-startup-and-draft-recovery-analysis.md'
    );
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md'
    );

    expect(mailbox).toContain('## Fowler verdict');
    expect(mailbox).toContain('## Antipatterns detected');
    expect(mailbox).toContain('## Drift fixed');
    expect(mailbox).toContain('## Opportunities');
    expect(mailbox).toContain('## Lessons for future slices');

    expect(componentGuide).toContain('## Public API');
    expect(componentGuide).toContain('## Invariants');
    expect(componentGuide).toContain('## Transitions');
    expect(componentGuide).toContain('## Consumers');
    expect(componentGuide).toContain('```mermaid');
    expect(componentGuide).toContain('failed route posture');
    expect(componentGuide).toContain('replace_current');
    expect(componentGuide).toContain('workspace graph draft read-model');
    expect(componentGuide).toContain('drag handle');
  });

  it('keeps owned-concern docblocks on the modules that own the branch behavior', () => {
    for (const module of ownedConcernModules) {
      const source = readAppSource(module.path);
      expect(source.trimStart().startsWith('/** Owned concern:'), module.label).toBe(true);
      expect(source, module.label).toContain(module.phrase);
    }
  });

  it('validates the branch semantics rather than only the file layout', () => {
    expect(createFailedRouteBootstrapPresentation('Route rendered a governed error')).toEqual({
      status: 'failed',
      detail: 'Route rendered a governed error',
      canComplete: true,
    });

    expect(WORKSPACE_GRAPH_DRAFT_ENDPOINT).toBe('/workspace/graph/draft');
    expect(
      buildWorkspaceGraphDraftEndpoint({
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
      })
    ).toBe('/workspace/graph/draft?tenantId=tenant&projectId=project&environmentId=dev');

    const mappedNode = mapCanonicalNodeToCanvasNode({
      canonicalNode: buildCanonicalNode('model_orders'),
      index: 0,
      showColumns: false,
    });
    const droppedNode = mapDroppedCanonicalNodeToCanvasNode(
      buildCanonicalNode('model_customers'),
      { x: 120, y: 80 },
      false
    );
    expect(CANVAS_NODE_DRAG_HANDLE_SELECTOR).toBe('.canvas-node-drag-surface');
    expect(mappedNode.dragHandle).toBe(CANVAS_NODE_DRAG_HANDLE_SELECTOR);
    expect(droppedNode.dragHandle).toBe(CANVAS_NODE_DRAG_HANDLE_SELECTOR);

    const tabStripSource = readAppSource('CanvasPlaygroundTabStrip.tsx');
    const tabStripModelSource = readAppSource('canvasPlaygroundTabStripModel.ts');
    const tabStripTemplateSource = readAppSource('CanvasPlaygroundTabStrip.templates.tsx');
    const createCommandSource = readAppSource('canvasCreateCanvasDocumentCommand.ts');
    const workspaceServiceSource = readAppSource(
      '../../services/workspace/workspaceService.api.ts'
    );

    expect(tabStripSource).toContain('CanvasPlaygroundTabStripTemplate');
    expect(tabStripModelSource).toContain("mode: 'replace_current'");
    expect(tabStripModelSource).toContain('resolveCanvasReplacementActionState');
    expect(tabStripTemplateSource).toContain('AlertDialog');

    expect(createCommandSource).toContain("command.mode ?? 'create_first'");
    expect(createCommandSource).toContain("case 'create_first'");
    expect(createCommandSource).toContain("case 'replace_current'");
    expect(createCommandSource).toContain('resolveCreateFirstCanvasDocumentEligibility');
    expect(createCommandSource).toContain('resolveReplaceCurrentCanvasDocumentEligibility');
    expect(createCommandSource).toContain('expectedRevision: existingRecord.revision');

    expect(workspaceServiceSource).toContain('requestRaw(endpoint');
    expect(workspaceServiceSource).toContain('projectWorkspaceGraphDraftReadResponseSnapshot');
    expect(workspaceServiceSource).not.toContain(
      "getJson<WorkspaceGraphSnapshot>('/workspace/graph'"
    );
  });

  it('keeps projection and replacement command decisions behind named semantic helpers', () => {
    const projectionSource = readAppSource(
      '../../services/workspace/workspaceGraphDraftProjection.ts'
    );
    const createCommandSource = readAppSource('canvasCreateCanvasDocumentCommand.ts');

    expect(projectionSource).toContain('const DBT_NODE_TYPE_RULES');
    expect(projectionSource).toContain('function matchesDbtNodeTypeRule(');
    expect(projectionSource).toContain('function buildCanonicalEdgeProjection(');

    expect(createCommandSource).toContain(
      'function resolveCreateCanvasDocumentCommandEligibility('
    );
    expect(createCommandSource).toContain('function buildBlankCanvasDocumentDraftInput(');
    expect(createCommandSource).toContain('function applyCanvasDocumentSaveSuccess(');
    expect(createCommandSource).toContain('function applyCanvasDocumentSaveConflict(');
  });

  it('keeps canvas node viewport projection options behind a named argument object', () => {
    const mapperSource = readAppSource('canvasNodeMapper.ts');

    expect(mapperSource).toContain('type MapCanonicalNodeToCanvasNodeArgs = {');
    expect(mapperSource).toContain('export function mapCanonicalNodeToCanvasNode({');
    expect(mapperSource).toContain('}: MapCanonicalNodeToCanvasNodeArgs): Node<DbtNodeData>');
    expect(mapperSource).not.toContain('canonicalNode: CanonicalNode,\n  index: number,');
  });

  it('keeps host tab rendering and replacement action behind named presenter seams', () => {
    const tabStripSource = readAppSource('CanvasPlaygroundTabStrip.tsx');
    const tabStripModelSource = readAppSource('canvasPlaygroundTabStripModel.ts');
    const tabStripTemplateSource = readAppSource('CanvasPlaygroundTabStrip.templates.tsx');

    expect(tabStripSource).toContain("from './CanvasPlaygroundTabStrip.templates'");
    expect(tabStripSource).toContain("from './canvasPlaygroundTabStripModel'");
    expect(tabStripSource).not.toContain('AlertDialog');
    expect(tabStripSource).not.toContain('TabsTrigger');
    expect(tabStripSource).not.toContain("mode: 'replace_current'");

    expect(tabStripModelSource).toContain('function resolveCanvasReplacementActionState(');
    expect(tabStripModelSource).toContain('function createReplaceCurrentCanvasDocumentCommand(');
    expect(tabStripModelSource).toContain('copy: CanvasReplacementActionCopy');
    expect(tabStripModelSource).toContain('export type CanvasReplacementActionViewState');
    expect(tabStripModelSource).toContain('viewState: CanvasReplacementActionViewState');
    expect(tabStripModelSource).not.toContain('JSX.Element');

    expect(tabStripSource).toContain('replacementActionState.viewState');
    expect(tabStripTemplateSource).toContain('function CanvasPlaygroundTabStripTemplate(');
    expect(tabStripTemplateSource).toContain('function CanvasPlaygroundTabsTemplate(');
    expect(tabStripTemplateSource).toContain('function CanvasReplacementActionTemplate(');
    expect(tabStripTemplateSource).toContain('CanvasReplacementActionViewState');
    expect(tabStripTemplateSource).toContain('border-(--border-default)');
    expect(tabStripTemplateSource).toContain('bg-(--surface-panel)');
    expect(tabStripTemplateSource).toContain('text-(--text-subtle)');
    expect(tabStripTemplateSource).not.toContain('border-[color:var(');
    expect(tabStripTemplateSource).not.toContain('bg-[var(');
    expect(tabStripTemplateSource).not.toContain('text-[var(');
    expect(tabStripTemplateSource).not.toContain('CanvasReplacementActionState');
    expect(tabStripTemplateSource).not.toContain("from './copy'");
    expect(tabStripTemplateSource).not.toContain("mode: 'replace_current'");
    expect(tabStripSource).not.toContain('canEditEdges && activeReplacementCanvasKind');
  });

  it('keeps first-canvas and recovery banner HTML behind passive templates', () => {
    const hostSource = readAppSource('CanvasPlaygroundHost.tsx');
    const hostTemplateSource = readAppSource('CanvasPlaygroundHost.templates.tsx');
    const recoveryBannerSource = readAppSource('CanvasRecoveryBanner.tsx');
    const recoveryModelSource = readAppSource('canvasRecoveryBannerModel.ts');
    const recoveryTemplateSource = readAppSource('CanvasRecoveryBanner.templates.tsx');

    expect(hostSource).toContain("from './CanvasPlaygroundHost.templates'");
    expect(hostSource).toContain('onCreateCanvasKind');
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

  it('keeps Canvas viewport mocks in named test-local components for static analysis', () => {
    const viewportTestSource = readAppSource('CanvasViewport.test.tsx');

    expect(viewportTestSource).toContain('type MockMiniMapProps = Readonly<{');
    expect(viewportTestSource).toContain('function MockMiniMap(');
    expect(viewportTestSource).not.toContain('MiniMap: ({');
  });

  it('keeps the active web graph slice free of retired-route shims', () => {
    const activeSources = [
      readRepoFile('apps/web/src/app/services/plans/plansService.ts'),
      readRepoFile('apps/web/src/app/services/runs/runsService.ts'),
      readRepoFile('apps/web/src/app/services/workspace/workspaceService.api.test.ts'),
      readRepoFile('apps/web/src/app/stores/uiLayoutStore.test.ts'),
      readRepoFile('apps/web/src/app/views/Canvas.routeStates.test.tsx'),
      readRepoFile('apps/web/src/app/views/canvas/CanvasViewport.test.tsx'),
      readRepoFile('apps/web/src/app/views/canvas/canvasPalette.ts'),
      readRepoFile('apps/web/src/app/views/canvas/canvasPalette.test.ts'),
      readRepoFile('buzon/20260428-codex-fowler-web-graph-startup-and-draft-recovery-analysis.md'),
      readRepoFile(
        'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md'
      ),
    ];
    const bannedTerms = RETIRED_ROUTE_SHIM_TERM_PATTERNS.map((pattern) => new RegExp(pattern, 'i'));

    for (const source of activeSources) {
      for (const bannedTerm of bannedTerms) {
        expect(source).not.toMatch(bannedTerm);
      }
    }

    expect(repoFileExists('apps/web/src/app/components/GraphCanvas.tsx')).toBe(false);
    expect(repoFileExists('apps/web/src/app/plugins/PluginNodeWrapper.tsx')).toBe(false);
    expect(repoFileExists('apps/web/src/app/stores/appStore.ts')).toBe(false);
    expect(repoFileExists('apps/web/src/app/stores/index.ts')).toBe(false);
    expect(repoFileExists('apps/web/src/app/data/mockData.ts')).toBe(false);
    expect(repoFileExists('apps/web/src/app/types/index.ts')).toBe(false);
  });
});
