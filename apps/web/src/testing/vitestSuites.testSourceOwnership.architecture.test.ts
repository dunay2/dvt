/**
 * Owned concern: prove closed test-support ownership and conservative selection.
 * @decision Retain conservative observers and test the real physical evidence projection.
 * @consequence Missing owners or observers cannot produce a successful narrow plan.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import { resolveWebVitestTestSourceOwners } from '../../vitest/classification';
import {
  WEB_VITEST_TEST_SOURCE_OBSERVERS,
  WEB_VITEST_TEST_SOURCE_OWNERS,
} from '../../vitest.suites';
import {
  currentTestSourceEvidence as evidence,
  currentTestSourceFacts as sources,
  inspectTestSourceEvidence,
} from './vitestSuites.testSourceOwnership.test-support';
import type { TestSourceFacts } from './vitestSuites.testSourceOwnership.moduleReferences.test-support';

const webRoot = process.cwd();
const normalize = (value: string): string => value.replaceAll('\\', '/');
const owner = 'src/testing/vitestSuites.browserRouting.architecture.test.ts';
const sharedOwner = 'src/testing/vitestSuites.browserNativePlatform.architecture.test.ts';
const proof = 'src/testing/vitestSuites.testSourceOwnership.architecture.test.ts';
const helpers: readonly string[] = WEB_VITEST_TEST_SOURCE_OWNERS.flatMap((cohort) => [
  ...cohort.helpers,
]);
const readFacts: (input: { path: string; content: string }) => TestSourceFacts = createRequire(
  import.meta.url
)('../../../../scripts/lib/source-code-facts.cjs').readSourceCodeFacts;

describe('closed Web test-support ownership', () => {
  it('retains every actual non-architecture observation or uncertainty root', () => {
    expect(evidence.observers).toEqual([...WEB_VITEST_TEST_SOURCE_OBSERVERS].sort());
  });

  it.each(helpers)('proves the current resolved runtime owners of %s', (helper) => {
    expect(sources.has(normalize(resolve(webRoot, helper)))).toBe(true);
    expect(evidence.owners.get(helper)).toEqual(
      [...(resolveWebVitestTestSourceOwners(helper) ?? [])].sort()
    );
    expect(evidence.externalConsumers).toEqual([]);
  });

  it.each(helpers)('retains architecture and exact primary observers for %s', (helper) => {
    const changed = Object.freeze([helper, helper]);
    const plan = resolveWebVitestChangedSuitePlan(changed);
    expect(plan.commandPlan).toContainEqual({
      kind: 'shell',
      command: 'pnpm run test:architecture:run',
    });
    expect(plan.commandPlan.filter((step) => step.kind === 'shell')).toHaveLength(1);
    expect(
      plan.commandPlan
        .flatMap((step) => (step.kind === 'vitest-files' ? step.filePaths : []))
        .sort()
    ).toEqual([...WEB_VITEST_TEST_SOURCE_OBSERVERS].sort());
    expect(changed).toEqual([helper, helper]);
    expect(
      resolveWebVitestChangedSuitePlan([`apps/web/${helper}`, helper.replaceAll('/', '\\')])
    ).toEqual(plan);
  });

  it.each([owner, sharedOwner, proof])('keeps owner-only selection independent for %s', (entry) => {
    expect(resolveWebVitestChangedSuitePlan([entry]).commandPlan).toEqual([
      {
        kind: 'vitest-files',
        config: 'vitest.architecture.config.ts',
        filePaths: [...new Set([entry, proof])].sort(),
      },
    ]);
  });

  it.each([
    'src/app/lib/unrelated.ts',
    'src/testing/independent.test.ts',
    'src/testing/retired.test.ts',
  ])('retains every independent obligation for %s in either order', (other) => {
    const helper = 'src/testing/vitestSuites.browserRouting.cli.test-cases.ts';
    const plan = resolveWebVitestChangedSuitePlan([helper, other]);
    expect(resolveWebVitestChangedSuitePlan([other, helper])).toEqual(plan);
    for (const step of resolveWebVitestChangedSuitePlan([other]).commandPlan) {
      if (step.kind === 'shell') expect(plan.commandPlan).toContainEqual(step);
      else
        for (const file of step.filePaths)
          expect(
            plan.commandPlan.some(
              (candidate) =>
                candidate.kind === 'vitest-files' &&
                candidate.config === step.config &&
                candidate.filePaths.includes(file)
            )
          ).toBe(true);
    }
  });

  it.each([
    null,
    [],
    [{ entries: [], helpers: ['src/a.ts'] }],
    [{ entries: [owner], helpers: ['../escape.ts'] }],
    [{ entries: [owner], helpers: ['src/a.ts', 'src/a.ts'] }],
    [{ entries: [owner], helpers: ['src/a.ts', 'src//a.ts'] }],
    [{ entries: [owner], helpers: ['src/ambiguous#name.ts'] }],
  ])('rejects invalid catalog %j', (catalog) => {
    expect(() => resolveWebVitestTestSourceOwners(owner, catalog)).toThrow();
  });

  it.each([
    'import(variable)',
    "import { exec } from 'node:child_process';",
    "import { Worker } from 'node:worker_threads';",
    "import { Script } from 'node:vm';",
  ])('retains an opaque or uncertain test root without declaring it an owner: %s', (content) => {
    const file = normalize(resolve(webRoot, 'src/testing/__uncertain_3904__.test.ts'));
    const result = inspectTestSourceEvidence(new Map([[file, readFacts({ path: file, content })]]));
    expect(result.observers).toContain('src/testing/__uncertain_3904__.test.ts');
    expect([...result.owners.values()].flat()).toEqual([]);
  });

  it.each([
    "import type * as Fixture from './vitestSuites.browserRouting.fixtures';",
    "export * from './vitestSuites.browserRouting.fixtures.ts?raw';",
    "import('./vitestSuites.browserRouting.fixtures.ts?url');",
    "import { createRequire as loader } from 'node:module'; loader(context)('./vitestSuites.browserRouting.fixtures');",
    "import { createRequire as loader } from 'node:module'; const require = loader(context); require('./vitestSuites.browserRouting.fixtures');",
  ])(
    'does not fabricate a runtime owner from types, resource queries or contextual loaders: %s',
    (content) => {
      const file = normalize(resolve(webRoot, 'src/testing/__query_3904__.test.ts'));
      const helper = 'src/testing/vitestSuites.browserRouting.fixtures.ts';
      const target = normalize(resolve(webRoot, helper));
      const actual = sources.get(target);
      if (!actual) throw new Error('Actual fixture source must exist');
      const result = inspectTestSourceEvidence(
        new Map([
          [file, readFacts({ path: file, content })],
          [target, actual],
        ])
      );
      expect(result.owners.get(helper)).toEqual([]);
      expect(result.observers).toContain('src/testing/__query_3904__.test.ts');
      if (content.includes('loader')) expect(result.externalConsumers).toEqual([]);
      else
        expect(result.externalConsumers).toContainEqual({
          importer: 'src/testing/__query_3904__.test.ts',
          helper,
        });
    }
  );

  it('keeps declaration-file dependencies conservative without positive execution', () => {
    const root = normalize(resolve(webRoot, 'src/testing/__ambient_root_3904__.test.ts'));
    const declaration = normalize(resolve(webRoot, 'src/testing/__ambient_3904__.d.ts'));
    const helper = 'src/testing/vitestSuites.browserRouting.fixtures.ts';
    const target = normalize(resolve(webRoot, helper));
    const actual = sources.get(target);
    if (!actual) throw new Error('Actual fixture source must exist');
    const result = inspectTestSourceEvidence(
      new Map([
        [root, readFacts({ path: root, content: "import './__ambient_3904__';" })],
        [
          declaration,
          readFacts({
            path: declaration,
            content: "export * from './vitestSuites.browserRouting.fixtures';",
          }),
        ],
        [target, actual],
      ])
    );
    expect(result.owners.get(helper)).toEqual([]);
    expect(result.observers).toContain('src/testing/__ambient_root_3904__.test.ts');
  });

  it.each(['@xyflow/react/dist/style.css', '@xterm/xterm/css/xterm.css'])(
    'resolves actual resource leaf %s without a pathname exemption',
    (resource) => {
      const file = normalize(resolve(webRoot, 'src/testing/__resource_3904__.test.ts'));
      const result = inspectTestSourceEvidence(
        new Map([[file, readFacts({ path: file, content: `import '${resource}';` })]])
      );
      expect(result.uncertainties).toEqual([]);
    }
  );

  it.each([
    ['', true, false],
    ['?raw', false, true],
    ['?worker', false, false],
    ['?sharedworker&inline', false, false],
    ['?inline&worker', false, false],
    ['?worker&raw', false, true],
    ['?worker&url', false, true],
    ['?unknown', false, true],
  ] as const)(
    'projects documented query mode %s over a real resolved graph',
    (query, positive, observed) => {
      const root = normalize(resolve(webRoot, 'src/testing/__protocol_root_3904__.test.ts'));
      const target = normalize(resolve(webRoot, 'src/testing/__protocol_target_3904__.ts'));
      const result = inspectTestSourceEvidence(
        new Map([
          [
            root,
            readFacts({
              path: root,
              content: `import value from './__protocol_target_3904__.ts${query}';`,
            }),
          ],
          [target, readFacts({ path: target, content: 'export default 1;' })],
        ])
      );
      expect(result.conservative.get(root)).toEqual([target]);
      expect(result.runtime.get(root)).toEqual(positive ? [target] : []);
      expect(result.observers.includes('src/testing/__protocol_root_3904__.test.ts')).toBe(
        observed
      );
    }
  );

  it.each(['?worker', '?sharedworker&inline'])(
    'propagates resolved internal worker observations for %s',
    (query) => {
      const root = normalize(resolve(webRoot, 'src/testing/__worker_root_3904__.test.ts'));
      const target = normalize(resolve(webRoot, 'src/testing/__worker_target_3904__.ts'));
      const result = inspectTestSourceEvidence(
        new Map([
          [
            root,
            readFacts({
              path: root,
              content: `import Worker from './__worker_target_3904__.ts${query}';`,
            }),
          ],
          [target, readFacts({ path: target, content: "import { readFileSync } from 'node:fs';" })],
        ])
      );
      expect(result.conservative.get(root)).toEqual([target]);
      expect(result.runtime.get(root)).toEqual([]);
      expect(result.observers).toContain('src/testing/__worker_root_3904__.test.ts');
    }
  );

  it('retains an unresolved worker as uncertainty and an external Cypress seed without a global absence claim', () => {
    const unit = normalize(resolve(webRoot, 'src/testing/__missing_worker_3904__.test.ts'));
    const cypress = normalize(resolve(webRoot, 'cypress/e2e/__uncertain_3904__.cy.ts'));
    const result = inspectTestSourceEvidence(
      new Map([
        [
          unit,
          readFacts({
            path: unit,
            content: "import Worker from './__unavailable_worker_3904__.ts?worker';",
          }),
        ],
        [cypress, readFacts({ path: cypress, content: 'import(variable);' })],
      ])
    );
    expect(result.observers).toEqual(['src/testing/__missing_worker_3904__.test.ts']);
    expect(result.uncertainties).toContain('cypress/e2e/__uncertain_3904__.cy.ts');
    expect(resolveWebVitestChangedSuitePlan([helpers[0] ?? '']).browserCommands).toEqual(
      resolveWebVitestChangedSuitePlan([]).browserCommands
    );
  });
});
