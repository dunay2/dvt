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
    expect(WORKBENCH_SURFACE_SOURCE).toContain('renderCanvasEmptyWorkbenchSurface');
  });

  it('renders empty authoring from the governed authoring-node catalog only when edits are allowed', () => {
    expect(WORKBENCH_SURFACE_SOURCE).toContain('DVT_AUTHORING_NODE_KINDS');
    expect(WORKBENCH_SURFACE_SOURCE).toContain('canEditEdges ? DVT_AUTHORING_NODE_KINDS : []');
    expect(WORKBENCH_SURFACE_SOURCE).toContain(
      'canEditEdges ? onCreateAuthoringNode : undefined'
    );
  });

  it('renders from canonical route posture instead of reading controller state directly', () => {
    const combinedSource = [CENTER_SURFACE_SOURCE, WORKBENCH_SURFACE_SOURCE].join('\n');

    expect(combinedSource).toContain('startupBlockState');
    expect(combinedSource).toContain('workbenchErrorMessage');
    expect(combinedSource).not.toContain('backendBlockMessage');
    expect(combinedSource).not.toContain("'./useCanvasController'");
  });
});
