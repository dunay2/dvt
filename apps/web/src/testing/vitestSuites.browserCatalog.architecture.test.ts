/** Owned concern: prove conservative browser catalog deltas and independent product evidence. */
import { describe, expect, it } from 'vitest';

import {
  parseWebCypressCatalog,
  resolveControlledCatalogAdditions,
  WEB_CYPRESS_CATALOG,
  WEB_CYPRESS_CAPABILITIES,
  WEB_CYPRESS_CATALOG_PATH,
} from '../../cypress.catalog';
import { WEB_CYPRESS_SPECS } from '../../cypress.changed';
import { resolveWebVitestChangedSuitePlan } from '../../vitest.suites';

const current = WEB_CYPRESS_CATALOG;
const addition = current.controlled.at(-1)!;
const previous = { ...current, controlled: current.controlled.slice(0, -1) };
const snapshots = { base: previous, head: current };
const allSpecs = Object.values(WEB_CYPRESS_SPECS).flat();

describe('Declarative browser catalog', () => {
  it('admits nightly as a disjoint cadence, not a runtime capability', () => {
    expect(parseWebCypressCatalog(current)).toEqual(current);
    expect(WEB_CYPRESS_CAPABILITIES).toEqual(['controlled', 'available', 'unavailable']);
    expect(Object.keys(WEB_CYPRESS_SPECS)).toEqual(WEB_CYPRESS_CAPABILITIES);
    expect(current.nightly).toEqual([
      'apps/web/cypress/e2e/canvas/canvas-large-graph.nightly.cy.ts',
    ]);
  });

  it('accepts the existing disjoint catalog without changing spec order', () => {
    expect(parseWebCypressCatalog(current)).toEqual(current);
    expect(
      parseWebCypressCatalog({
        ...current,
        controlled: ['apps/web/cypress/e2e/shell/route.lifecycle.cy.ts'],
      }).controlled
    ).toEqual(['apps/web/cypress/e2e/shell/route.lifecycle.cy.ts']);
  });

  it.each([
    null,
    [],
    { ...current, extra: [] },
    { controlled: [] },
    { ...current, controlled: 'not-an-array' },
    { ...current, controlled: [] },
    { ...current, available: [] },
    { ...current, unavailable: [] },
    { ...current, nightly: [] },
    { ...current, nightly: [addition] },
    WEB_CYPRESS_SPECS,
    { ...current, controlled: [addition, addition] },
    { ...current, available: [addition] },
    ...[
      '../escape.cy.ts',
      'apps/web/cypress/e2e/../escape.cy.ts',
      'apps/web/cypress/e2e/*.cy.ts',
      'apps/web/cypress/e2e/a;exit.cy.ts',
      'apps\\web\\cypress\\e2e\\bad.cy.ts',
      'apps/web/cypress/e2e//bad.cy.ts',
      'apps/web/cypress/e2e/helper.ts',
      3,
    ].map((path) => ({ ...current, controlled: [path] })),
  ])('rejects malformed or ambiguous current catalog %#', (value) => {
    expect(() => parseWebCypressCatalog(value)).toThrow(/catalog/i);
  });

  it('narrows only proven controlled additions and permits an unchanged valid snapshot', () => {
    expect(resolveControlledCatalogAdditions(current, snapshots)).toEqual([addition]);
    expect(resolveControlledCatalogAdditions(current, { base: current, head: current })).toEqual(
      []
    );
  });

  it.each([
    undefined,
    { base: null, head: current },
    { base: { ...previous, extra: [] }, head: current },
    { ...snapshots, dirty: true },
    { base: { ...current, controlled: [...current.controlled].reverse() }, head: current },
    { base: { ...current, available: current.available.slice(1) }, head: current },
    { base: { ...current, available: [...current.available].reverse() }, head: current },
    { base: { ...current, unavailable: [] }, head: current },
    { base: WEB_CYPRESS_SPECS, head: current },
  ])('cannot narrow an unproved delta %#', (unproved) => {
    expect(resolveControlledCatalogAdditions(current, unproved)).toBeNull();
  });
});

describe('Independent browser obligations', () => {
  it('executes a catalog addition even when only the catalog path changed', () => {
    const plan = resolveWebVitestChangedSuitePlan([WEB_CYPRESS_CATALOG_PATH], {
      catalogSnapshots: snapshots,
    });
    expect(plan.browserCommands).toMatchObject([
      { capability: 'controlled', specPaths: [addition] },
    ]);
    expect(plan.browserFiles).toEqual(
      expect.arrayContaining([WEB_CYPRESS_CATALOG_PATH, addition, ...current.nightly])
    );
    expect(plan.suites).toEqual(['architecture']);
    expect(plan.commandPlan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePaths: expect.arrayContaining([
            'src/testing/vitestSuites.browserNightly.architecture.test.ts',
          ]),
        }),
      ])
    );
  });

  it.each([
    'apps/web/cypress.changed.ts',
    'apps/web/cypress.catalog.ts',
    'apps/web/cypress/support/canvasDraftAuthoring.ts',
  ])('does not let an additive catalog narrow policy or shared support: %s', (boundary) => {
    const plan = resolveWebVitestChangedSuitePlan([WEB_CYPRESS_CATALOG_PATH, boundary], {
      catalogSnapshots: snapshots,
    });
    expect(plan.browserCommands.flatMap(({ specPaths }) => specPaths)).toEqual(allSpecs);
  });

  it('retains full evidence without snapshots and in full mode', () => {
    for (const options of [{}, { full: true, catalogSnapshots: snapshots }]) {
      const plan = resolveWebVitestChangedSuitePlan([WEB_CYPRESS_CATALOG_PATH], options);
      expect(plan.browserCommands.flatMap(({ specPaths }) => specPaths)).toEqual(allSpecs);
    }
  });

  it.each([
    'src/app/bootstrap/AuthRouteGate.tsx',
    'src/app/bootstrap/routeBootstrapStartupReadiness.ts',
    'src/app/services/session/protectedRouteSessionContext.ts',
    'src/app/services/projectOnboarding/activateProjectWorkspace.ts',
    'src/app/views/projectAdmission/ProjectCreationForm.tsx',
    'src/app/views/ProjectOnboardingView.tsx',
  ])('requires shell and both providers for source-only %s', (source) => {
    const plan = resolveWebVitestChangedSuitePlan([`apps/web/${source}`]);
    expect(plan.browserCommands.map(({ capability }) => capability)).toEqual([
      'controlled',
      'available',
      'unavailable',
    ]);
    expect(plan.browserCommands[0]!.specPaths).toEqual(
      current.controlled.filter((path) => path.startsWith('apps/web/cypress/e2e/shell/'))
    );
    expect(plan.browserCommands[1]!.specPaths).toEqual(current.available);
    expect(plan.browserCommands[2]!.specPaths).toEqual(current.unavailable);
    expect(plan.commands).toContain('pnpm run test:architecture:run');
  });

  it.each([
    'src/app/bootstrap/AuthRouteGate.test.tsx',
    'src/app/services/session/protectedRouteSessionContext.concurrent.test.ts',
    'src/app/services/session/protectedRouteSessionContext.testSupport.ts',
  ])('does not grant product impact to test-only %s', (path) => {
    expect(resolveWebVitestChangedSuitePlan([`apps/web/${path}`]).browserCommands).toEqual([]);
  });

  it('unions catalog additions, source obligations and direct specs without duplicates', () => {
    const files = [
      WEB_CYPRESS_CATALOG_PATH,
      addition,
      'apps/web/src/app/bootstrap/AuthRouteGate.tsx',
    ];
    const plan = resolveWebVitestChangedSuitePlan(files, { catalogSnapshots: snapshots });
    const controlled = plan.browserCommands[0]!.specPaths;
    expect(new Set(controlled)).toEqual(
      new Set([addition, ...current.controlled.filter((path) => path.includes('/shell/'))])
    );
    expect(new Set(controlled).size).toBe(controlled.length);
    expect(
      resolveWebVitestChangedSuitePlan([...files].reverse(), { catalogSnapshots: snapshots })
        .browserCommands
    ).toEqual(plan.browserCommands);
  });

  it('still rejects an unknown browser path beside an admissible catalog delta', () => {
    expect(() =>
      resolveWebVitestChangedSuitePlan(
        [WEB_CYPRESS_CATALOG_PATH, 'apps/web/cypress/e2e/unknown.cy.ts'],
        { catalogSnapshots: snapshots }
      )
    ).toThrow(/not admitted/);
  });
});
