import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const SHELL_TYPES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasShell.types.ts'
);

describe('canvasShell.types architecture', () => {
  it('groups the shell API by semantic concern instead of one flat prop bag', () => {
    expect(SHELL_TYPES_SOURCE).toContain('export type CanvasShellLayout = {');
    expect(SHELL_TYPES_SOURCE).toContain('export type CanvasShellPanels = {');
    expect(SHELL_TYPES_SOURCE).toContain('export type CanvasShellGraph = {');
    expect(SHELL_TYPES_SOURCE).toContain('export type CanvasShellToolbar = {');
    expect(SHELL_TYPES_SOURCE).toContain('export type CanvasShellGraphCommands = {');
    expect(SHELL_TYPES_SOURCE).toContain('export type CanvasShellChromeCommands = {');
    expect(SHELL_TYPES_SOURCE).toContain('layout: CanvasShellLayout;');
    expect(SHELL_TYPES_SOURCE).toContain('panels: CanvasShellPanels;');
    expect(SHELL_TYPES_SOURCE).toContain('graph: CanvasShellGraph;');
    expect(SHELL_TYPES_SOURCE).toContain('toolbar: CanvasShellToolbar;');
    expect(SHELL_TYPES_SOURCE).toContain('graphCommands: CanvasShellGraphCommands;');
    expect(SHELL_TYPES_SOURCE).toContain('chromeCommands: CanvasShellChromeCommands;');
  });
});
