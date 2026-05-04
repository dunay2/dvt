import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../..');

type StoreModuleExpectation = Readonly<{
  label: string;
  relativePath: string;
  ownedConcern: string;
}>;

const STORE_MODULES: readonly StoreModuleExpectation[] = [
  {
    label: 'session store',
    relativePath: 'apps/web/src/app/stores/sessionStore.ts',
    ownedConcern: 'Owned concern: own web workspace session scope and run context projection',
  },
  {
    label: 'canvas interaction store',
    relativePath: 'apps/web/src/app/stores/canvasInteractionStore.ts',
    ownedConcern:
      'Owned concern: persist route-local Canvas interaction state and hydration readiness',
  },
  {
    label: 'execution store',
    relativePath: 'apps/web/src/app/stores/executionStore.ts',
    ownedConcern: 'Owned concern: expose current runtime evidence for plan and run selection',
  },
  {
    label: 'authorization store',
    relativePath: 'apps/web/src/app/stores/authorizationStore.ts',
    ownedConcern:
      'Owned concern: expose effective web UI authorization capabilities outside runtime evidence',
  },
  {
    label: 'UI layout store',
    relativePath: 'apps/web/src/app/stores/uiLayoutStore.ts',
    ownedConcern: 'Owned concern: own workbench shell layout commands and visual preferences',
  },
  {
    label: 'platform connection store',
    relativePath: 'apps/web/src/app/stores/platformConnectionStore.ts',
    ownedConcern:
      'Owned concern: own the ProjectPlatformConnectionStatus read model for shell presentation',
  },
];

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function repoFileExists(relativePath: string): boolean {
  return existsSync(path.join(REPO_ROOT, relativePath));
}

describe('web store domain ownership architecture', () => {
  it('keeps branch Fowler analysis, component API, user stories, and local guide discoverable', () => {
    const mailboxPath =
      'buzon/20260503-codex-fowler-web-store-domain-ownership-analysis-and-remediation.md';
    const componentGuidePath =
      'docs/architecture/components/web/web-store-domain-ownership-component.md';
    const localGuidePath =
      'docs/architecture/components/web/web-store-domain-ownership-local-guide.md';
    const userStoriesPath =
      'docs/architecture/components/web/web-store-domain-ownership-user-stories.md';

    expect(repoFileExists(mailboxPath)).toBe(true);
    expect(repoFileExists(localGuidePath)).toBe(true);
    expect(repoFileExists(userStoriesPath)).toBe(true);
    expect(repoFileExists('apps/web/src/app/stores/authorizationStore.ts')).toBe(true);

    const mailbox = readRepoFile(mailboxPath);
    const componentGuide = readRepoFile(componentGuidePath);
    const localGuide = readRepoFile(localGuidePath);
    const userStories = readRepoFile(userStoriesPath);

    for (const requiredSection of [
      '## Fowler Architecture Analysis',
      '## Mature-System Comparison',
      '## Pattern Improvements',
      '## Antipatterns Detected',
      '## Component Grouping',
      '## Repetitions',
      '## Opportunities',
      '## Drift Review',
      '## Future Lessons',
      '## ADR Decision',
    ]) {
      expect(mailbox).toContain(requiredSection);
    }

    for (const componentSection of [
      '## Local Guide Boundary',
      '## Current Component Map',
      '## Store Method Inventory',
      '## Closed Drift',
      '## Verification Surfaces',
      '```mermaid',
    ]) {
      expect(componentGuide).toContain(componentSection);
    }

    for (const localGuideSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Semantic Encapsulation',
      '```mermaid',
    ]) {
      expect(localGuide).toContain(localGuideSection);
    }

    for (const duplicatedDetailSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Semantic Encapsulation',
    ]) {
      expect(componentGuide).not.toContain(duplicatedDetailSection);
    }

    expect(componentGuide).toContain('ProjectPlatformConnectionStatus');
    expect(componentGuide).toContain('PlatformConnectionState');
    expect(componentGuide).toContain('Authorization projection');
    expect(componentGuide).toContain('## Closed Drift');
    expect(componentGuide).not.toContain('## Residual Drift');
    expect(componentGuide).toContain(localGuidePath);
    expect(componentGuide).toContain(userStoriesPath);
    expect(componentGuide).toContain(mailboxPath);

    expect(localGuide).toContain('usePlatformConnectionStore');
    expect(localGuide).toContain('useUiLayoutStore');
    expect(localGuide).toContain('useCanvasInteractionStore');
    expect(localGuide).toContain('useSessionStore');
    expect(localGuide).toContain('useExecutionStore');
    expect(localGuide).toContain('useAuthorizationStore');
    expect(localGuide).toContain('connectionStatus is not layout state');
    expect(localGuide).toContain('Authorization capability display');

    expect(mailbox).toContain('No open F-05 store ownership drift remains in this branch');
    expect(mailbox).not.toContain('`executionStore.userPermissions` still');
    expect(mailbox).not.toContain('authorization split is a future F-05 implementation task');

    for (const storyId of [
      'US-WEB-STORE-001',
      'US-WEB-STORE-002',
      'US-WEB-STORE-003',
      'US-WEB-STORE-004',
      'US-WEB-STORE-005',
      'US-WEB-STORE-006',
      'US-WEB-STORE-007',
    ]) {
      expect(userStories).toContain(storyId);
    }
    expect(userStories).toContain('## Scenario Coverage Matrix');
    expect(userStories).toContain('platformConnectionStore.test.ts');
    expect(userStories).toContain('authorizationStore.test.ts');
    expect(userStories).toContain('webStoreDomainOwnership.architecture.test.ts');
  });

  it('keeps every store module labeled with its owned concern', () => {
    for (const module of STORE_MODULES) {
      const source = readRepoFile(module.relativePath);

      expect(source.trimStart().startsWith('/** Owned concern:'), module.label).toBe(true);
      expect(source, module.label).toContain(module.ownedConcern);
    }
  });

  it('guards store ownership semantics instead of only checking file thinness', () => {
    const layoutStore = readRepoFile('apps/web/src/app/stores/uiLayoutStore.ts');
    const platformConnectionStore = readRepoFile(
      'apps/web/src/app/stores/platformConnectionStore.ts'
    );
    const executionStore = readRepoFile('apps/web/src/app/stores/executionStore.ts');
    const authorizationStore = readRepoFile('apps/web/src/app/stores/authorizationStore.ts');
    const canvasStoreFacade = readRepoFile('apps/web/src/app/views/canvas/useCanvasStoreFacade.ts');
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/web-store-domain-ownership-component.md'
    );

    expect(layoutStore).toContain('type PersistedUiLayoutState');
    expect(layoutStore).toContain('canvasPalette: normalizeCanvasPaletteId(');
    expect(layoutStore).not.toContain('connectionStatus:');
    expect(layoutStore).not.toContain('setConnectionStatus');
    expect(layoutStore).not.toContain('PlatformConnectionState');

    expect(platformConnectionStore).toContain('PlatformConnectionState');
    expect(platformConnectionStore).toContain('setConnectionStatus');
    expect(componentGuide).toContain('connectionStatus is not layout state');

    expect(executionStore).not.toContain('userPermissions');
    expect(executionStore).not.toContain('Authorization');
    expect(authorizationStore).toContain('userPermissions');
    expect(authorizationStore).toContain('setUserPermissions');
    expect(canvasStoreFacade.trimStart().startsWith('/** Owned concern:'), 'canvas facade').toBe(
      true
    );
    expect(canvasStoreFacade).toContain(
      'Owned concern: compose Canvas route stores without becoming a replacement aggregate store'
    );
    expect(canvasStoreFacade).toContain("from '../../stores/authorizationStore'");
    expect(canvasStoreFacade).not.toContain(
      "ReturnType<typeof useExecutionStore.getState>['userPermissions']"
    );
    expect(componentGuide).toContain('Hard cut');
    expect(componentGuide).toContain('Authorization projection');
  });
});
