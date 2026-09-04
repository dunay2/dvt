import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CENTER_SURFACE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasCenterSurface.tsx'
);
const WORKBENCH_SURFACE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasCenterSurfaceWorkbench.tsx'
);
const TRANSPORT_SURFACE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasCenterSurfaceTransport.tsx'
);

describe('CanvasCenterSurface architecture', () => {
  it('keeps the exported center surface as a thin route-posture composition facade', () => {
    expect(CENTER_SURFACE_SOURCE).toContain(
      'Owned concern: compose Canvas center-surface rendering from governed route posture'
    );
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasDraftTransportSurface');
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasWorkbenchSurface');
    expect(CENTER_SURFACE_SOURCE).not.toContain('CanvasEmptyStateView');
    expect(CENTER_SURFACE_SOURCE).not.toContain('DVT_AUTHORING_NODE_KINDS');
  });

  it('splits transport failures from workbench route-state rendering', () => {
    expect(TRANSPORT_SURFACE_SOURCE).toContain(
      'Owned concern: render draft-transport failure states'
    );
    expect(TRANSPORT_SURFACE_SOURCE).toContain('CanvasBlockedStateView');
    expect(WORKBENCH_SURFACE_SOURCE).toContain(
      'Owned concern: render Canvas workbench states from canonical route posture'
    );
    expect(WORKBENCH_SURFACE_SOURCE).toContain('renderCanvasStartupWorkbenchSurface');
    expect(WORKBENCH_SURFACE_SOURCE).toContain('renderCanvasGraphWorkbenchSurface');
    expect(WORKBENCH_SURFACE_SOURCE).toContain('renderCanvasHostCycleWorkbenchSurface');
  });

  it('keeps create-canvas host posture separate from typed empty-canvas authoring', () => {
    expect(WORKBENCH_SURFACE_SOURCE).toContain("cycleState.kind === 'needs_canvas'");
    expect(WORKBENCH_SURFACE_SOURCE).toContain('CanvasPlaygroundHost');
    expect(WORKBENCH_SURFACE_SOURCE).toContain('cycleState.availableCanvasKinds');
    expect(WORKBENCH_SURFACE_SOURCE).toContain('cycleState.onCreateCanvasDocument');
    expect(WORKBENCH_SURFACE_SOURCE).toContain('deriveCanvasHostCycleState');
  });

  it('does not render a second presentation over an existing empty Canvas', () => {
    expect(WORKBENCH_SURFACE_SOURCE).toContain('deriveCanvasHostCycleState');
    expect(WORKBENCH_SURFACE_SOURCE).not.toContain('CanvasEmptyStateView');
    expect(WORKBENCH_SURFACE_SOURCE).not.toContain('emptyStateGuideVisible');
    expect(WORKBENCH_SURFACE_SOURCE).not.toContain('DVT_AUTHORING_NODE_KINDS');
  });

  it('renders from canonical route posture instead of reading controller state directly', () => {
    const combinedSource = [CENTER_SURFACE_SOURCE, WORKBENCH_SURFACE_SOURCE].join('\n');

    expect(combinedSource).toContain('startupBlockState');
    expect(combinedSource).toContain('workbenchErrorMessage');
    expect(combinedSource).not.toContain('backendBlockMessage');
    expect(combinedSource).not.toContain("'./useCanvasController'");
  });
});
