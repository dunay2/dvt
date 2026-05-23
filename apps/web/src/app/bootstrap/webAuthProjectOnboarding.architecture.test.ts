import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readRepoFile(...segments: string[]): string {
  return readFileSync(resolve(process.cwd(), ...segments), 'utf8');
}

describe('web auth and project onboarding architecture', () => {
  it('keeps protected shell startup behind session and effective workspace rails', () => {
    const routesSource = readRepoFile('src', 'app', 'routes.ts');
    const authGateSource = readRepoFile('src', 'app', 'bootstrap', 'AuthRouteGate.tsx');
    const resolverSource = readRepoFile(
      'src',
      'app',
      'services',
      'session',
      'protectedRouteSessionContext.ts'
    );

    expect(authGateSource).toContain('Owned concern: gate protected product routes');
    expect(routesSource).toContain("path: '/login'");
    expect(routesSource).toContain(
      'createElement(AuthRouteGate, { children: createElement(Root) })'
    );
    expect(resolverSource).toContain("'/session'");
    expect(resolverSource).toContain("'/workspace/context'");
    expect(resolverSource.indexOf("'/session'")).toBeLessThan(
      resolverSource.indexOf("'/workspace/context'")
    );
    expect(resolverSource).not.toContain('localStorage.getItem');
    expect(resolverSource).not.toContain('dvt-web-session');
  });

  it('documents the Fowler component API, invariants, transitions, consumers, and user stories', () => {
    const componentGuide = readRepoFile(
      '..',
      '..',
      'docs',
      'architecture',
      'components',
      'web',
      'appshell',
      'web-auth-project-onboarding-component.md'
    );
    const userStories = readRepoFile(
      '..',
      '..',
      'docs',
      'architecture',
      'components',
      'web',
      'appshell',
      'web-auth-project-onboarding-user-stories.md'
    );
    const analysis = readRepoFile(
      '..',
      '..',
      'buzon',
      '20260523-codex-fowler-web-auth-project-onboarding-canon.md'
    );

    for (const section of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Command/Query Rail',
      '## Semantic Fitness Function',
    ]) {
      expect(componentGuide).toContain(section);
    }

    expect(componentGuide).toContain('```mermaid');
    expect(componentGuide).toContain('GetSessionProfile');
    expect(componentGuide).toContain('GetWorkspaceManifest');
    expect(componentGuide).toContain('No product route may render tenant/project graph data');
    expect(componentGuide).toContain('sessionStore is a projection');
    expect(componentGuide).toContain('src_orders');
    expect(userStories).toContain('WAPO-1');
    expect(userStories).toContain('WAPO-8');
    expect(analysis).toContain('Fowler');
    expect(analysis).toContain('Anti-patterns');
    expect(analysis).toContain('Drift');
  });

  it('keeps the accepted proposal mechanically bound to this canonical slice', () => {
    const proposal = readRepoFile(
      '..',
      '..',
      'docs',
      'planning',
      'proposals',
      'mandatory',
      'frontend-and-ux',
      'web-auth-project-onboarding-and-actionable-gaps-20260501.md'
    );

    expect(proposal).toContain('2026-05-23 Canonical Absorption Status');
    expect(proposal).toContain('featureId: E-MAND-WEB-AUTH-ONBOARDING-CANON');
    expect(proposal).toContain('webAuthProjectOnboarding.architecture.test.ts');
    expect(proposal).toContain('web-auth-project-onboarding-component.md');
    expect(proposal).toContain('WebAuthProjectOnboardingCanon');
  });
});
