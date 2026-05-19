import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';
import { readRepoFile } from './canvasStartupAndDraftRecovery.architecture.support';

const PLAYGROUND_HOST_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasPlaygroundHost.tsx'
);
const PLAYGROUND_HOST_TEMPLATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasPlaygroundHost.templates.tsx'
);
const ROUTE_COPY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasCopyCatalog.route.ts'
);

describe('CanvasPlaygroundHost architecture', () => {
  it('keeps first-canvas host HTML in templates while the host builds commands', () => {
    expect(PLAYGROUND_HOST_SOURCE).toContain("from './CanvasPlaygroundHost.templates'");
    expect(PLAYGROUND_HOST_SOURCE).toContain('onCreateCanvasTemplate');
    expect(PLAYGROUND_HOST_SOURCE).toContain('resolveCanvasTemplatePresentation');
    expect(PLAYGROUND_HOST_SOURCE).not.toContain('<div');
    expect(PLAYGROUND_HOST_SOURCE).not.toContain('Button');
    expect(PLAYGROUND_HOST_SOURCE).not.toContain('Card');

    expect(PLAYGROUND_HOST_TEMPLATE_SOURCE).toContain('function CanvasPlaygroundHostTemplate(');
    expect(PLAYGROUND_HOST_TEMPLATE_SOURCE).not.toContain('CanvasCreateCanvasDocumentCommand');
    expect(PLAYGROUND_HOST_TEMPLATE_SOURCE).not.toContain('canvasViewCopy');
  });

  it('guards first-start selection as templates inside the active workspace', () => {
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-startup-template-selection-component.md'
    );
    const hostGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-playground-host-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md'
    );
    const fowlerReview = readRepoFile(
      'buzon/20260518-codex-fowler-f15e-canvas-startup-template-selection.md'
    );
    const implementationPlan = readRepoFile(
      'docs/planning/proposals/mandatory/frontend-and-ux/f15e-canvas-startup-template-selection-plan-20260518.md'
    );

    for (const document of [
      componentGuide,
      hostGuide,
      userStories,
      fowlerReview,
      implementationPlan,
    ]) {
      expect(document).toContain('active workspace');
      expect(document).toContain('canvas template');
    }

    for (const section of ['## Public API', '## Invariants', '## Transitions', '## Consumers']) {
      expect(componentGuide).toContain(section);
    }

    expect(componentGuide).toContain('```mermaid');
    expect(userStories).toContain('US-CANVAS-FIRST-AUTHORING-007');
    expect(implementationPlan).toContain('F15E-CANVAS-STARTUP-TEMPLATE-SELECTION-20260518');
    expect(implementationPlan).toContain('CreateCanvasDocumentCommand');
  });

  it('keeps visible copy and template slots aligned with the template-selection meaning', () => {
    expect(PLAYGROUND_HOST_SOURCE).toContain('workspaceScope');
    expect(PLAYGROUND_HOST_SOURCE).toContain('routeNeedsCanvasWorkspaceLabel');
    expect(PLAYGROUND_HOST_SOURCE).toContain('resolveCanvasTemplatePresentation');
    expect(PLAYGROUND_HOST_TEMPLATE_SOURCE).toContain('canvas-playground-workspace-context');
    expect(PLAYGROUND_HOST_TEMPLATE_SOURCE).toContain('canvas-playground-template-choice');
    expect(PLAYGROUND_HOST_TEMPLATE_SOURCE).toContain('template.title');
    expect(PLAYGROUND_HOST_TEMPLATE_SOURCE).toContain('template.description');
    expect(PLAYGROUND_HOST_TEMPLATE_SOURCE).not.toContain('registration.createTitle');
    expect(ROUTE_COPY_SOURCE).toContain('Create canvas in this workspace');
    expect(ROUTE_COPY_SOURCE).toContain('Choose a canvas template');
    expect(ROUTE_COPY_SOURCE).not.toContain('Choose a governed canvas kind to start authoring');
  });
});
