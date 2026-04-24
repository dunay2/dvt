import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const DOC_PATH = join(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/graph/canvas-empty-authoring-entrypoint-component.md'
);
const NODE_COMMAND_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasAuthoringNodeCommand.ts'
);
const NODE_CREATION_HANDLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasAuthoringNodeCreationHandlers.ts'
);
const NODE_AUTHORING_HANDLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeAuthoringHandlers.ts'
);
const CENTER_WORKBENCH_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasCenterSurfaceWorkbench.tsx'
);

describe('Canvas empty authoring entrypoint architecture', () => {
  it('ships a component guide with public API, invariants, transitions, and consumers', () => {
    expect(existsSync(DOC_PATH)).toBe(true);

    const docText = readFileSync(DOC_PATH, 'utf8');
    for (const section of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Component Flow',
      '## Consumers',
      '## Drift To Prevent',
    ]) {
      expect(docText).toContain(section);
    }
    expect(docText).toContain('```mermaid');
    expect(docText).toContain('CanvasKindRegistration');
    expect(docText).toContain('canvasDocument.kind');
  });

  it('states owned concern docblocks on the entrypoint modules', () => {
    for (const source of [
      NODE_COMMAND_SOURCE,
      NODE_CREATION_HANDLER_SOURCE,
      NODE_AUTHORING_HANDLER_SOURCE,
      CENTER_WORKBENCH_SOURCE,
    ]) {
      expect(source).toContain('Owned concern:');
    }
  });

  it('creates nodes from the typed canvas catalog through the existing draft lifecycle', () => {
    expect(CENTER_WORKBENCH_SOURCE).toContain('deriveCanvasHostCycleState');
    expect(CENTER_WORKBENCH_SOURCE).toContain("cycleState.kind !== 'typed_empty'");
    expect(CENTER_WORKBENCH_SOURCE).toContain('cycleState.nodeKinds');
    expect(CENTER_WORKBENCH_SOURCE).toContain('cycleState.onCreateAuthoringNode');
    expect(NODE_CREATION_HANDLER_SOURCE).toContain('buildAuthoringNodeCommand');
    expect(NODE_CREATION_HANDLER_SOURCE).toContain('dropCanonicalNode');
    expect(NODE_CREATION_HANDLER_SOURCE).toContain('canvasGraphLifecycle.node.admitExplicit');
    expect(NODE_CREATION_HANDLER_SOURCE).not.toContain('WorkspaceGraphDraft');
    expect(NODE_CREATION_HANDLER_SOURCE).not.toContain('DesignGraphDraft');
  });

  it('keeps the node authoring hook as a composition seam, not a second implementation path', () => {
    expect(NODE_AUTHORING_HANDLER_SOURCE).toContain('useCanvasNodeDropHandlers');
    expect(NODE_AUTHORING_HANDLER_SOURCE).toContain('useCanvasAuthoringNodeCreationHandlers');
    expect(NODE_AUTHORING_HANDLER_SOURCE).toContain('useCanvasNodeRemovalHandlers');
    expect(NODE_AUTHORING_HANDLER_SOURCE).not.toContain('dropCanonicalNode');
    expect(NODE_AUTHORING_HANDLER_SOURCE).not.toContain('toast.');
  });
});
