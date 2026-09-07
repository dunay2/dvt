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
const HOST_CYCLE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasHostCycleState.ts'
);
const CONTROLLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasController.ts'
);
const RUNTIME_CONTRACT_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasAuthoringRuntime.types.ts'
);

describe('CanvasPlaygroundHost architecture', () => {
  it('keeps first-canvas host HTML in templates while the host builds commands', () => {
    expect(PLAYGROUND_HOST_SOURCE).toContain("from './CanvasPlaygroundHost.templates'");
    expect(PLAYGROUND_HOST_SOURCE).toContain('onCreateCanvas');
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
    const implementationPlan = readRepoFile(
      'docs/planning/proposals/mandatory/frontend-and-ux/f15e-canvas-startup-template-selection-plan-20260518.md'
    );

    for (const document of [componentGuide, hostGuide, userStories, implementationPlan]) {
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

  it('keeps first-canvas availability separate from graph mutation availability', () => {
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-startup-template-selection-component.md'
    );
    const creationCapabilityGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-first-canvas-creation-capability-component.md'
    );
    const draftLifecycleSource = readArchitectureSiblingSource(
      import.meta.dirname,
      'useCanvasDraftLifecycle.ts'
    );
    const availabilitySource = readArchitectureSiblingSource(
      import.meta.dirname,
      'canvasCreateCanvasDocumentAvailability.ts'
    );

    expect(componentGuide).toContain('must not reuse `canEditEdges`');
    expect(creationCapabilityGuide).toContain('## Public API');
    expect(creationCapabilityGuide).toContain('## Invariants');
    expect(creationCapabilityGuide).toContain('## Transitions');
    expect(creationCapabilityGuide).toContain('## Consumers');
    expect(HOST_CYCLE_SOURCE).toContain('canCreateFirstCanvasDocument');
    expect(HOST_CYCLE_SOURCE).toMatch(
      /if \(routeState === 'needs_canvas'\) \{\s+const canCreateCanvas = canCreateFirstCanvasDocument/
    );
    expect(HOST_CYCLE_SOURCE).not.toMatch(
      /if \(routeState === 'needs_canvas'\)[\s\S]{0,500}canEditEdges &&/
    );
    expect(availabilitySource).toContain('Owned concern: decide');
    expect(draftLifecycleSource).toContain("from './canvasCreateCanvasDocumentAvailability'");
    expect(draftLifecycleSource).toContain('deriveCanCreateCanvasDocument({');
    expect(draftLifecycleSource).not.toMatch(/graphDraftQuery\.data\?\.record == null/);
    expect(RUNTIME_CONTRACT_SOURCE).toContain('canPersistGraphDraftTransport: boolean');
    expect(RUNTIME_CONTRACT_SOURCE).toContain('canMutateGraphTransport: boolean');
    expect(RUNTIME_CONTRACT_SOURCE).not.toContain('canEditDraftTransport');
    expect(CONTROLLER_SOURCE).toContain(
      'canPersistGraphDraftTransport: store.userPermissions.canPersistGraphDraft'
    );
    expect(CONTROLLER_SOURCE).toContain(
      'canMutateGraphTransport: store.userPermissions.canEditEdges'
    );
    expect(CONTROLLER_SOURCE).not.toContain(
      'canEditDraftTransport: store.userPermissions.canEditEdges'
    );
  });
});
