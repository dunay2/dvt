import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CONTROLLER_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasController.ts'),
  'utf8'
);

describe('useCanvasController architecture', () => {
  it('stays a route-facing facade over environment, authoring, selection, mutation, and read-model seams', () => {
    expect(CONTROLLER_SOURCE).toContain('useCanvasControllerEnvironment');
    expect(CONTROLLER_SOURCE).toContain('useCanvasAuthoringRuntime');
    expect(CONTROLLER_SOURCE).toContain('useCanvasControllerReadModel');
    expect(CONTROLLER_SOURCE).toContain('useCanvasSelectionSync');
    expect(CONTROLLER_SOURCE).toContain('useCanvasMutationHandlers');
    expect(CONTROLLER_SOURCE).not.toMatch(/workspaceService\.getGraphDraft\s*\(/);
    expect(CONTROLLER_SOURCE).not.toMatch(/workspaceService\.saveGraphDraft\s*\(/);
    expect(CONTROLLER_SOURCE).not.toMatch(/workspaceService\.getGraphSnapshot\s*\(/);
    expect(CONTROLLER_SOURCE).not.toContain('deriveCanvasBackendPosture');
    expect(CONTROLLER_SOURCE).not.toContain('deriveCanvasAuthoringState');
    expect(CONTROLLER_SOURCE).not.toContain('createCanvasDraftRepository');
    expect(CONTROLLER_SOURCE).not.toContain('useCanvasDraftLifecycle');
    expect(CONTROLLER_SOURCE).not.toContain('useQuery(');
    expect(CONTROLLER_SOURCE).not.toContain('useState(');
    expect(CONTROLLER_SOURCE).not.toContain('useEffect(');
    expect(CONTROLLER_SOURCE).not.toContain('applyNodeChanges');
    expect(CONTROLLER_SOURCE).not.toContain('applyEdgeChanges');
    expect(CONTROLLER_SOURCE).not.toContain('buildNodesWithImpact');
    expect(CONTROLLER_SOURCE).not.toContain('validateTransformationGraph');
    expect(CONTROLLER_SOURCE).not.toContain('usePlatformHealthSnapshotQuery');
    expect(CONTROLLER_SOURCE).not.toContain('useCapabilitiesQuery');
    expect(CONTROLLER_SOURCE).not.toContain('resolveWorkspaceBootstrapConfig');
  });
});
