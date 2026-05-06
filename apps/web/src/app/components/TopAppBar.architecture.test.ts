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
    const contextDetailsSource = readAppSource('components/shell/ShellWorkspaceContextDetails.tsx');
    const chromeSource = readAppSource('components/shell/chrome.ts');
    const rootShellTestSupportSource = readAppSource('Root.shellChrome.test.support.ts');

    for (const [label, source] of [
      ['TopAppBar', topAppBarSource],
      ['ProjectIdentityBadge', identityModelSource],
      ['ShellProjectIdentityBadge', identityRendererSource],
      ['ShellWorkspaceContextMenu', contextMenuSource],
      ['ShellWorkspaceContextDetails', contextDetailsSource],
      ['shell chrome class contract', chromeSource],
      ['Root shell chrome test support', rootShellTestSupportSource],
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
    expect(contextMenuSource).toContain('ShellWorkspaceContextDetails');
    expect(contextMenuSource).toContain(
      'Owned concern: expose active workspace scope as read-only shell context.'
    );
    expect(contextMenuSource).not.toContain('workspace-scope commands');
    expect(contextMenuSource).not.toContain('ShellWorkspaceScopeCommands');
    expect(contextMenuSource).not.toContain('ShellWorkspaceSelectors');

    for (const forbiddenMutationSignal of [
      'setSelectedTenant',
      'setSelectedProject',
      'setSelectedEnvironment',
      'setTenantId',
      'setProjectId',
      'setEnvironmentId',
      'onValueChange',
      "from '../ui/select'",
    ]) {
      expect(topAppBarSource, forbiddenMutationSignal).not.toContain(forbiddenMutationSignal);
      expect(contextMenuSource, forbiddenMutationSignal).not.toContain(forbiddenMutationSignal);
      expect(contextDetailsSource, forbiddenMutationSignal).not.toContain(forbiddenMutationSignal);
    }

    expect(contextDetailsSource).toContain('data-slot="shell-workspace-context-details"');
    expect(contextDetailsSource).toContain('data-slot="shell-workspace-tenant-context"');
    expect(contextDetailsSource).toContain('data-slot="shell-workspace-project-context"');
    expect(contextDetailsSource).toContain('data-slot="shell-workspace-environment-context"');
    expect(contextDetailsSource).toContain('Tenant scope (read only)');
    expect(contextDetailsSource).toContain('Project scope (read only)');
    expect(contextDetailsSource).toContain('Environment scope (read only)');
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
    const hardeningMailboxReview = readRepoSource(
      'buzon/20260506-codex-fowler-canvas-workbench-shell-context-hardening-review.md'
    );
    const componentGuide = readRepoSource(
      'docs/architecture/components/web/appshell/shell-workspace-context-component.md'
    );
    const userStories = readRepoSource(
      'docs/architecture/components/web/appshell/shell-workspace-context-user-stories.md'
    );

    for (const requiredGuideSection of [
      '## Shell Workspace Context Component',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      'ProjectIdentityBadge',
      'ShellWorkspaceContextMenu',
      'ShellWorkspaceContextDetails',
      'Workspace context is breadcrumb-style read-only content on the main screen',
      'Tenant, project, and environment scope are read-only inside an active project',
      'Project changes belong to a separate governed project-selection',
      '```mermaid',
    ]) {
      expect(appShellGuide).toContain(requiredGuideSection);
    }

    for (const requiredInventorySignal of [
      'Global context lives in compact top-bar labels',
      'Shell workspace context',
      'read-only presentation model',
      'shell-workspace-context-component.md',
      'shell-workspace-context-user-stories.md',
    ]) {
      expect(workbenchInventory).toContain(requiredInventorySignal);
    }

    for (const requiredPlanSignal of [
      'shell-context-relocation',
      'ProjectIdentityBadge',
      'ShellWorkspaceContextMenu',
      'ShellWorkspaceContextDetails',
      'buzon/20260506-codex-fowler-canvas-workbench-shell-context-review-and-risk.md',
      'buzon/20260506-codex-fowler-canvas-workbench-shell-context-hardening-review.md',
      'ShellWorkspaceContextComponentGuide',
      'ShellWorkspaceContextUserStories',
      'workspace-context-read-only-main-screen',
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

    for (const requiredHardeningSection of [
      '## Fowler Architecture Analysis',
      '## Mature-System Comparison',
      '## Patterns Improved',
      '## Antipatterns Detected',
      '## Component Grouping',
      '## Repetitions Fixed',
      '## Drift Fixed',
      '## Opportunities',
      '## Teachings For Future Work',
      '## Recommendations And Risks',
      '## ADR Decision',
    ]) {
      expect(hardeningMailboxReview).toContain(requiredHardeningSection);
    }

    for (const requiredComponentGuideSection of [
      '# Shell Workspace Context Component',
      '## Public API',
      'ShellWorkspaceContextDetails',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Flow',
      '## Semantic Fitness Function',
      '```mermaid',
    ]) {
      expect(componentGuide).toContain(requiredComponentGuideSection);
    }

    for (const requiredStorySection of [
      '# Shell Workspace Context User Stories',
      '## Scenario Matrix',
      '## User Stories',
      'US-SWC-1',
      'US-SWC-2',
      'US-SWC-3',
      'US-SWC-4',
      'US-SWC-5',
      'US-SWC-6',
      '## Coverage Map',
      '```mermaid',
    ]) {
      expect(userStories).toContain(requiredStorySection);
    }
  });
});
