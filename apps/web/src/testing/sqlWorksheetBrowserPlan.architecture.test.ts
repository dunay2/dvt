/** SQL browser coverage uses the existing catalog and conservative planner, never a private selector. */
import { expect, it } from 'vitest';
import { resolveWebCypressChangedPlan, WEB_CYPRESS_SPECS } from '../../cypress.changed';
import { WEB_CYPRESS_CATALOG } from '../../cypress.catalog';

const spec = 'apps/web/cypress/e2e/sql/sql-worksheet.cy.ts';
const product = 'apps/web/src/app/views/sql/SqlWorksheet.tsx';

it('admits the independent SQL journey as a controlled browser consumer', () => {
  const plan = resolveWebCypressChangedPlan([spec]);
  expect(plan.commands).toHaveLength(1);
  expect(plan.commands[0]?.capability).toBe('controlled');
  expect(plan.commands[0]?.specPaths).toEqual([spec]);
  expect(plan.requiredFiles).toContain(spec);
});

it.each([product, 'apps/web/src/app/views/sql/SqlWorksheet.module.css'])(
  'runs the worksheet journey and retains Vitest dependency selection for %s',
  (source) => {
    const plan = resolveWebCypressChangedPlan([source]);
    expect(plan.commands.map((command) => command.specPaths)).toEqual([[spec]]);
    expect(plan.requiredFiles).toEqual(expect.arrayContaining([source, spec]));
    expect(plan.vitestFiles).toContain(source);
  }
);

it('recognizes package-relative worksheet changes and preserves their Vitest file identity', () => {
  const relative = 'src/app/views/sql/SqlWorksheet.tsx';
  const plan = resolveWebCypressChangedPlan([relative]);
  expect(plan.commands.map((command) => command.specPaths)).toEqual([[spec]]);
  expect(plan.requiredFiles).toContain(product);
  expect(plan.vitestFiles).toContain(relative);
});

it('combines browser consumers once when a second journey changes', () => {
  const second = 'apps/web/cypress/e2e/canvas/canvas-model-sql-authoring.cy.ts';
  const plan = resolveWebCypressChangedPlan([second, product, spec]);
  expect(plan.commands).toHaveLength(1);
  expect(plan.commands[0]?.specPaths).toHaveLength(2);
  expect(plan.commands[0]?.specPaths).toEqual(expect.arrayContaining([spec, second]));
  expect(plan.vitestFiles).toContain(product);
});

it('retains every runtime for a change to a shared boundary', () => {
  const plan = resolveWebCypressChangedPlan([product, 'apps/web/cypress.changed.ts']);
  expect(new Set(plan.commands.flatMap((command) => command.specPaths))).toEqual(
    new Set(Object.values(WEB_CYPRESS_SPECS).flat())
  );
});

it('keeps the complete baseline under a dirty catalog instead of narrowing the SQL proof', () => {
  const plan = resolveWebCypressChangedPlan(['apps/web/cypress.catalog.json', product], false, {
    base: WEB_CYPRESS_CATALOG,
    head: WEB_CYPRESS_CATALOG,
    dirty: true,
  });
  expect(plan.catalogAdditions).toBeNull();
  expect(new Set(plan.commands.flatMap((command) => command.specPaths))).toEqual(
    new Set(Object.values(WEB_CYPRESS_SPECS).flat())
  );
  expect(plan.requiredFiles).toContain(spec);
});

it('rejects an unadmitted SQL spec rather than silently omitting its browser evidence', () => {
  expect(() =>
    resolveWebCypressChangedPlan(['apps/web/cypress/e2e/sql/not-admitted.cy.ts'])
  ).toThrow('not admitted');
});
