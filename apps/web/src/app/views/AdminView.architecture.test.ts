import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../..');

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function repoFileExists(relativePath: string): boolean {
  return existsSync(path.join(REPO_ROOT, relativePath));
}

function readViewSource(relativePathFromViews: string): string {
  return readFileSync(path.resolve(import.meta.dirname, relativePathFromViews), 'utf8');
}

describe('Admin route architecture', () => {
  it('documents the route-position component semantics', () => {
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/admin-route-position-component.md'
    );

    expect(componentGuide).toContain('## Public API');
    expect(componentGuide).toContain('## Invariants');
    expect(componentGuide).toContain('## Transitions');
    expect(componentGuide).toContain('## Consumers');
    expect(componentGuide).toContain('## Semantic Encapsulation');
    expect(componentGuide).toContain('```mermaid');
    expect(componentGuide).toContain('?tab=audit');
  });

  it('keeps one route-position contract for the passive view and shell menu', () => {
    const adminSource = readViewSource('AdminView.tsx');
    const adminTestSource = readViewSource('AdminView.test.tsx');
    const position = readViewSource('admin/adminRoutePosition.ts');

    expect(adminSource.trimStart().startsWith('/** Owned concern:')).toBe(true);
    expect(adminSource).toContain('useSearchParams');
    expect(adminSource).toContain('resolveActiveAdminTab(searchParams, initialTab)');
    expect(adminSource).toContain("from './admin/adminRoutePosition'");
    expect(position).toContain('function resolveActiveAdminTab(');
    expect(position).toContain('function buildAdminSectionLocation(');
    expect(position).toContain("search.set('tab',");
    expect(adminSource).not.toContain('useState(');
    expect(adminSource).not.toMatch(/TabsList|ViewHeader|handleTabChange/u);
    expect(adminSource).toContain('aria-label={copy.tabs[activeTab]}');

    expect(adminTestSource).toContain(
      'records the selected tab in the route so F5 keeps the operator position'
    );
    expect(adminTestSource).toContain(
      'hydrates the selected tab from the route after a browser refresh'
    );
    expect(adminTestSource).toContain("initialEntry: '/admin?tab=audit'");
  });

  it('keeps the route-position component discoverable from the web component index', () => {
    const webIndex = readRepoFile('docs/architecture/components/web/index.md');

    expect(
      repoFileExists('docs/architecture/components/web/admin-route-position-component.md')
    ).toBe(true);
    expect(webIndex).toContain('Admin route position component');
  });

  it('projects operational facts once before the summary and endpoint detail consumers', () => {
    // Independent status derivation previously made the summary contradict endpoint details.
    const owner = readViewSource('admin/useAdminViewData.ts');
    expect(owner).toContain('buildAdminPlatformHealthPresentation');
    expect(owner).not.toContain('selectPlatformConnectionState');
    for (const consumer of ['AdminPlatformSummaryCards.tsx', 'AdminProbeDetailsCard.tsx']) {
      const source = readViewSource(`admin/${consumer}`);
      expect(source).toContain('health.probes');
      expect(source).not.toMatch(/usePlatformHealthSnapshotQuery|\.availability|\.data\?/u);
    }
    const badge = readViewSource('admin/AdminStatusBadge.tsx');
    expect(badge).toContain('AdminStatusTone');
    expect(badge).not.toContain('ok: boolean');
    expect(readViewSource('admin/adminViewModel.ts')).toContain(
      'buildShellHealthPresentationModel(input)'
    );
  });
});
