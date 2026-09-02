import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CANVAS_VIEWPORT_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasViewport.tsx'
);
const CANVAS_VIEWPORT_SURFACE_VIEW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasViewportSurfaceView.tsx'
);
const CANVAS_VIEWPORT_STYLE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasViewportStyle.ts'
);
const CANVAS_VIEWPORT_LIFECYCLE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasViewportLifecycle.ts'
);
const CANVAS_VIEWPORT_TEST_HARNESS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasViewport.testHarness.tsx'
);
const CANVAS_VIEWPORT_XYFLOW_TEST_ADAPTER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasViewportXyflowTestAdapter.tsx'
);
const CANVAS_VIEWPORT_NODE_REGISTRY_TEST_ADAPTER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasViewportNodeTypeRegistryTestAdapter.ts'
);
const CANVAS_CONTROLLER_READ_MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasControllerReadModel.ts'
);
const DBT_NODE_COMPONENT_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/canvas/DbtNodeComponent.tsx'
);
const CANVAS_VIEWPORT_BEHAVIOR_SPECS = [
  'CanvasViewport.test.tsx',
  'CanvasViewport.nodeOperationalRail.test.tsx',
] as const;

describe('CanvasViewport architecture', () => {
  it('keeps the route-facing viewport as an orchestrator, not the React Flow template', () => {
    expect(CANVAS_VIEWPORT_SOURCE).toContain('CanvasViewportSurfaceView');
    expect(CANVAS_VIEWPORT_SOURCE).toContain('useCanvasViewportLifecycle');
    expect(CANVAS_VIEWPORT_SOURCE).toContain('resolveCanvasViewportStyle');

    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/^\s+ReactFlow,/m);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/^\s+Background,/m);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/^\s+Controls,/m);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/^\s+MiniMap,/m);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/<ReactFlow(?:\s|>)/);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/<Background(?:\s|>)/);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/<Controls(?:\s|>)/);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/<MiniMap(?:\s|>)/);
  });

  it('keeps presentation, styling, and lifecycle responsibilities in named components', () => {
    expect(CANVAS_VIEWPORT_SURFACE_VIEW_SOURCE).toContain('function CanvasViewportSurfaceView');
    expect(CANVAS_VIEWPORT_SURFACE_VIEW_SOURCE).toContain('<ReactFlow');
    expect(CANVAS_VIEWPORT_SURFACE_VIEW_SOURCE).toContain('CanvasContextMenuView');
    expect(CANVAS_VIEWPORT_SURFACE_VIEW_SOURCE).toContain('resolveMiniMapNodeColor');

    expect(CANVAS_VIEWPORT_STYLE_SOURCE).toContain('export function resolveCanvasViewportStyle');
    expect(CANVAS_VIEWPORT_STYLE_SOURCE).toContain('export function applyCanvasViewportStyle');
    expect(CANVAS_VIEWPORT_STYLE_SOURCE).toContain('deriveCanvasPaletteTokens');

    expect(CANVAS_VIEWPORT_LIFECYCLE_SOURCE).toContain(
      'export function useCanvasViewportLifecycle'
    );
    expect(CANVAS_VIEWPORT_LIFECYCLE_SOURCE).toContain('reactFlow.setViewport');
    expect(CANVAS_VIEWPORT_LIFECYCLE_SOURCE).toContain('.fitView({');
  });

  it('keeps test doubles in explicit adapters registered before the subject harness', () => {
    expect(CANVAS_VIEWPORT_TEST_HARNESS_SOURCE).toContain(
      "from './canvasViewportXyflowTestAdapter'"
    );
    expect(CANVAS_VIEWPORT_TEST_HARNESS_SOURCE).toContain(
      "from './canvasViewportNodeTypeRegistryTestAdapter'"
    );
    expect(CANVAS_VIEWPORT_TEST_HARNESS_SOURCE).not.toContain('vi.mock(');

    for (const exportedBoundary of [
      'export function ReactFlow',
      'export function Controls',
      'export function MiniMap',
      'export function useReactFlow',
      'export function resetCanvasViewportXyflowTestAdapter',
    ]) {
      expect(CANVAS_VIEWPORT_XYFLOW_TEST_ADAPTER_SOURCE).toContain(exportedBoundary);
    }
    expect(CANVAS_VIEWPORT_NODE_REGISTRY_TEST_ADAPTER_SOURCE).toContain(
      'export const resolveNodeKindRegistration'
    );
    expect(CANVAS_VIEWPORT_NODE_REGISTRY_TEST_ADAPTER_SOURCE).toContain(
      'export function resetCanvasViewportNodeTypeRegistryTestAdapter'
    );

    for (const specPath of CANVAS_VIEWPORT_BEHAVIOR_SPECS) {
      const specSource = readArchitectureSiblingSource(import.meta.dirname, specPath);
      const xyflowRegistration = specSource.search(/vi\.mock\(\s*'@xyflow\/react'/u);
      const registryRegistration = specSource.search(
        /vi\.mock\(\s*'\.\.\/\.\.\/plugins\/nodeTypeRegistry'/u
      );
      const harnessImport = specSource.indexOf("from './CanvasViewport.testHarness'");

      expect(xyflowRegistration, `${specPath} xyflow registration`).toBeGreaterThan(-1);
      expect(registryRegistration, `${specPath} registry registration`).toBeGreaterThan(-1);
      expect(harnessImport, `${specPath} harness import`).toBeGreaterThan(-1);
      expect(xyflowRegistration, `${specPath} xyflow registration order`).toBeLessThan(
        harnessImport
      );
      expect(registryRegistration, `${specPath} registry registration order`).toBeLessThan(
        harnessImport
      );
    }
  });

  it('keeps Impact in the overlay model without a parallel node-data contract', () => {
    expect(CANVAS_CONTROLLER_READ_MODEL_SOURCE).toContain('buildCanvasNodeInteractionPresentation');
    expect(CANVAS_CONTROLLER_READ_MODEL_SOURCE).not.toContain('buildNodesWithImpact');
    expect(DBT_NODE_COMPONENT_SOURCE).not.toContain('impactLevel');
    expect(DBT_NODE_COMPONENT_SOURCE).not.toContain('isHighlighted');
    expect(existsSync(resolve(import.meta.dirname, 'canvasImpactOverlay.ts'))).toBe(false);
  });
});
