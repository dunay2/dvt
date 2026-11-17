/** Owned concern: guard Monaco visual-token ownership for shared code and diff surfaces. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMonacoCodeOptions, createMonacoDiffOptions } from './monacoVisualTokens';

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
afterEach(() => vi.unstubAllGlobals());

describe('Monaco visual token architecture', () => {
  it('binds both surfaces to the existing common mono tokens without a private scale', () => {
    const tokens: Record<string, string> = {
      '--font-mono': '"IBM Plex Mono", monospace',
      '--text-mono': '0.8125rem',
      '--text-mono-line-height': '1.25rem',
    };
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('getComputedStyle', () => ({
      fontSize: '16px',
      getPropertyValue: (name: string) => tokens[name] ?? '',
    }));
    for (const options of [
      createMonacoCodeOptions({ ariaLabel: 'SQL', readOnly: false }),
      createMonacoDiffOptions({ ariaLabel: 'Diff' }),
    ])
      expect(options).toMatchObject({
        fontFamily: tokens['--font-mono'],
        fontSize: 13,
        lineHeight: 20,
      });
  });
  it('keeps option creation available before a document exists', () => {
    vi.stubGlobal('document', undefined);
    expect(createMonacoCodeOptions({ ariaLabel: 'SQL', readOnly: true }).readOnly).toBe(true);
  });
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
