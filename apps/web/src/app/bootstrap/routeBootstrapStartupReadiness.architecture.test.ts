import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('route bootstrap startup readiness architecture', () => {
  it('keeps the readiness policy pure, owned, and outside Canvas-specific code', () => {
    const source = readFileSync(
      path.resolve(import.meta.dirname, 'routeBootstrapStartupReadiness.ts'),
      'utf8'
    );

    expect(source).toContain('Owned concern: resolve active-route startup readiness');
    expect(source).toContain('createRouteBootstrapStepCommand');
    expect(source).not.toContain('views/canvas');
    expect(source).not.toContain('workspace/graph/draft');
    expect(source).not.toContain('fetch(');
  });

  it('wires RootShell through the route-readiness policy instead of raw route commands', () => {
    const rootSource = readFileSync(path.resolve(import.meta.dirname, '../Root.tsx'), 'utf8');

    expect(rootSource).toContain('resolveRouteBootstrapStartupReadiness');
    expect(rootSource).toContain('createInitialRouteBootstrapStartupReadinessState');
    expect(rootSource).not.toContain(
      'setBootstrapStepStatus(createRouteBootstrapStepCommand(routeBootstrapPresentation))'
    );
  });

  it('documents the command/query rail, invariants, and Cypress coverage', () => {
    const componentGuide = readFileSync(
      path.resolve(
        import.meta.dirname,
        '../../../../../docs/architecture/components/web/app-bootstrap-screen-component.md'
      ),
      'utf8'
    );
    const implementationPlan = readFileSync(
      path.resolve(
        import.meta.dirname,
        '../../../../../docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-m-d-startup-route-readiness-implementation-plan-20260502.md'
      ),
      'utf8'
    );

    expect(componentGuide).toContain('Route Readiness Policy API');
    expect(componentGuide).toContain('ObserveAppBootstrapRouteReadiness');
    expect(componentGuide).toContain(
      'A route `complete` publication must not appear as route-ready while runtime'
    );
    expect(componentGuide).toContain('startup-route-readiness.cy.ts');

    expect(implementationPlan).toContain('featureId: TF-E2-M-D');
    expect(implementationPlan).toContain('noHumanDecisionsRemaining: true');
    expect(implementationPlan).toContain('RouteBootstrapStartupReadinessState');
    expect(implementationPlan).toContain('CompleteAppBootstrapScreen');
  });

  it('documents the public-route bootstrap completion policy outside auth semantics', () => {
    const componentGuide = readFileSync(
      path.resolve(
        import.meta.dirname,
        '../../../../../docs/architecture/components/web/app-bootstrap-screen-component.md'
      ),
      'utf8'
    );
    const routesSource = readFileSync(path.resolve(import.meta.dirname, '../routes.ts'), 'utf8');

    expect(routesSource).toContain('PublicRouteBootstrapBoundary');
    expect(routesSource).toContain('Runtime capabilities are not required for this public route.');
    expect(routesSource).not.toContain('/session');
    expect(componentGuide).toContain('Public routes such as `/login` settle');
    expect(componentGuide).toContain('changing protected-route authentication semantics');
  });
});
