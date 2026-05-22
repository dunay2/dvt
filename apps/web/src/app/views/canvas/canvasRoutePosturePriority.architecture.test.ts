import { describe, expect, it } from 'vitest';

import {
  readAppSource,
  readRepoFile,
  repoFileExists,
  RETIRED_ROUTE_SHIM_TERM_PATTERNS,
} from './canvasStartupAndDraftRecovery.architecture.support';

describe('canvas route posture priority architecture', () => {
  it('keeps host tab rendering and replacement action behind named presenter seams', () => {
    const tabStripSource = readAppSource('CanvasPlaygroundTabStrip.tsx');
    const tabStripPresenterSource = readAppSource('useCanvasPlaygroundTabStripPresenter.ts');
    const tabStripModelSource = readAppSource('canvasPlaygroundTabStripModel.ts');
    const tabStripTemplateSource = readAppSource('CanvasPlaygroundTabStrip.templates.tsx');

    expect(tabStripSource).toContain("from './CanvasPlaygroundTabStrip.templates'");
    expect(tabStripSource).toContain("from './useCanvasPlaygroundTabStripPresenter'");
    expect(tabStripSource).not.toContain('AlertDialog');
    expect(tabStripSource).not.toContain('TabsTrigger');
    expect(tabStripSource).not.toContain("mode: 'replace_current'");
    expect(tabStripSource).not.toContain('useState(');
    expect(tabStripSource).not.toContain('useMemo(');

    expect(tabStripPresenterSource).toContain('function useCanvasPlaygroundTabStripPresenter(');
    expect(tabStripPresenterSource).toContain('resolveCanvasReplacementActionState');
    expect(tabStripPresenterSource).toContain('createReplaceCurrentCanvasDocumentCommand');
    expect(tabStripPresenterSource).toContain('resolveCanvasViewCopy');
    expect(tabStripPresenterSource).toContain('CanvasPlaygroundTabStripTemplateProps');
    expect(tabStripPresenterSource).not.toContain('JSX.Element');
    expect(tabStripPresenterSource).not.toContain('<AlertDialog');
    expect(tabStripPresenterSource).not.toContain('canvasViewCopy');

    expect(tabStripModelSource).toContain('function resolveCanvasReplacementActionState(');
    expect(tabStripModelSource).toContain('function createReplaceCurrentCanvasDocumentCommand(');
    expect(tabStripModelSource).toContain('copy: CanvasReplacementActionCopy');
    expect(tabStripModelSource).toContain('export type CanvasReplacementActionViewState');
    expect(tabStripModelSource).toContain('viewState: CanvasReplacementActionViewState');
    expect(tabStripModelSource).not.toContain('JSX.Element');

    expect(tabStripPresenterSource).toContain('replacementActionState.viewState');
    expect(tabStripTemplateSource).toContain('function CanvasPlaygroundTabStripTemplate(');
    expect(tabStripTemplateSource).toContain('function CanvasPlaygroundTabsTemplate(');
    expect(tabStripTemplateSource).toContain('function CanvasReplacementActionTemplate(');
    expect(tabStripTemplateSource).toContain('CanvasReplacementActionViewState');
    expect(tabStripTemplateSource).toContain('border-[color:var(--border-default)]');
    expect(tabStripTemplateSource).toContain('bg-[var(--surface-panel)]');
    expect(tabStripTemplateSource).toContain('canvasChromeClasses.tabKindBadge');
    expect(tabStripTemplateSource).not.toContain('border-(--border-default)');
    expect(tabStripTemplateSource).not.toContain('bg-(--surface-panel)');
    expect(tabStripTemplateSource).not.toContain('text-(--text-subtle)');
    expect(tabStripTemplateSource).not.toContain('CanvasReplacementActionState');
    expect(tabStripTemplateSource).not.toContain("from './copy'");
    expect(tabStripTemplateSource).not.toContain("mode: 'replace_current'");
    expect(tabStripSource).not.toContain('canEditEdges && activeReplacementCanvasKind');
  });

  it('keeps Canvas route chrome visual classes behind the Canvas chrome token component', () => {
    const tokenSource = readAppSource('canvasChromeTokens.ts');
    const toolbarSource = readAppSource('CanvasToolbar.tsx');
    const primaryControlsSource = readAppSource('CanvasToolbarPrimaryControls.tsx');
    const draftStatusSource = readAppSource('CanvasToolbarDraftStatus.tsx');
    const tabStripTemplateSource = readAppSource('CanvasPlaygroundTabStrip.templates.tsx');
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-route-chrome-token-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/graph/canvas-route-chrome-token-user-stories.md'
    );

    expect(tokenSource).toContain('Owned concern: own Canvas route chrome visual tokens');
    expect(tokenSource).toContain('canvasChromeClasses');
    expect(tokenSource).toContain('canvasDraftStatusToneClasses');
    expect(tokenSource).toContain('resolveCanvasDraftStatusClassName');
    expect(tokenSource).toContain('resolveCanvasWorkflowStatusClassName');

    for (const source of [
      toolbarSource,
      primaryControlsSource,
      draftStatusSource,
      tabStripTemplateSource,
    ]) {
      expect(source).toContain("from './canvasChromeTokens'");
      expect(source).not.toMatch(/\b(?:slate|gray|zinc)-\d{2,3}\b/);
      expect(source).not.toMatch(/\b(?:rose|amber|emerald)-\d{2,3}\b/);
    }

    for (const expected of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '```mermaid',
      'canvasChromeClasses',
      'resolveCanvasDraftStatusClassName',
    ]) {
      expect(componentGuide).toContain(expected);
    }

    for (const storyId of [
      'US-F24-CANVAS-CHROME-01',
      'US-F24-CANVAS-CHROME-02',
      'US-F24-CANVAS-CHROME-03',
    ]) {
      expect(userStories).toContain(storyId);
    }
  });

  it('keeps Canvas draft access posture as the route-visible admission policy', () => {
    const postureSource = readAppSource('canvasDraftAccessPostureModel.ts');
    const authTransportSource = readAppSource('canvasDraftAuthTransportPosture.ts');
    const authoringRuntimeSource = readAppSource('useCanvasAuthoringRuntime.ts');
    const authoringStateSource = readAppSource('canvasAuthoringState.ts');
    const controllerSource = readAppSource('useCanvasController.ts');
    const routeStateSource = readAppSource('canvasRouteViewState.ts');
    const interactionSource = readAppSource('canvasRouteInteractionState.ts');
    const runtimePolicySource = readAppSource('canvasRuntimePolicy.ts');
    const transportSurfaceSource = readAppSource('canvasDraftTransportErrorState.ts');
    const recoveryBannerTemplateSource = readAppSource('CanvasRecoveryBanner.templates.tsx');
    const postureGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-draft-access-posture-component.md'
    );
    const implementationPlan = readRepoFile(
      'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-m-b-canvas-draft-denial-posture-implementation-plan-20260501.md'
    );

    expect(postureSource).toContain('export type CanvasDraftAccessPosture');
    expect(postureSource).toContain('deriveCanvasDraftAccessPosture');
    expect(postureSource).toContain('toCanvasDraftToolbarState');
    expect(postureSource).toContain('toCanvasDraftRecoveryBannerViewState');
    expect(postureSource).toContain('toCanvasDraftTransportSurfaceState');
    expect(postureSource).toContain('applyCanvasDraftPostureToRuntimePolicyInput');
    expect(postureSource).toContain('resolveCanvasDraftAccessRecoveryCommand');
    expect(postureSource).toContain("kind: 'unauthenticated'");
    expect(postureSource).toContain("kind: 'forbidden_scope'");
    expect(postureSource).toContain("kind: 'read_only'");

    expect(authTransportSource).toContain('deriveCanvasDraftAuthTransportPosture');
    expect(authTransportSource).not.toContain('canRefreshApiBearerToken');
    expect(authTransportSource).not.toContain('resolveApiBearerTokenForRequest');
    expect(authoringRuntimeSource).toContain('deriveCanvasDraftAuthTransportPosture');
    expect(authoringStateSource).toContain('deriveCanvasDraftAccessPosture');
    expect(authoringStateSource).toContain('isCanvasDraftPostureMutationBlocked');
    expect(authoringStateSource).not.toContain('baseCanPlan');
    expect(authoringStateSource).not.toContain('baseCanRun');

    expect(controllerSource).toContain('applyCanvasDraftPostureToRuntimePolicyInput');
    expect(routeStateSource).toContain('draftAccessPosture: controller.draftAccessPosture');
    expect(routeStateSource).toContain('toCanvasDraftToolbarState(controller.draftAccessPosture)');
    expect(interactionSource).toContain('isCanvasDraftPostureMutationBlocked');
    expect(interactionSource).not.toContain("draftAccessMode === 'forbidden'");
    expect(interactionSource).not.toContain("draftAccessMode !== 'read_only'");
    expect(runtimePolicySource).not.toContain('draftAccessMode');
    expect(runtimePolicySource).not.toContain('draftCapabilityReason');
    expect(runtimePolicySource).not.toContain('draftFormatError');
    expect(transportSurfaceSource).toContain('toCanvasDraftTransportSurfaceState');
    expect(transportSurfaceSource).not.toContain('draftAccessMode');
    expect(transportSurfaceSource).not.toContain('draftFormatError');
    expect(recoveryBannerTemplateSource).toContain('CanvasDraftAccessRecoveryTemplate');

    expect(postureGuide).toContain('## Public API');
    expect(postureGuide).toContain('## Pre-Implementation Discovery Baseline');
    expect(postureGuide).toContain('No implemented Canvas draft access posture component existed');
    expect(postureGuide).toContain('Design before implementation');
    expect(postureGuide).toContain('## Fowler Opportunity Matrix');
    expect(implementationPlan).toContain('## Pre-Implementation Discovery Gate');
    expect(implementationPlan).toContain(
      'The implementation is not allowed to create this component'
    );
    expect(implementationPlan).toContain('without first proving the existing code lacks one owner');
    expect(implementationPlan).toContain('## TDD Tasks');
    expect(implementationPlan).toContain('## Self-Review Iterations');
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
      readRepoFile('apps/web/src/app/services/workspace/workspacePorts.api.test.ts'),
      readRepoFile('apps/web/src/app/stores/uiLayoutStore.test.ts'),
      readRepoFile('apps/web/src/app/views/Canvas.routeStates.smoke.test.tsx'),
      readRepoFile('apps/web/src/app/views/Canvas.routeStates.first-canvas-policy.test.tsx'),
      readRepoFile('apps/web/src/app/views/Canvas.routeStates.host-cycle-persistence.test.tsx'),
      readRepoFile('apps/web/src/app/views/Canvas.routeStates.backend-recovery-priority.test.tsx'),
      readRepoFile('apps/web/src/app/views/canvas/CanvasViewport.test.tsx'),
      readRepoFile('apps/web/src/app/views/canvas/canvasPalette.ts'),
      readRepoFile('apps/web/src/app/views/canvas/canvasPalette.test.ts'),
      readRepoFile('buzon/20260429-codex-static-analysis-followup-fowler-architecture-review.md'),
      readRepoFile(
        'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md'
      ),
      readRepoFile(
        'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md'
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
