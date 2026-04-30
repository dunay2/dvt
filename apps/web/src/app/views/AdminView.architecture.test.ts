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
  it('documents the Fowler review and route-position component semantics for this branch', () => {
    const mailbox = readRepoFile('buzon/20260430-codex-frontend-operability-fowler-review.md');
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/admin-route-position-component.md'
    );
    const backlog = readRepoFile(
      'docs/planning/proposals/web-frontend-operability-backlog-20260430.md'
    );

    expect(mailbox).toContain('## Fowler verdict');
    expect(mailbox).toContain('## Comparison with mature systems');
    expect(mailbox).toContain('## Pattern improvements');
    expect(mailbox).toContain('## Antipatterns detected');
    expect(mailbox).toContain('## Repetitions and grouping');
    expect(mailbox).toContain('## Drift fixed in this branch');
    expect(mailbox).toContain('## Opportunities');
    expect(mailbox).toContain('## Lessons for future slices');
    expect(mailbox).toContain('## ADR decision');

    expect(componentGuide).toContain('## Public API');
    expect(componentGuide).toContain('## Invariants');
    expect(componentGuide).toContain('## Transitions');
    expect(componentGuide).toContain('## Consumers');
    expect(componentGuide).toContain('## Semantic Encapsulation');
    expect(componentGuide).toContain('```mermaid');
    expect(componentGuide).toContain('?tab=audit');

    expect(backlog).toContain('## User Stories');
    expect(backlog).toContain('US-FRONT-OPERABILITY-001');
    expect(backlog).toContain('US-FRONT-OPERABILITY-006');
    expect(backlog).toContain('## Scenario Coverage Matrix');
    expect(backlog).toContain('## TDD Traceability');
  });

  it('keeps route-position semantics in AdminView and tests the browser refresh contract', () => {
    const adminSource = readViewSource('AdminView.tsx');
    const adminTestSource = readViewSource('AdminView.test.tsx');

    expect(adminSource.trimStart().startsWith('/** Owned concern:')).toBe(true);
    expect(adminSource).toContain('useSearchParams');
    expect(adminSource).toContain('function resolveActiveAdminTab(');
    expect(adminSource).toContain('handleTabChange');
    expect(adminSource).toContain("nextSearchParams.set('tab', nextTab)");
    expect(adminSource).not.toContain('useState(');

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
});
