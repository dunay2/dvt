/** Owned concern: guard ShellTopBar workspace-context architecture and Fowler evidence. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '../../../..');

function readAppSource(relativePathFromApp: string): string {
  return readFileSync(path.join(APP_ROOT, relativePathFromApp), 'utf8');
}

function readRepoSource(relativePathFromRepo: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePathFromRepo), 'utf8');
}

describe('ShellTopBar workspace context architecture', () => {
  it('encapsulates workspace identity as a read-only presentation model', () => {
    const topAppBarSource = readAppSource('components/TopAppBar.tsx');
    const identityModelSource = readAppSource('shell/projectIdentityBadge.ts');
    const identityRendererSource = readAppSource('components/shell/ShellProjectIdentityBadge.tsx');
    const contextMenuSource = readAppSource('components/shell/ShellWorkspaceContextMenu.tsx');
    const selectorsSource = readAppSource('components/shell/ShellWorkspaceSelectors.tsx');

    for (const [label, source] of [
      ['TopAppBar', topAppBarSource],
      ['ProjectIdentityBadge', identityModelSource],
      ['ShellProjectIdentityBadge', identityRendererSource],
      ['ShellWorkspaceContextMenu', contextMenuSource],
      ['ShellWorkspaceSelectors', selectorsSource],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), label).toBe(true);
    }

    expect(topAppBarSource).toContain('buildProjectIdentityBadge');
    expect(topAppBarSource).toContain('ShellProjectIdentityBadge');
    expect(topAppBarSource).toContain('ShellWorkspaceContextMenu');
    expect(topAppBarSource).not.toContain('ShellWorkspaceSelectors');
    expect(topAppBarSource).not.toContain("from './ui/select'");
    expect(identityModelSource).toContain('type ProjectIdentityBadge');
    expect(identityModelSource).toContain('draftPostureLabel');
    expect(identityRendererSource).toContain('data-slot="shell-project-identity-badge"');
    expect(contextMenuSource).toContain('data-slot="shell-workspace-context-trigger"');
    expect(contextMenuSource).toContain('ShellWorkspaceSelectors');
    expect(selectorsSource).toContain('setSelectedTenant');
    expect(selectorsSource).toContain('setSelectedProject');
    expect(selectorsSource).toContain('setSelectedEnvironment');
  });

  it('documents API, invariants, transitions, consumers, and recorded risks', () => {
    const appShellGuide = readRepoSource('docs/architecture/components/web/appshell/app-shell.md');
    const workbenchInventory = readRepoSource(
      'docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md'
    );
    const stage1Plan = readRepoSource(
      'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md'
    );
    const mailboxReview = readRepoSource(
      'buzon/20260506-codex-fowler-canvas-workbench-shell-context-review-and-risk.md'
    );

    for (const requiredGuideSection of [
      '## Shell Workspace Context Component',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      'ProjectIdentityBadge',
      'ShellWorkspaceContextMenu',
      'setTenantId',
      'setProjectId',
      'setEnvironmentId',
      '```mermaid',
    ]) {
      expect(appShellGuide).toContain(requiredGuideSection);
    }

    for (const requiredInventorySignal of [
      'Global context lives in compact top-bar labels',
      'Shell workspace context',
      'read-only presentation model',
    ]) {
      expect(workbenchInventory).toContain(requiredInventorySignal);
    }

    for (const requiredPlanSignal of [
      'shell-context-relocation',
      'ProjectIdentityBadge',
      'ShellWorkspaceContextMenu',
      'buzon/20260506-codex-fowler-canvas-workbench-shell-context-review-and-risk.md',
    ]) {
      expect(stage1Plan).toContain(requiredPlanSignal);
    }

    for (const requiredMailboxSection of [
      '## Mature-System Comparison',
      '## Antipatterns Detected',
      '## Patterns Applied',
      '## Repetitions Fixed',
      '## Drift Fixed',
      '## Recommendations And Risks',
      'ShellWorkspaceContextMenu',
      'Semantic Fitness Function',
    ]) {
      expect(mailboxReview).toContain(requiredMailboxSection);
    }
  });
});
