/** Owned concern: guard ShellTopBar workspace-context architecture and Fowler evidence. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '../../../..');
const OWNED_CONCERN_DOCBLOCK = /^\/\*\*\s+(?:\*\s+)?Owned concern:/u;

function readAppSource(relativePathFromApp: string): string {
  return readFileSync(path.join(APP_ROOT, relativePathFromApp), 'utf8');
}

function readRepoSource(relativePathFromRepo: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePathFromRepo), 'utf8');
}

function readCssRule(source: string, className: string): string {
  const match = source.match(new RegExp(`\\.${className}\\s*\\{([^}]+)\\}`, 'u'));
  expect(match, `CSS rule for ${className}`).not.toBeNull();
  return match![1]!;
}

function readCssMedia(source: string, minWidth: number): string {
  const match = source.match(
    new RegExp(`@media\\s*\\(min-width:\\s*${minWidth}rem\\)\\s*\\{([\\s\\S]*?)^\\}`, 'mu')
  );
  expect(match, `CSS media at ${minWidth}rem`).not.toBeNull();
  return match![1]!;
}

describe('ShellTopBar workspace context architecture', () => {
  it('keeps selected shell presentation in its CSS Module while preserving named class contracts', () => {
    const chromeSource = readAppSource('components/shell/chrome.ts');
    const topBarClassesSource = chromeSource.split('export const leftNavigationRailClasses')[0]!;
    expect(topBarClassesSource).toContain("from './ShellChrome.module.css'");
    expect(topBarClassesSource).not.toMatch(/:\s*['"`]/u);
    for (const key of [
      'appMenuButton',
      'applicationMenuContent',
      'menuItemIcon',
      'menuTriggerIcon',
      'contextMenuContent',
      'menuContextBody',
      'menuGitContext',
      'menuGitSeparator',
      'menuLanguageLabel',
      'shellBar',
      'contextCluster',
      'commandCluster',
      'readOnlyScopeField',
      'contextLabel',
      'gitRef',
      'gitRefIcon',
      'gitRefSeparator',
      'gitRefSha',
      'projectIdentityBadge',
      'contextChip',
      'contextChipIcon',
      'contextChipLabel',
      'contextChipMeta',
      'contextChipSeparator',
      'smallStatusText',
      'menuButton',
    ]) {
      expect(topBarClassesSource).toContain(`${key}: styles.${key}`);
    }
    for (const sourcePath of [
      'components/TopAppBar.tsx',
      'components/shell/ShellAppMenu.tsx',
      'components/shell/ShellMenu.templates.tsx',
    ]) {
      expect(readAppSource(sourcePath), sourcePath).not.toMatch(
        /\bclassName\s*=\s*['"]|\bstyle\s*=/u
      );
    }
  });

  it('preserves header wrapping below 48rem and the 48rem/64rem responsive CSS contracts', () => {
    const cssSource = readAppSource('components/shell/ShellChrome.module.css');
    expect(readCssRule(cssSource, 'shellBar')).toMatch(/flex-wrap:\s*wrap;/u);
    expect(readCssRule(cssSource, 'shellBar')).toMatch(/min-height:\s*2\.5rem;/u);
    for (const className of ['contextCluster', 'commandCluster']) {
      expect(readCssRule(cssSource, className)).toMatch(/width:\s*100%;/u);
    }
    expect(readCssRule(cssSource, 'commandCluster')).toMatch(/flex-wrap:\s*wrap;/u);
    const mediumSource = readCssMedia(cssSource, 48);
    expect(readCssRule(mediumSource, 'shellBar')).toMatch(/height:\s*2\.5rem;/u);
    expect(readCssRule(mediumSource, 'contextCluster')).toMatch(/flex:\s*1;/u);
    expect(readCssRule(mediumSource, 'commandCluster')).toMatch(/flex-shrink:\s*0;/u);
    for (const className of ['contextCluster', 'commandCluster']) {
      expect(readCssRule(mediumSource, className)).toMatch(/width:\s*auto;/u);
    }
    for (const className of ['shellBar', 'commandCluster']) {
      expect(readCssRule(mediumSource, className)).toMatch(/flex-wrap:\s*nowrap;/u);
    }
    expect(readCssRule(cssSource, 'gitRef')).toMatch(/display:\s*none;/u);
    expect(readCssRule(readCssMedia(cssSource, 64), 'gitRef')).toMatch(/display:\s*flex;/u);
    const smallSource = readCssMedia(cssSource, 40);
    expect(readCssRule(smallSource, 'appMenuButton')).toMatch(/margin-right:\s*0\.25rem;/u);
    expect(smallSource).not.toMatch(/\.(?:shellBar|contextCluster|commandCluster)\b/u);
  });

  it.each([
    ['/** Owned concern: read context. */', true],
    ['/**\n * Owned concern: read context.\n */', true],
    ['/**\r\n * Owned concern: read context.\r\n */', true],
    ['/**\nOwned concern: read context.\n */', true],
    ['import "context";\n/** Owned concern: read context. */', false],
    ['/* Owned concern: read context. */', false],
    ['/** Other prose before Owned concern: read context. */', false],
    ['/** owned concern: read context. */', false],
    ['', false],
  ] as const)('checks concern ownership independently of wrapping: %j', (source, accepted) => {
    expect(OWNED_CONCERN_DOCBLOCK.test(source.trimStart())).toBe(accepted);
  });

  it('encapsulates workspace identity as a read-only presentation model', () => {
    const topAppBarSource = readAppSource('components/TopAppBar.tsx');
    const identityModelSource = readAppSource('shell/projectIdentityBadge.ts');
    const identityRendererSource = readAppSource('components/shell/ShellProjectIdentityBadge.tsx');
    const contextMenuSource = readAppSource('components/shell/ShellWorkspaceContextMenu.tsx');
    const contextDetailsSource = readAppSource('components/shell/ShellWorkspaceContextDetails.tsx');
    const scopeSelectorSource = readAppSource('components/shell/ShellWorkspaceScopeSelector.tsx');
    const chromeSource = readAppSource('components/shell/chrome.ts');
    const rootShellTestSupportSource = readAppSource('Root.shellChrome.test.support.ts');

    for (const [label, source] of [
      ['TopAppBar', topAppBarSource],
      ['ProjectIdentityBadge', identityModelSource],
      ['ShellProjectIdentityBadge', identityRendererSource],
      ['ShellWorkspaceContextMenu', contextMenuSource],
      ['ShellWorkspaceContextDetails', contextDetailsSource],
      ['ShellWorkspaceScopeSelector', scopeSelectorSource],
      ['shell chrome class contract', chromeSource],
      ['Root shell chrome test support', rootShellTestSupportSource],
    ] as const) {
      expect(source.trimStart(), label).toMatch(OWNED_CONCERN_DOCBLOCK);
    }

    expect(topAppBarSource).toContain('buildProjectIdentityBadge');
    expect(topAppBarSource).toContain('ShellProjectIdentityBadge');
    expect(topAppBarSource).toContain('ShellWorkspaceContextMenu');
    expect(topAppBarSource).not.toContain('ShellWorkspaceSelectors');
    expect(topAppBarSource).not.toContain("from './ui/select'");
    expect(identityModelSource).toContain('type ProjectIdentityBadge');
    expect(identityModelSource).toContain('targetAdapter');
    expect(identityModelSource).toContain('draftPostureLabel');
    expect(identityRendererSource).toContain('data-slot="shell-project-identity-badge"');
    expect(contextMenuSource).toContain('data-slot="shell-workspace-context-trigger"');
    expect(contextMenuSource).toContain('ShellWorkspaceContextDetails');
    expect(contextMenuSource).toContain('ShellWorkspaceScopeSelector');
    expect(contextMenuSource).not.toContain('workspace-scope commands');
    expect(contextMenuSource).not.toContain('ShellWorkspaceScopeCommands');
    expect(contextMenuSource).not.toContain('ShellWorkspaceSelectors');
    expect(scopeSelectorSource).toContain('useWorkspaceScopeSelection');
    expect(scopeSelectorSource).toContain('selectWorkspaceScope');
    expect(scopeSelectorSource).not.toContain('useSessionStore');

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
    expect(contextDetailsSource).toContain('data-slot="shell-workspace-deployment-context"');
    expect(contextDetailsSource).toContain('copy.tenantScopeAria');
    expect(contextDetailsSource).toContain('copy.projectScopeAria');
    expect(contextDetailsSource).toContain('copy.environmentScopeAria');
    expect(contextDetailsSource).toContain('copy.deploymentScopeAria');
  });

  it('documents API, invariants, transitions, consumers, and user stories', () => {
    const appShellGuide = readRepoSource('docs/architecture/components/web/appshell/app-shell.md');
    const workbenchManual = readRepoSource(
      'docs/architecture/components/web/screen-manuals-and-user-stories.md'
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
      'Tenant, project, environment, and deployment adapter scope are read-only inside an active project',
      'Project changes belong to a separate governed project-selection',
      '```mermaid',
    ]) {
      expect(appShellGuide).toContain(requiredGuideSection);
    }

    for (const requiredManualSignal of [
      'Global context lives in compact top-bar labels',
      'Shell workspace context',
      'read-only presentation model',
      'shell-workspace-context-component.md',
      'shell-workspace-context-user-stories.md',
    ]) {
      expect(workbenchManual).toContain(requiredManualSignal);
    }

    for (const requiredCanonicalSignal of [
      'ShellWorkspaceContextMenu',
      'Semantic Fitness Function',
      '## Scenario Matrix',
    ]) {
      expect(`${componentGuide}\n${userStories}`).toContain(requiredCanonicalSignal);
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
