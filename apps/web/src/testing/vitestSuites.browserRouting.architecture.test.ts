/**
 * Owned concern: prove independent browser and Vitest obligations remain complete.
 * @baseline GH-3540: browser admission is independent of Vitest ownership.
 * @decision GH-3583/GH-3593: exercise shared phases and register each admitted browser consumer once.
 * @consequence No phase or helper change can hide input obligations or replace real browser evidence.
 * @version 1.0.0
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WEB_CYPRESS_SPECS } from '../../cypress.changed';
import { resolveWebVitestChangedSuitePlan } from '../../vitest.suites';
import { main, parseChangedSuiteArgs } from '../../scripts/run-vitest-changed-suites';

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  spawnSync: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: vi.fn(actual.existsSync) };
});

beforeEach(() => {
  vi.mocked(existsSync).mockReset();
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
const transformStage = 'apps/web/cypress/e2e/canvas/canvas-transform-stage.cy.ts';
const formulaJourney = 'apps/web/cypress/support/relationalWorkbench/transformFormulaJourney.ts';
const treeJourney = 'apps/web/cypress/support/relationalWorkbench/transformTreeJourney.ts';
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
const fixture = 'apps/web/cypress/support/canvasDraftAuthoring.ts';
const unavailable = 'apps/web/cypress/e2e/canvas/canvas-dvt-runtime-unavailable-live.cy.ts';
const liveCommand = {
  capability: 'available',
  command: 'pnpm run test:e2e:selected-closure:live',
  specPaths: [spec],
  env: {
    DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME: 'native',
    DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME: 'available',
  },
};

function readBrowserModules(): Map<string, ts.SourceFile> {
  return new Map(
    readdirSync(resolve('cypress'), { recursive: true, withFileTypes: true })
      .filter((file) => file.isFile() && file.name.endsWith('.ts'))
      .map((file) => {
        const path = resolve(file.parentPath, file.name);
        return [
          path,
          ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true),
        ];
      })
  );
}

const browserModules = readBrowserModules();

function runtimeImports(path: string, ast: ts.SourceFile): string[] {
  return ast.statements.flatMap((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.startsWith('.') ||
      statement.importClause?.isTypeOnly
    )
      return [];
    const clause = statement.importClause;
    const bindings = clause?.namedBindings;
    if (
      !clause?.name &&
      bindings &&
      ts.isNamedImports(bindings) &&
      bindings.elements.every((binding) => binding.isTypeOnly)
    )
      return [];
    const target = resolve(dirname(path), statement.moduleSpecifier.text);
    return [target.endsWith('.ts') ? target : `${target}.ts`];
  });
}

function reachesModule(
  graph: ReadonlyMap<string, readonly string[]>,
  source: string,
  target: string,
  seen = new Set<string>()
): boolean {
  if (source === target) return true;
  if (seen.has(source)) return false;
  seen.add(source);
  return (graph.get(source) ?? []).some((dependency) =>
    reachesModule(graph, dependency, target, seen)
  );
}

describe('governed browser evidence routing', () => {
  it('reconciles exact runtime imports with retained fixture consumers and one available entry', () => {
    const graph = new Map(
      [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
    );
    const specs = [...browserModules.keys()].filter((path) => path.endsWith('.cy.ts'));
    const target = resolve('cypress/support/canvasDrafts/buildCanvasAuthoringDraft.ts');
    const fixtureConsumers = specs.filter((path) => reachesModule(graph, path, target));
    const registered = Object.values(WEB_CYPRESS_SPECS).flat();
    const fileAuthorityConsumer = 'apps/web/cypress/e2e/runs/run-controls-live.cy.ts';
    expect(fixtureConsumers.sort()).toEqual(
      registered
        .filter((path) => path !== fileAuthorityConsumer)
        .map((path) => resolve(path.slice('apps/web/'.length)))
        .sort()
    );
    const entry = resolve(spec.slice('apps/web/'.length));
    expect(specs.filter((path) => reachesModule(graph, entry, path)).sort()).toEqual(
      WEB_CYPRESS_SPECS.available.map((path) => resolve(path.slice('apps/web/'.length))).sort()
    );
    expect(WEB_CYPRESS_SPECS.available).toHaveLength(22);
    expect(WEB_CYPRESS_SPECS.controlled).toHaveLength(48);
    expect(existsSync(resolve('cypress/e2e/canvas/canvas-selected-measures.cy.ts'))).toBe(false);

    const runtime = resolve('cypress/support/liveProtectedRuntime.ts');
    const unadmittedTransport = specs.filter(
      (path) =>
        reachesModule(graph, path, runtime) &&
        !fixtureConsumers.includes(path) &&
        path !== resolve(fileAuthorityConsumer.slice('apps/web/'.length))
    );
    expect(unadmittedTransport).toHaveLength(12);
    for (const path of unadmittedTransport) {
      expect(() =>
        resolveWebVitestChangedSuitePlan([
          `apps/web/${path.slice(resolve('.').length + 1).replaceAll('\\', '/')}`,
        ])
      ).toThrow();
    }
  });

  it.each([savedSampleHelper, revisitHelper])(
    'retains all real runtime groups for shared helper %s',
    (path) => {
      expect(
        resolveWebVitestChangedSuitePlan([path]).browserCommands.map(({ capability }) => capability)
      ).toEqual(['controlled', 'available']);
    }
  );

  it('runs only changed controlled specs but retains the complete set for their shared fixture', () => {
    const path = WEB_CYPRESS_SPECS.controlled[0];
    const isolated = resolveWebVitestChangedSuitePlan([path, path]);
    expect(isolated.browserCommands).toHaveLength(1);
    expect(isolated.browserCommands[0]!.specPaths).toEqual([path]);
    expect(resolveWebVitestChangedSuitePlan([path, fixture]).browserCommands[0]!.specPaths).toEqual(
      WEB_CYPRESS_SPECS.controlled
    );
  });

  it('admits explicit measure retirement only with its retained controlled replacement', () => {
    const path = 'apps/web/cypress/e2e/canvas/canvas-selected-measures.cy.ts';
    const plan = resolveWebVitestChangedSuitePlan([path]);
    expect(plan.suites).toEqual(['architecture']);
    expect(plan.browserCommands).toHaveLength(1);
    expect(plan.browserCommands[0]!.specPaths).toContain(
      'apps/web/cypress/e2e/canvas/canvas-measure-pipeline.cy.ts'
    );
    expect(plan.browserFiles).not.toContain(path);
    expect(existsSync(resolve(path.slice('apps/web/'.length)))).toBe(false);
  });

  it('rejects a reintroduced retired path before planning or phase selection', async () => {
    const { existsSync: originalExists } =
      await vi.importActual<typeof import('node:fs')>('node:fs');
    vi.mocked(existsSync).mockImplementation(
      (path) =>
        resolve(String(path)) === resolve(retired.slice('apps/web/'.length)) || originalExists(path)
    );
    for (const flags of [['--plan'], ['--phase=browser'], ['--phase=vitest']]) {
      expect(() => main([...flags, '--files', retired])).toThrow(retired);
      expect(spawnSync).not.toHaveBeenCalled();
    }
  });

  it('routes shared fixtures once per real runtime with explicit invocation-local environment', () => {
    const plan = resolveWebVitestChangedSuitePlan([fixture, fixture]);
    expect(plan.commandPlan).toEqual(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/views/canvas/canvasDraftScenarioFixtures.test.ts',
        'apps/web/src/app/views/canvas/canvasDraftScenarioFixtures.architecture.test.ts',
      ]).commandPlan
    );
    expect(plan.browserCommands).toMatchObject([
      {
        capability: 'controlled',
        command: expect.stringContaining('pnpm run test:e2e:native --browser chrome --spec '),
      },
      {
        capability: 'available',
        command: 'pnpm run test:e2e:selected-closure:live',
        env: { DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME: 'available' },
        specPaths: [spec],
      },
      {
        capability: 'unavailable',
        command: `pnpm run test:e2e:selected-closure:live --spec ${unavailable}`,
        env: { DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME: 'unavailable' },
        specPaths: [unavailable],
      },
    ]);
    expect(plan.browserCommands).toHaveLength(3);
    expect(plan.browserFiles).toContain(fixture);
  });

  it('runs the available families through one terminal entry and keeps unavailable separate', () => {
    const live = resolveWebVitestChangedSuitePlan([
      spec,
      'apps/web/cypress/e2e/canvas/canvas-formula-lineage-live.cy.ts',
      'apps/web/cypress/e2e/runs/run-controls-live.cy.ts',
    ]);
    expect(live.browserCommands).toHaveLength(1);
    expect(live.browserCommands[0]).toMatchObject({ capability: 'available', specPaths: [spec] });
    expect(live.browserFiles.filter((path) => path.endsWith('.cy.ts'))).toHaveLength(22);
    expect(resolveWebVitestChangedSuitePlan([unavailable]).browserCommands).toMatchObject([
      { capability: 'unavailable', specPaths: [unavailable] },
    ]);
  });

  it('applies each browser environment without contaminating another command or the process', () => {
    vi.stubEnv('DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME', 'unavailable');
    const plan = resolveWebVitestChangedSuitePlan([fixture]);
    main(['--phase=browser', '--files', fixture]);
    expect(vi.mocked(spawnSync).mock.calls).toEqual(
      plan.browserCommands.map((entry) => [
        entry.command,
        expect.objectContaining({ env: { ...process.env, ...entry.env } }),
      ])
    );
    expect(vi.mocked(spawnSync).mock.calls[0]?.[1]).toMatchObject({
      env: { DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME: undefined },
    });
    expect(process.env.DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME).toBe('unavailable');
  });

  it.each(['all', 'vitest', 'browser', 'plan'])(
    'rejects a deleted admitted spec or helper before %s can start',
    async (phase) => {
      const { existsSync: originalExists } =
        await vi.importActual<typeof import('node:fs')>('node:fs');
      for (const missing of [spec, helper]) {
        vi.mocked(existsSync).mockImplementation(
          (path) =>
            resolve(String(path)) !== resolve(missing.slice('apps/web/'.length)) &&
            originalExists(path)
        );
        const flags = phase === 'plan' ? ['--plan'] : phase === 'all' ? [] : [`--phase=${phase}`];
        expect(() => main([...flags, '--files', missing])).toThrow(missing);
        expect(spawnSync).not.toHaveBeenCalled();
        vi.mocked(existsSync).mockReset();
      }
    }
  );

  it.each([
    spec,
    helper,
    dataHelper,
    modelChain,
    inputMapping,
    semanticExecution,
    transformStage,
    formulaJourney,
    treeJourney,
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
      browserCommands: [liveCommand],
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
      expect(plan.browserCommands).toEqual([liveCommand]);
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
      transformStage,
      formulaJourney,
      treeJourney,
      ...liveWorkloadConsumers,
    ]);
    expect(mixed.commandPlan).toEqual(resolveWebVitestChangedSuitePlan([source]).commandPlan);
    expect(mixed.suites).toEqual(['unit', 'architecture']);
    expect(mixed.browserCommands).toEqual([liveCommand]);
    expect(resolveWebVitestChangedSuitePlan([source]).browserCommands).toEqual([]);
  });

  it.each([
    'apps/web/cypress/e2e/new.cy.ts',
    'apps/web/cypress/support/e2e.ts',
    'apps/web/cypress/support/unregisteredRuntime.ts',
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
    expect(
      resolveWebVitestChangedSuitePlan([file]).browserCommands.map(({ capability }) => capability)
    ).toEqual(['controlled', 'available', 'unavailable']);
  });

  it('adds the admitted baseline in full mode without fabricating changed paths', () => {
    expect(
      resolveWebVitestChangedSuitePlan([], { full: true }).browserCommands.map(
        ({ capability }) => capability
      )
    ).toEqual(['controlled', 'available', 'unavailable']);
    expect(resolveWebVitestChangedSuitePlan([]).browserCommands).toEqual([]);
  });

  it.each([
    [helper, 'interruptLiveRunEventFeed', spec],
    [dataHelper, 'registerCanvasNodeDataActionsProof', spec],
    [formulaJourney, 'exerciseTransformFormulaAuthoring', transformStage],
    [treeJourney, 'exerciseTransformTreeSelection', transformStage],
  ])('guards exclusive ownership and registration of %s', (helperPath, registerName, owner) => {
    const target = resolve(helperPath.slice('apps/web/'.length));
    const consumers = new Set<string>();
    let registrations = 0;
    for (const [path, ast] of browserModules) {
      const visit = (node: ts.Node): void => {
        if (
          path === resolve(owner.slice('apps/web/'.length)) &&
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
    expect([...consumers]).toEqual([resolve(owner.slice('apps/web/'.length))]);
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
    expect(vitest.map(([command]) => command)).not.toContain(plan.browserCommands[0]!.command);
    expect(browser).toEqual([
      [
        plan.browserCommands[0]!.command,
        expect.objectContaining({
          shell: true,
          env: { ...process.env, ...liveCommand.env },
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
    expect(spawnSync).toHaveBeenCalledTimes(3);
    expect(vi.mocked(spawnSync).mock.calls.map(([command]) => command)).toEqual(
      resolveWebVitestChangedSuitePlan([], { full: true }).browserCommands.map(
        ({ command }) => command
      )
    );
  });

  it('registers every admitted consumer once in the shared terminal runtime', () => {
    const consumers: string[] = [];
    const revisitConsumers: string[] = [];
    const registrations: string[] = [];
    const target = resolve(savedSampleHelper.slice('apps/web/'.length));
    const revisitTarget = resolve(revisitHelper.slice('apps/web/'.length));
    const entry = resolve(spec.slice('apps/web/'.length));
    for (const [path, ast] of browserModules) {
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
        resolve('cypress/e2e/canvas/canvas-relational-workbench-union.cy.ts'),
        resolve(transformStage.slice('apps/web/'.length)),
        resolve(treeJourney.slice('apps/web/'.length)),
        resolve(formulaJourney.slice('apps/web/'.length)),
        resolve('cypress/e2e/canvas/canvas-measure-pipeline.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-dvt-postgres-connection-binding.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-formula-lineage.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-geometry-performance.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-join-output-policies.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-model-card-materialization.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-model-output-toggle.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-predicate-reopen.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-selected-relation-sort-fetch.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-set-persistence.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-unary-lifecycle.cy.ts'),
      ].sort()
    );
    const admitted = new Set(
      Object.values(WEB_CYPRESS_SPECS)
        .flat()
        .map((path) => resolve(path.slice('apps/web/'.length)))
    );
    const graph = new Map(
      [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
    );
    for (const consumer of revisitConsumers)
      expect(
        [...admitted].some((owner) => reachesModule(graph, owner, consumer)),
        consumer
      ).toBe(true);
    for (const consumer of [
      ...expected,
      ...inputConsumers,
      ...inspectorConsumers.map((path) => resolve(path.slice('apps/web/'.length))),
      ...liveWorkloadConsumers.map((path) => resolve(path.slice('apps/web/'.length))),
      resolve(transformStage.slice('apps/web/'.length)),
    ])
      expect(registrations.filter((path) => path === consumer)).toHaveLength(1);
  });
});
