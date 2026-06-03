import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../../..');

const REQUIRED_DOCS = [
  'docs/adr/ADR-0056-web-ui-authority-is-server-projected.md',
  'docs/planning/proposals/mandatory/frontend-and-ux/web-api-authority-hardcut-plan-20260510.md',
  'docs/architecture/components/web/workspace/web-api-authority-hardcut-component.md',
  'docs/architecture/components/web/workspace/web-api-authority-hardcut-user-stories.md',
  'buzon/20260510-codex-fowler-web-api-authority-hardcut-analysis.md',
] as const;

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

describe('web API authority hardcut architecture', () => {
  it('documents the authority projection decision, component API, invariants, and scenarios', () => {
    for (const docPath of REQUIRED_DOCS) {
      const source = readRepoFile(docPath);

      expect(source).toContain('server');
      expect(source).toContain('authority');
      expect(source).toContain('```mermaid');
    }

    const componentGuide = readRepoFile(
      'docs/architecture/components/web/workspace/web-api-authority-hardcut-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/workspace/web-api-authority-hardcut-user-stories.md'
    );
    const analysis = readRepoFile(
      'buzon/20260510-codex-fowler-web-api-authority-hardcut-analysis.md'
    );

    for (const section of ['## Public API', '## Invariants', '## Transitions', '## Consumers']) {
      expect(componentGuide).toContain(section);
    }

    for (const storyId of [
      'US-WEB-AUTH-001',
      'US-WEB-AUTH-002',
      'US-WEB-AUTH-003',
      'US-WEB-AUTH-004',
      'US-WEB-AUTH-005',
      'US-WEB-AUTH-006',
      'US-WEB-AUTH-007',
    ]) {
      expect(userStories).toContain(storyId);
    }

    for (const section of [
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
      expect(analysis).toContain(section);
    }
  });

  it('keeps product authority fail-closed instead of frontend-local or optimistic', () => {
    const authorizationStore = readRepoFile('apps/web/src/app/stores/authorizationStore.ts');
    const capabilitiesPort = readRepoFile(
      'apps/web/src/app/services/capabilities/capabilitiesPort.ts'
    );
    const registry = readRepoFile('apps/web/src/app/plugins/registry.ts');

    expect(authorizationStore.trimStart().startsWith('/** Owned concern:')).toBe(true);
    expect(authorizationStore).toContain(
      'Owned concern: cache server-projected web UI authorization capabilities'
    );
    expect(authorizationStore).toContain('canPlan: false');
    expect(authorizationStore).toContain('canRun: false');
    expect(authorizationStore).toContain('canEditEdges: false');
    expect(authorizationStore).toContain('canPersistGraphDraft: false');
    expect(authorizationStore).toContain('canManagePlugins: false');
    expect(authorizationStore).toContain('canManageRBAC: false');

    expect(capabilitiesPort.trimStart().startsWith('/** Owned concern:')).toBe(true);
    expect(capabilitiesPort).not.toContain('frontend-local');
    expect(capabilitiesPort).not.toContain('LOCAL_SHELL_CAPABILITIES');

    expect(registry.trimStart().startsWith('/** Owned concern:')).toBe(true);
    expect(registry).toContain('requiresBackendCapability');
    expect(registry).toContain('runtimeInfos.length === 0');
    expect(registry).toContain('return false');
    expect(registry).not.toContain('if (!capabilities) {\n    return true;');
  });
});
