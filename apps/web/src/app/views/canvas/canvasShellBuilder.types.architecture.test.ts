/**
 * Owned concern: guard concern-scoped builder vocabulary for Canvas shell composition.
 */
import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const SHELL_BUILDER_TYPES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasShellBuilder.types.ts'
);

describe('canvasShellBuilder.types architecture', () => {
  it('splits shell subbuilder inputs by concern instead of one broad args bag', () => {
    expect(SHELL_BUILDER_TYPES_SOURCE).toContain(
      'export type CanvasShellRouteComposerArgs = Readonly<{'
    );
    expect(SHELL_BUILDER_TYPES_SOURCE).toContain(
      'export type CanvasShellLayoutBuilderArgs = Readonly<{'
    );
    expect(SHELL_BUILDER_TYPES_SOURCE).toContain(
      'export type CanvasShellPanelsBuilderArgs = Readonly<{'
    );
    expect(SHELL_BUILDER_TYPES_SOURCE).toContain(
      'export type CanvasShellGraphBuilderArgs = Readonly<{'
    );
    expect(SHELL_BUILDER_TYPES_SOURCE).toContain(
      'export type CanvasShellToolbarBuilderArgs = Readonly<{'
    );
    expect(SHELL_BUILDER_TYPES_SOURCE).toContain(
      'export type CanvasShellGraphCommandsBuilderArgs = Readonly<{'
    );
    expect(SHELL_BUILDER_TYPES_SOURCE).toContain(
      'export type CanvasShellChromeCommandsBuilderArgs = Readonly<{'
    );
    expect(SHELL_BUILDER_TYPES_SOURCE).not.toContain(
      'export type CanvasShellBuilderArgs = Readonly<{'
    );
  });
});
