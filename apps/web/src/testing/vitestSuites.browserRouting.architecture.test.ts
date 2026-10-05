/**
 * Owned concern: prove independent browser and Vitest obligations remain complete.
 * @baseline GH-3540: browser admission is independent of Vitest ownership.
 * @decision GH-3583: exercise the same adapter through both execution phases.
 * @consequence No phase can hide invalid input or replace the other phase's evidence.
 * @version 1.0.0
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveWebVitestChangedSuitePlan } from '../../vitest.suites';
import { main, parseChangedSuiteArgs } from '../../scripts/run-vitest-changed-suites';

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  spawnSync: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(spawnSync).mockReset().mockReturnValue({
    status: 0,
    signal: null,
    pid: 1,
    output: [],
    stdout: '',
    stderr: '',
  });
  vi.stubEnv('CI', '');
  vi.stubEnv('DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME', 'docker');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const spec = 'apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts';
const helper = 'apps/web/cypress/e2e/canvas/liveRunEventRecovery.proof.ts';
const dataHelper = 'apps/web/cypress/e2e/canvas/canvasNodeDataActions.proof.ts';
const savedSampleHelper = 'apps/web/cypress/support/relationalWorkbench/persistence.ts';
const revisitHelper = 'apps/web/cypress/support/relationalWorkbench/navigation.ts';
const modelChain = 'apps/web/cypress/e2e/canvas/canvas-model-chain-fields.cy.ts';
const inputMapping = 'apps/web/cypress/e2e/canvas/canvas-column-lineage-mapping.cy.ts';
const semanticExecution = 'apps/web/cypress/support/semanticLive/execution.ts';
const liveWorkloadConsumers = [
  'apps/web/cypress/e2e/canvas/canvas-dvt-join-preview-live.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-semantic-persistence-run-live.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-sql-progressive-live.cy.ts',
];
const inspectorConsumers = [
  'apps/web/cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-relational-workbench-union.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-relational-workbench-removal.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-relational-workbench-viewport.cy.ts',
];
const savedSampleConsumers = [
  'apps/web/cypress/e2e/canvas/canvas-relational-operation-execution.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-relational-workbench-chain-persistence.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-relational-workbench-cross.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-sort-fetch-data-navigation.cy.ts',
];
const retired = 'apps/web/cypress/e2e/canvas/canvas-node-data-actions.cy.ts';

describe('governed browser evidence routing', () => {
  it.each([
    spec,
    helper,
    dataHelper,
    savedSampleHelper,
    revisitHelper,
    modelChain,
    inputMapping,
    semanticExecution,
    ...liveWorkloadConsumers,
    ...savedSampleConsumers,
    ...inspectorConsumers,
    spec.replaceAll('/', '\\'),
    spec.slice('apps/web/'.length),
  ])('selects the real browser command, not Vitest, for %s', (file) => {
    expect(resolveWebVitestChangedSuitePlan([file])).toMatchObject({
      suites: [],
      commandPlan: [],
      requiresDependencies: false,
      browserCommands: ['pnpm run test:e2e:selected-closure:live'],
    });
  });

  it.each([retired, retired.replaceAll('/', '\\'), retired.slice('apps/web/'.length)])(
    'requires the retirement guard and real proof when the retired path changes: %s',
    (file) => {
      const plan = resolveWebVitestChangedSuitePlan([file]);
      expect(plan.suites).toEqual(['architecture']);
      expect(plan.commandPlan).toEqual(
        resolveWebVitestChangedSuitePlan([
          'apps/web/src/testing/vitestSuites.browserRouting.architecture.test.ts',
        ]).commandPlan
      );
      expect(plan.browserCommands).toEqual(['pnpm run test:e2e:selected-closure:live']);
      expect(existsSync(resolve(retired.slice('apps/web/'.length)))).toBe(false);
    }
  );

  it('retains source obligations and runs shared browser evidence only once in a mixed diff', () => {
    const source = 'apps/web/src/lib/format.ts';
    const mixed = resolveWebVitestChangedSuitePlan([
      helper,
      spec,
      source,
      helper,
      semanticExecution,
      ...liveWorkloadConsumers,
    ]);
    expect(mixed.commandPlan).toEqual(resolveWebVitestChangedSuitePlan([source]).commandPlan);
    expect(mixed.suites).toEqual(['unit', 'architecture']);
    expect(mixed.browserCommands).toEqual(['pnpm run test:e2e:selected-closure:live']);
    expect(resolveWebVitestChangedSuitePlan([source]).browserCommands).toEqual([]);
  });

  it.each([
    'apps/web/cypress/e2e/new.cy.ts',
    'apps/web/cypress/support/e2e.ts',
    'apps/web/cypress/support/liveProtectedRuntime.ts',
    'apps/web/cypress/fixtures/new.json',
    'apps/web/cypress.config.ts',
    'apps/web/cypress.live.config.ts',
    'cypress.config.ts',
  ])('rejects browser surfaces without admitted consumer evidence: %s', (file) => {
    expect(() => resolveWebVitestChangedSuitePlan([file])).toThrow(file);
    expect(() => resolveWebVitestChangedSuitePlan([spec, file], { full: true })).toThrow(file);
  });

  it.each([
    'apps/web/cypress.changed.ts',
    'apps/web/scripts/run-vitest-changed-suites.ts',
    '.github/workflows/test.yml',
    'scripts/run-selected-closure-live-proof.cjs',
    'scripts/run-selected-closure-cypress.cjs',
    'scripts/live-proof-process.cjs',
    'apps/api/package.json',
    'apps/api/vitest.integration.config.ts',
    'apps/api/test/integration/sourceLivePreviewPostgres.proof.ts',
  ])('requires the live baseline for changes to its execution boundary: %s', (file) => {
    expect(resolveWebVitestChangedSuitePlan([file]).browserCommands).toEqual([
      'pnpm run test:e2e:selected-closure:live',
    ]);
  });

  it('adds the admitted baseline in full mode without fabricating changed paths', () => {
    expect(resolveWebVitestChangedSuitePlan([], { full: true }).browserCommands).toEqual([
      'pnpm run test:e2e:selected-closure:live',
    ]);
    expect(resolveWebVitestChangedSuitePlan([]).browserCommands).toEqual([]);
  });

  it.each([
    [helper, 'interruptLiveRunEventFeed'],
    [dataHelper, 'registerCanvasNodeDataActionsProof'],
  ])('guards exclusive ownership and registration of %s', (helperPath, registerName) => {
    const cypressRoot = resolve('cypress');
    const target = resolve(helperPath.slice('apps/web/'.length));
    const consumers = new Set<string>();
    let registrations = 0;
    for (const file of readdirSync(cypressRoot, { recursive: true, withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith('.ts')) continue;
      const path = resolve(file.parentPath, file.name);
      const ast = ts.createSourceFile(
        path,
        readFileSync(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      );
      const visit = (node: ts.Node): void => {
        if (
          path === resolve(spec.slice('apps/web/'.length)) &&
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === registerName
        )
          registrations++;
        if (ts.isStringLiteral(node) && node.text.startsWith('.')) {
          const imported = resolve(dirname(path), node.text);
          if ([imported, `${imported}.ts`].includes(target)) consumers.add(path);
        }
        ts.forEachChild(node, visit);
      };
      visit(ast);
    }
    expect([...consumers]).toEqual([resolve(spec.slice('apps/web/'.length))]);
    expect(registrations).toBe(1);
  });

  it('admits explicit plans but rejects ambiguous or coverage-dropping CLI modes', () => {
    expect(parseChangedSuiteArgs(['--plan', '--full'])).toMatchObject({ plan: true, full: true });
    expect(parseChangedSuiteArgs([])).toMatchObject({ phase: 'all' });
    expect(parseChangedSuiteArgs(['--phase=vitest'])).toMatchObject({ phase: 'vitest' });
    expect(parseChangedSuiteArgs(['--full', '--phase=browser'])).toMatchObject({
      full: true,
      phase: 'browser',
    });
    expect(parseChangedSuiteArgs(['--files', spec])).toMatchObject({ files: [spec] });
    for (const args of [
      ['--browser-only'],
      ['--full', '--browser-only'],
      ['--phase='],
      ['--phase=unknown'],
      ['--phase=all'],
      ['--phase=vitest', '--phase=browser'],
      ['--phase=browser', '--phase=browser'],
      ['--full', '--phase=vitest'],
      ['--unknown'],
      ['--files'],
      ['--full'],
      ['--full', '--full'],
    ]) {
      expect(() => parseChangedSuiteArgs(args)).toThrow();
    }
  });

  it('executes the complete mixed plan once as two disjoint phases with unchanged arguments', () => {
    const files = [
      spec,
      helper,
      'apps/web/src/lib/format.ts',
      'apps/web/src/app/views/Canvas.routeStates.smoke.test.tsx',
    ];
    const plan = resolveWebVitestChangedSuitePlan(files);
    const execute = (args: string[]): Parameters<typeof spawnSync>[] => {
      vi.mocked(spawnSync).mockClear();
      main([...args, '--files', ...files]);
      return [...vi.mocked(spawnSync).mock.calls];
    };
    const combined = execute([]);
    const vitest = execute(['--phase=vitest']);
    const browser = execute(['--phase=browser']);
    expect([...vitest, ...browser]).toEqual(combined);
    expect(vitest).toHaveLength(plan.commandPlan.length + 1);
    expect(vitest[0]?.[0]).toBe('pnpm run test:deps');
    expect(vitest.map(([command]) => command)).not.toContain(plan.browserCommands[0]);
    expect(browser).toEqual([
      [
        plan.browserCommands[0],
        expect.objectContaining({
          shell: true,
          env: { ...process.env, DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME: 'native' },
        }),
      ],
    ]);
    expect(plan.commandPlan.some((entry) => entry.kind === 'vitest-files')).toBe(true);
  });

  it.each(['all', 'vitest', 'browser'])(
    'rejects unknown browser input before executing %s',
    (phase) => {
      const unknown = 'apps/web/cypress/e2e/unregistered.cy.ts';
      const args = phase === 'all' ? [] : [`--phase=${phase}`];
      expect(() => main([...args, '--files', spec, unknown])).toThrow(unknown);
      expect(spawnSync).not.toHaveBeenCalled();
    }
  );

  it('executes no unselected work and preserves the full browser baseline', () => {
    for (const args of [[], ['--phase=vitest'], ['--phase=browser']]) {
      main([...args, '--files', 'README.md']);
      expect(spawnSync).not.toHaveBeenCalled();
    }
    main(['--full', '--phase=browser', '--files', 'README.md']);
    expect(spawnSync).toHaveBeenCalledOnce();
    expect(vi.mocked(spawnSync).mock.calls[0]?.[0]).toBe('pnpm run test:e2e:selected-closure:live');
  });

  it('registers every admitted consumer once in the shared terminal runtime', () => {
    const consumers: string[] = [];
    const revisitConsumers: string[] = [];
    const registrations: string[] = [];
    const target = resolve(savedSampleHelper.slice('apps/web/'.length));
    const revisitTarget = resolve(revisitHelper.slice('apps/web/'.length));
    const entry = resolve(spec.slice('apps/web/'.length));
    for (const file of readdirSync(resolve('cypress'), { recursive: true, withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith('.ts')) continue;
      const path = resolve(file.parentPath, file.name);
      const ast = ts.createSourceFile(
        path,
        readFileSync(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      );
      for (const statement of ast.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
          continue;
        const imported = resolve(dirname(path), `${statement.moduleSpecifier.text}.ts`);
        if (path === entry) registrations.push(imported);
        if (imported !== target && imported !== revisitTarget) continue;
        const bindings = statement.importClause?.namedBindings;
        expect(
          bindings != null && ts.isNamedImports(bindings),
          'sample helpers require explicit imports'
        ).toBe(true);
        if (
          bindings != null &&
          ts.isNamedImports(bindings) &&
          imported === target &&
          bindings.elements.some(
            (binding) => (binding.propertyName ?? binding.name).text === 'stubSavedWorkbenchSample'
          )
        )
          consumers.push(path);
        if (
          bindings != null &&
          ts.isNamedImports(bindings) &&
          imported === revisitTarget &&
          bindings.elements.some(
            (binding) => (binding.propertyName ?? binding.name).text === 'revisitWorkbenchCanvas'
          )
        )
          revisitConsumers.push(path);
      }
    }
    const expected = savedSampleConsumers.map((path) => resolve(path.slice('apps/web/'.length)));
    const inputConsumers = [modelChain, inputMapping].map((path) =>
      resolve(path.slice('apps/web/'.length))
    );
    expect(consumers.sort()).toEqual(expected.sort());
    expect(revisitConsumers.sort()).toEqual(
      [
        ...expected.filter((path) => !path.endsWith('canvas-relational-operation-execution.cy.ts')),
        ...inputConsumers,
        resolve('cypress/e2e/canvas/canvas-relational-workbench-removal.cy.ts'),
      ].sort()
    );
    for (const consumer of [
      ...expected,
      ...inputConsumers,
      ...inspectorConsumers.map((path) => resolve(path.slice('apps/web/'.length))),
      ...liveWorkloadConsumers.map((path) => resolve(path.slice('apps/web/'.length))),
    ])
      expect(registrations.filter((path) => path === consumer)).toHaveLength(1);
  });
});
