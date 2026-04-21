import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CANVAS_SHELL_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'CanvasShell.tsx');

describe('CanvasShell architecture', () => {
  it('delegates sizing and rail composition to named shell-local seams', () => {
    expect(CANVAS_SHELL_SOURCE).toContain(
      'function resolveCanvasShellMainPanelDefaultSize('
    );
    expect(CANVAS_SHELL_SOURCE).toContain('function CanvasShellExplorerRail(');
    expect(CANVAS_SHELL_SOURCE).toContain('function CanvasShellMainPanel(');
    expect(CANVAS_SHELL_SOURCE).toContain('function CanvasShellInspectorRail(');
    expect(CANVAS_SHELL_SOURCE).toContain(
      'defaultSize={resolveCanvasShellMainPanelDefaultSize(layout)}'
    );
  });
});
