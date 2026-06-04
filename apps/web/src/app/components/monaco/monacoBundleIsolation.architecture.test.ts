/** Owned concern: guard Monaco lazy loading and web bundle isolation semantics. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveWebManualChunk } from '../../../../vite.manualChunks';

const APP_ROOT = path.resolve(import.meta.dirname, '../../../..');
const REPO_ROOT = path.resolve(APP_ROOT, '../..');

function readAppSource(relativePathFromApp: string): string {
  return readFileSync(path.join(APP_ROOT, relativePathFromApp), 'utf8');
}

function readRepoDoc(relativePathFromRepo: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePathFromRepo), 'utf8');
}

describe('Monaco bundle isolation architecture', () => {
  it('documents Monaco bundle ownership and implementation closure', () => {
    const componentGuide = readRepoDoc(
      'docs/architecture/components/web/monaco/monaco-bundle-isolation-component.md'
    );
    const userStories = readRepoDoc(
      'docs/architecture/components/web/monaco/monaco-bundle-isolation-user-stories.md'
    );
    const plan = readRepoDoc(
      'docs/planning/proposals/mandatory/frontend-and-ux/f17e-monaco-bundle-isolation-plan-20260522.md'
    );

    for (const requiredText of [
      'resolveWebManualChunk',
      'monacoLocalWorkers',
      'monaco-vendor',
      'terminal-vendor',
      '@monaco-editor/react',
      'lazy gateways',
      'must not depend on CDN worker loading',
    ]) {
      expect(componentGuide).toContain(requiredText);
    }

    expect(userStories).toContain('US-F17E-001');
    expect(userStories).toContain('US-F17E-005');
    expect(userStories).toContain('US-F17E-006');
    expect(plan).toContain('featureId: F17E-MONACO-BUNDLE-ISOLATION-20260522');
    expect(plan).toContain('cdn.jsdelivr.net');
    expect(plan).toContain('monacoBundleIsolation.architecture.test.ts');
    expect(plan).toContain('fowlerSignals:');
    expect(plan).toContain('Hidden config semantics');
    expect(plan).toContain('Semantic Configuration');
  });

  it('keeps Monaco and terminal vendor chunk decisions explicit and pure', () => {
    expect(resolveWebManualChunk('/repo/node_modules/@monaco-editor/react/index.js')).toBe(
      'monaco-vendor'
    );
    expect(resolveWebManualChunk('/repo/node_modules/monaco-editor/esm/vs/editor.js')).toBe(
      'monaco-vendor'
    );
    expect(resolveWebManualChunk('/repo/node_modules/@xterm/xterm/lib/xterm.js')).toBe(
      'terminal-vendor'
    );
    expect(resolveWebManualChunk('/repo/node_modules/react/index.js')).toBeUndefined();
  });

  it('keeps Vite config delegated and third-party Monaco imports behind lazy surfaces', () => {
    const viteConfig = readAppSource('vite.config.ts');
    const manualChunks = readAppSource('vite.manualChunks.ts');
    const packageJson = JSON.parse(readAppSource('package.json')) as {
      dependencies?: Record<string, string>;
    };
    const codeViewer = readAppSource('src/app/components/monaco/MonacoCodeViewer.tsx');
    const codeEditor = readAppSource('src/app/components/monaco/MonacoCodeEditor.tsx');
    const diffViewer = readAppSource('src/app/components/monaco/MonacoDiffViewer.tsx');
    const codeSurface = readAppSource('src/app/components/monaco/MonacoCodeSurface.tsx');
    const diffSurface = readAppSource('src/app/components/monaco/MonacoDiffSurface.tsx');
    const localWorkers = readAppSource('src/app/components/monaco/monacoLocalWorkers.ts');

    expect(manualChunks.trimStart().startsWith('/** Owned concern:')).toBe(true);
    expect(packageJson.dependencies).toHaveProperty('monaco-editor');
    expect(viteConfig).toContain('resolveWebManualChunk');
    expect(viteConfig).toContain('manualChunks: resolveWebManualChunk');

    expect(codeViewer).toContain("lazy(() => import('./MonacoCodeSurface'))");
    expect(codeEditor).toContain("lazy(() => import('./MonacoCodeSurface'))");
    expect(diffViewer).toContain("lazy(() => import('./MonacoDiffSurface'))");

    for (const [modulePath, source] of [
      ['MonacoCodeViewer.tsx', codeViewer],
      ['MonacoCodeEditor.tsx', codeEditor],
      ['MonacoDiffViewer.tsx', diffViewer],
    ] as const) {
      expect(source, modulePath).not.toContain('@monaco-editor/react');
    }

    expect(codeSurface).toContain("from '@monaco-editor/react'");
    expect(diffSurface).toContain("from '@monaco-editor/react'");
    expect(codeSurface).toContain('configureMonacoLocalWorkers();');
    expect(diffSurface).toContain('configureMonacoLocalWorkers();');
    expect(localWorkers).toContain('loader.config({ monaco })');
    expect(localWorkers).toContain('MonacoEnvironment');
    expect(localWorkers).toContain('monaco-editor/esm/vs/editor/editor.worker?worker');
    expect(localWorkers).not.toContain('cdn.jsdelivr.net');
  });
});
