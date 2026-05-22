/** Owned concern: guard Monaco visual-token ownership for shared code and diff surfaces. */
import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../../views/architecture.test.support';

const TOKEN_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'monacoVisualTokens.ts');
const FALLBACK_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'MonacoViewerFallback.tsx'
);
const CODE_SURFACE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'MonacoCodeSurface.tsx'
);
const DIFF_SURFACE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'MonacoDiffSurface.tsx'
);
const FRAME_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../workbench/RouteWorkbenchFrame.tsx'
);

describe('Monaco visual token architecture', () => {
  it('keeps Monaco container, theme, and option presets behind Monaco visual tokens', () => {
    expect(TOKEN_SOURCE).toContain('Owned concern: own Monaco visual tokens');
    expect(TOKEN_SOURCE).toContain('monacoVisualClasses');
    expect(TOKEN_SOURCE).toContain('monacoTheme');
    expect(TOKEN_SOURCE).toContain('createMonacoCodeOptions');
    expect(TOKEN_SOURCE).toContain('createMonacoDiffOptions');

    for (const source of [FALLBACK_SOURCE, CODE_SURFACE_SOURCE, DIFF_SURFACE_SOURCE]) {
      expect(source).toContain('monacoVisualTokens');
      expect(source).not.toContain('theme="vs-dark"');
      expect(source).not.toContain("theme='vs-dark'");
    }

    expect(FRAME_SOURCE).not.toContain('routeWorkbenchMonacoSurfaceClassName');
  });
});
