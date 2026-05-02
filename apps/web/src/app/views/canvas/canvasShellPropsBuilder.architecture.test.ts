/**
 * Owned concern: guard route-owned adaptation into concern-scoped Canvas shell contracts.
 */
import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const SHELL_PROPS_BUILDER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasShellPropsBuilder.tsx'
);

describe('canvasShellPropsBuilder architecture', () => {
  it('adapts route-owned sources into concern-scoped shell builder contracts', () => {
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellLayoutBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellPanelsBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellGraphBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellToolbarBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellGraphCommandsBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain("'./canvasShellChromeCommandsBuilder'");
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain('function buildCanvasShellLayoutArgs(');
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain('function buildCanvasShellPanelsArgs(');
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain('function buildCanvasShellGraphArgs(');
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain('function buildCanvasShellToolbarArgs(');
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain('function buildCanvasShellGraphCommandsArgs(');
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain('function buildCanvasShellChromeCommandsArgs(');
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain(
      'layout: buildCanvasShellLayout(buildCanvasShellLayoutArgs(args)),'
    );
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain('refetchDraftAfterAuthRefresh:');
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain(
      'panels: buildCanvasShellPanels(buildCanvasShellPanelsArgs(args)),'
    );
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain(
      'graph: buildCanvasShellGraph(buildCanvasShellGraphArgs(args)),'
    );
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain(
      'toolbar: buildCanvasShellToolbar(buildCanvasShellToolbarArgs(args)),'
    );
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain(
      'graphCommands: buildCanvasShellGraphCommands(buildCanvasShellGraphCommandsArgs(args)),'
    );
    expect(SHELL_PROPS_BUILDER_SOURCE).toContain(
      'chromeCommands: buildCanvasShellChromeCommands(buildCanvasShellChromeCommandsArgs(args)),'
    );
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain('layout: buildCanvasShellLayout(args),');
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain(
      'refetchDraftAfterAuthRefresh: controller.reloadLatestDraft'
    );
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain('panels: buildCanvasShellPanels(args),');
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain('graph: buildCanvasShellGraph(args),');
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain('toolbar: buildCanvasShellToolbar(args),');
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain(
      'graphCommands: buildCanvasShellGraphCommands(args),'
    );
    expect(SHELL_PROPS_BUILDER_SOURCE).not.toContain(
      'chromeCommands: buildCanvasShellChromeCommands(args),'
    );
  });
});
