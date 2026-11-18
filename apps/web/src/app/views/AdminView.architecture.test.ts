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

  it('delegates URL position to the route contract and data access to section owners', () => {
    const admin = readViewSource('AdminView.tsx');
    expect(admin).toContain("from './admin/adminRoutePosition'");
    expect(admin).not.toMatch(/useState\(|useQuery\(|\bfetch\(|new URLSearchParams/u);
    expect(admin).not.toMatch(/TabsList|ViewHeader/u);
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
