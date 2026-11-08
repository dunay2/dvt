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
    expect(dispositionSource).toContain("'/runs'");
    expect(readAppSource('components/TopAppBar.tsx')).toContain(
      'resolveShellNavigationDisposition(location.pathname)'
    );
    expect(frameSource).toContain('ShellActivityRailProvider');
    expect(frameSource).not.toContain('railMode');
    expect(rootSource).not.toContain('resolveShellNavigationDisposition');
    expect(frameSource).not.toContain("pathname.startsWith('/canvas')");
  });

  it('keeps direct global routes in one shell projection without moving policy into Explorer', () => {
    const rootSource = readAppSource('Root.tsx');
    const topBarSource = readAppSource('components/TopAppBar.tsx');
    const railSource = readAppSource('components/LeftNavigation.tsx');
    const explorerSource = readAppSource('views/canvas/explorer/CanvasExplorer.tsx');
    const entriesSource = readAppSource('components/shell/ShellMenu.templates.tsx');
    const componentDoc = readRepoSource(
      'docs/architecture/components/web/shell-navigation-disposition-component.md'
    );

    expect(rootSource).toContain(
      'buildShellRuntimeState(capabilitiesQuery.data, applicationLanguage).navigationModel'
    );
    expect(rootSource).toContain('navigationModel={navigationModel}');
    expect(topBarSource).not.toContain('navigationModel');
    expect(railSource).toContain('navigationModel.primaryItems');
    expect(railSource).toContain('navigationModel.footerItems');
    expect(railSource).not.toMatch(/useShellRuntime|plugins\/registry|capabilitiesPort/u);
    expect(entriesSource).not.toContain('ShellNavigationEntriesTemplate');
    expect(explorerSource).not.toMatch(/shellNavigationModel|useNavigate|NavLink/u);
    expect(railSource).toContain('shell-project-code-command');
    expect(railSource).not.toContain('ShellActivityRailHost');
    expect(readAppSource('views/canvas/explorer/CanvasExplorer.templates.tsx')).not.toContain(
      'createPortal'
    );
    expect(componentDoc).toContain('Public API');
    expect(componentDoc).toContain('Invariants');
    expect(componentDoc).toContain('Transitions');
    expect(componentDoc).toContain('Consumers');
  });
});
