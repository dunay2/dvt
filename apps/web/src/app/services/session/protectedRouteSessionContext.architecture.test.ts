import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readRepoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('protected route session context architecture', () => {
  it('keeps session and effective workspace context as separate rails', () => {
    const sessionRoute = readRepoFile('..\\..\\apps\\api\\src\\entrypoints\\http\\sessionRoute.ts');
    const workspaceContextRoute = readRepoFile(
      '..\\..\\apps\\api\\src\\entrypoints\\http\\workspaceContextRoute.ts'
    );

    expect(sessionRoute).toContain('Owned concern: expose authenticated session profile');
    expect(sessionRoute).not.toContain('effectiveWorkspace');
    expect(sessionRoute).not.toContain('workspaceContext');
    expect(workspaceContextRoute).toContain(
      'Owned concern: expose server-owned effective workspace context'
    );
    expect(workspaceContextRoute).toContain('workspace_context_not_granted');
  });

  it('keeps protected route startup semantics in a resolver instead of AuthRouteGate inline transport', () => {
    const authGate = readRepoFile('src/app/bootstrap/AuthRouteGate.tsx');
    const resolver = readRepoFile('src/app/services/session/protectedRouteSessionContext.ts');

    expect(authGate).toContain('resolveProtectedRouteSessionContext');
    expect(authGate).not.toContain("getJson('/session'");
    expect(resolver).toContain("getJson('/session'");
    expect(resolver).toContain("'/workspace/context'");
    expect(resolver.indexOf("'/session'")).toBeLessThan(resolver.indexOf("'/workspace/context'"));
    expect(resolver).toContain('setSessionContext');
  });

  it('documents API, invariants, transitions, consumers, and diagrams for the component', () => {
    const componentGuide = readRepoFile(
      '..\\..\\docs\\architecture\\components\\web\\appshell\\effective-workspace-context-component.md'
    );
    const userStories = readRepoFile(
      '..\\..\\docs\\architecture\\components\\web\\appshell\\effective-workspace-context-user-stories.md'
    );

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Sequence',
      '## Consumers',
      '## Semantic Fitness Function',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }
    expect(componentGuide).toContain('```mermaid');
    expect(componentGuide).toContain('GET /workspace/context');
    expect(userStories).toContain('EWC-1');
    expect(userStories).toContain('EWC-5');
  });
});
