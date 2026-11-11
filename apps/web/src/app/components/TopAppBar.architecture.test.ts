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
    const topBarClassesSource = chromeSource;
    expect([...chromeSource.matchAll(/export const (\w+)/gu)].map((match) => match[1])).toEqual([
      'topAppBarClasses',
    ]);
    expect(topBarClassesSource).toContain("from './ShellChrome.module.css'");
    expect(topBarClassesSource).not.toMatch(/:\s*['"`]/u);
    for (const key of [
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
      'gitRefSha',
      'smallStatusText',
      'menuButton',
    ]) {
      expect(topBarClassesSource).toContain(`${key}: styles.${key}`);
    }
    for (const sourcePath of [
      'components/TopAppBar.tsx',
      'components/shell/ShellAbout.tsx',
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
    const smallSource = readCssMedia(cssSource, 40);
    expect(readCssRule(smallSource, 'brandIdentity')).toMatch(/margin-right:\s*0\.25rem;/u);
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

  it('keeps project presentation and command dispatch behind their existing owners', () => {
    const header = readAppSource('components/TopAppBar.tsx');
    const rail = readAppSource('components/LeftNavigation.tsx');
    const project = readAppSource('components/shell/ShellProjectMenu.tsx');
    const template = readAppSource('components/shell/ShellMenu.templates.tsx');
    const selector = readAppSource('components/shell/ShellWorkspaceScopeSelector.tsx');
    expect(header).not.toMatch(/ShellFileMenu|ShellProjectMenu|useSessionStore/);
    expect(rail).toContain('ShellProjectMenu');
    expect(project).toContain('buildProjectIdentityBadge');
    expect(project).toContain('ProjectCreationDialog');
    expect(template).toContain('ShellWorkspaceContextDetails');
    expect(template).toContain('ShellWorkspaceScopeSelector');
    expect(template).toContain('CanvasWorkspaceMenuControls');
    expect(selector).toContain('useWorkspaceScopeSelection');
    expect(selector).toContain('selectWorkspaceScope');
    for (const source of [header, rail, project, template]) {
      expect(source).not.toMatch(/setTenantId|setProjectId|setEnvironmentId|fetch\s*\(/);
      expect(source.trimStart()).toMatch(OWNED_CONCERN_DOCBLOCK);
    }
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
      'docs/architecture/components/web/appshell/shell-workspace-context-component.md'
    );

    for (const requiredGuideSection of [
      '## Shell Workspace Context Component',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      'ProjectIdentityBadge',
      'ShellProjectMenu',
      'ShellWorkspaceContextDetails',
      'Workspace context is read-only content in the left-rail Project menu',
      'Tenant, project, environment, and deployment adapter labels are read-only',
      'SelectWorkspaceScope',
      '```mermaid',
    ]) {
      expect(appShellGuide).toContain(requiredGuideSection);
    }

    for (const requiredManualSignal of [
      'Global context lives in the left-rail Project menu',
      'Shell workspace context',
      'read-only presentation model',
      'shell-workspace-context-component.md',
      'shell-workspace-context-component.md',
    ]) {
      expect(workbenchManual).toContain(requiredManualSignal);
    }

    for (const requiredCanonicalSignal of [
      'ShellProjectMenu',
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
