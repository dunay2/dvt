import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '../../../..');

function readAppSource(relativePath: string): string {
  return readFileSync(path.join(APP_ROOT, relativePath), 'utf8');
}

function readRepoSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

describe('shell navigation disposition architecture', () => {
  it('keeps route-family chrome policy in the shell disposition model', () => {
    const dispositionSource = readAppSource('shell/shellNavigationDisposition.ts');
    const rootSource = readAppSource('Root.tsx');
    const frameSource = readAppSource('components/shell/AppShellFrame.tsx');

    expect(dispositionSource).toContain('Owned concern: decide shell navigation chrome posture');
    expect(dispositionSource).toContain('workbench_route');
    expect(dispositionSource).toContain("'/canvas'");
    expect(rootSource).toContain('resolveShellNavigationDisposition(location.pathname)');
    expect(frameSource).toContain('navigationDisposition.railMode');
    expect(frameSource).not.toContain("pathname.startsWith('/canvas')");
  });

  it('keeps global routes reachable through the shell menu when workbench routes hide the rail', () => {
    const rootSource = readAppSource('Root.tsx');
    const topBarSource = readAppSource('components/TopAppBar.tsx');
    const menuSource = readAppSource('components/shell/ShellMenu.tsx');
    const componentDoc = readRepoSource(
      'docs/architecture/components/web/shell-navigation-disposition-component.md'
    );

    expect(rootSource).toContain('buildShellRuntimeState(capabilitiesQuery.data).navigationModel');
    expect(rootSource).toContain('navigationModel={navigationModel}');
    expect(topBarSource).toContain('navigationModel');
    expect(menuSource).toContain('shell-menu-navigation-link');
    expect(menuSource).toContain('navigationModel.primaryItems');
    expect(menuSource).toContain('navigationModel.footerItems');
    expect(componentDoc).toContain('Public API');
    expect(componentDoc).toContain('Invariants');
    expect(componentDoc).toContain('Transitions');
    expect(componentDoc).toContain('Consumers');
  });
});
