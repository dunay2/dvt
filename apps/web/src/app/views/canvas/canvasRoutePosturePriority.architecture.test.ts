import { describe, expect, it } from 'vitest';

import {
  readAppSource,
  readRepoFile,
  repoFileExists,
  RETIRED_ROUTE_SHIM_TERM_PATTERNS,
} from './canvasStartupAndDraftRecovery.architecture.support';

describe('canvas route posture priority architecture', () => {
  it('keeps fixed canvas tab-strip rendering retired from the graph-first route posture', () => {
    for (const retiredFile of [
      'CanvasPlaygroundTabStrip.tsx',
      'useCanvasPlaygroundTabStripPresenter.ts',
      'canvasPlaygroundTabStripModel.ts',
      'CanvasPlaygroundTabStrip.templates.tsx',
    ]) {
      expect(repoFileExists(`apps/web/src/app/views/canvas/${retiredFile}`), retiredFile).toBe(
        false
      );
    }
  });

  it('keeps active Canvas architecture docs from routing through retired tab-strip seams', () => {
    const activeDocs = [
      'docs/architecture/components/web/graph/canvas-route-chrome-token-component.md',
      'docs/architecture/components/web/graph/canvas-route-chrome-token-user-stories.md',
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md',
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md',
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
      'docs/architecture/components/web/graph/graph-frontend-architecture.md',
    ];
    const retiredTerms = [
      'CanvasPlaygroundTabStrip',
      'useCanvasPlaygroundTabStripPresenter',
      'canvasPlaygroundTabStripModel',
      'Host tab strip',
    ];

    for (const docPath of activeDocs) {
      const docSource = readRepoFile(docPath);
      for (const retiredTerm of retiredTerms) {
        expect(docSource, docPath).not.toContain(retiredTerm);
      }
    }
  });

  it('keeps Canvas route chrome visual classes behind the Canvas chrome token component', () => {
    const tokenSource = readAppSource('canvasChromeTokens.ts');
    const draftSaveStatusSource = readAppSource('CanvasDraftSaveStatus.tsx');
    const layoutSource = readAppSource('canvasShellLayoutBuilder.tsx');
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

    for (const source of [draftSaveStatusSource]) {
      expect(source).toContain("from './canvasChromeTokens'");
      expect(source).not.toMatch(/\b(?:slate|gray|zinc)-\d{2,3}\b/);
      expect(source).not.toMatch(/\b(?:rose|amber|emerald)-\d{2,3}\b/);
    }
    expect(layoutSource).not.toContain('CanvasPlaygroundTabStrip');

    for (const retiredToolbarFile of [
      'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
      'apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx',
      'apps/web/src/app/views/canvas/CanvasToolbarDraftStatus.tsx',
    ]) {
      expect(repoFileExists(retiredToolbarFile), retiredToolbarFile).toBe(false);
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
    expect(postureSource).toContain('toCanvasDraftStatusState');
    expect(postureSource).not.toContain('toCanvasDraftToolbarState');
    expect(postureSource).not.toContain('toolbarLabel');
    expect(postureSource).not.toContain('toolbarTone');
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
    expect(routeStateSource).toContain('toCanvasDraftStatusState(controller.draftAccessPosture)');
    expect(routeStateSource).not.toContain('toCanvasDraftToolbarState');
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

  it('keeps the active web graph slice free of retired-route shims', () => {
    const activeSources = [
      readRepoFile('apps/web/src/app/services/plans/plansService.ts'),
      readRepoFile('apps/web/src/app/services/runs/runsService.ts'),
      readRepoFile('apps/web/src/app/views/canvas/canvasPalette.ts'),
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
