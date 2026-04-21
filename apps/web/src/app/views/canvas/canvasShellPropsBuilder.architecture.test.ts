import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const SHELL_PROPS_BUILDER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasShellPropsBuilder.tsx'
);

describe('canvasShellPropsBuilder architecture', () => {
  it('delegates grouped shell concern assembly to dedicated subbuilders', () => {
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellLayoutBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellPanelsBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellGraphBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellToolbarBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellGraphCommandsBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellChromeCommandsBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain('layout: buildCanvasShellLayout(args),');
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain('panels: buildCanvasShellPanels(args),');
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain('graph: buildCanvasShellGraph(args),');
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain('toolbar: buildCanvasShellToolbar(args),');
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain(
      'graphCommands: buildCanvasShellGraphCommands(args),'
    );
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain(
      'chromeCommands: buildCanvasShellChromeCommands(args),'
    );
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain('layout: {');
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain('panels: {');
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain('graph: {');
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain('toolbar: {');
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain('graphCommands: {');
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain('chromeCommands: {');
  });
});
