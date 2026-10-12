// @vitest-environment node
/**
 * Owned concern: prove independent browser and Vitest obligations remain complete.
 * @baseline GH-3540: browser admission is independent of Vitest ownership.
 * @decision GH-3578/GH-3583: prove disjoint capabilities and independent, exactly-once spec ownership.
 * @consequence No phase or helper change can hide input obligations or replace real browser evidence.
 * @version 1.0.0
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
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
  return { ...actual, existsSync: vi.fn(actual.existsSync), appendFileSync: vi.fn() };
});

beforeEach(() => {
  vi.mocked(existsSync).mockReset();
  vi.mocked(appendFileSync).mockReset();
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
  command: `pnpm run test:e2e:selected-closure:live --spec ${WEB_CYPRESS_SPECS.available.join(',')}`,
  specPaths: WEB_CYPRESS_SPECS.available,
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
  it('admits the complete graph-authoring helper closure with exact runtime ownership', () => {
    const graph = new Map(
      [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
    );
    const target = resolve('cypress/support/canvasGraphAuthoring.ts');
    const consumers = [...browserModules.keys()]
      .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
      .sort();
    const expected = {
      controlled: [
        'canvas-calculated-column-authoring',
        'canvas-card-field-lifecycle',
        'canvas-geometry-performance',
        'canvas-happy-path-draggable',
        'canvas-ready-node-authoring',
      ],
      available: [
        'canvas-column-lineage-mapping',
        'canvas-dvt-join-preview-live',
        'canvas-first-authoring-live',
      ],
    };
    expect(consumers).toEqual(
      Object.values(expected)
        .flat()
        .map((name) => resolve(`cypress/e2e/canvas/${name}.cy.ts`))
        .sort()
    );
    for (const [capability, names] of Object.entries(expected)) {
      for (const name of names) {
        const path = `apps/web/cypress/e2e/canvas/${name}.cy.ts`;
        expect(
          resolveWebVitestChangedSuitePlan([path]).browserCommands.map((entry) => entry.capability),
          path
        ).toEqual([capability]);
      }
    }
    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/cypress/support/canvasGraphAuthoring.ts',
      ]).browserCommands.map((entry) => entry.capability)
    ).toEqual(['controlled', 'available']);
  });

  it('admits the two real project-authoring consumers in the available runtime', () => {
    const graph = new Map(
      [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
    );
    const target = resolve('cypress/support/liveProjectAuthoring.ts');
    const consumers = [...browserModules.keys()]
      .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
      .sort();
    const expected = ['canvas-dvt-join-preview-live', 'canvas-first-authoring-live'];
    expect(consumers).toEqual(
      expected.map((name) => resolve(`cypress/e2e/canvas/${name}.cy.ts`)).sort()
    );
    for (const name of expected) {
      const path = `apps/web/cypress/e2e/canvas/${name}.cy.ts`;
      const plan = resolveWebVitestChangedSuitePlan([path]);
      expect(
        plan.browserCommands.map((command) => command.capability),
        path
      ).toEqual(['available']);
    }
    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/cypress/support/liveProjectAuthoring.ts',
      ]).browserCommands.map((command) => command.capability)
    ).toEqual(['available']);
  });

  it('reconciles exact fixture consumers with disjoint, independently registered browser specs', () => {
    const graph = new Map(
      [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
    );
    const specs = [...browserModules.keys()].filter((path) => path.endsWith('.cy.ts'));
    const target = resolve('cypress/support/canvasDrafts/buildCanvasAuthoringDraft.ts');
    const fixtureConsumers = specs.filter((path) => reachesModule(graph, path, target));
    const registered = Object.values(WEB_CYPRESS_SPECS).flat();
    const uiOnlyConsumers = [
      'apps/web/cypress/e2e/runs/run-controls-live.cy.ts',
      'apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts',
    ];
    expect(fixtureConsumers.sort()).toEqual(
      registered
        .filter((path) => !uiOnlyConsumers.includes(path))
        .map((path) => resolve(path.slice('apps/web/'.length)))
        .sort()
    );
    expect(new Set(registered).size).toBe(registered.length);
    for (const path of WEB_CYPRESS_SPECS.available) {
      const owner = resolve(path.slice('apps/web/'.length));
      expect(
        specs.filter((candidate) => reachesModule(graph, owner, candidate)),
        path
      ).toEqual([owner]);
    }
    expect(WEB_CYPRESS_SPECS.available).toHaveLength(23);
    expect(WEB_CYPRESS_SPECS.controlled).toHaveLength(48);
    expect(WEB_CYPRESS_SPECS.unavailable).toHaveLength(1);
    expect(existsSync(resolve('cypress/e2e/canvas/canvas-selected-measures.cy.ts'))).toBe(false);

    const runtime = resolve('cypress/support/liveProtectedRuntime.ts');
    const unadmittedTransport = specs.filter(
      (path) =>
        reachesModule(graph, path, runtime) &&
        !fixtureConsumers.includes(path) &&
        !uiOnlyConsumers.some((consumer) => path === resolve(consumer.slice('apps/web/'.length)))
    );
    expect(unadmittedTransport).toHaveLength(9);
    for (const path of unadmittedTransport) {
      expect(() =>
        resolveWebVitestChangedSuitePlan([
          `apps/web/${path.slice(resolve('.').length + 1).replaceAll('\\', '/')}`,
        ])
      ).toThrow();
    }
  });

  it.each([
    savedSampleHelper,
    revisitHelper,
    'apps/web/cypress/support/relationalWorkbench/columns.ts',
  ])('retains all real runtime groups for shared helper %s', (path) => {
    expect(
      resolveWebVitestChangedSuitePlan([path]).browserCommands.map(({ capability }) => capability)
    ).toEqual(['controlled', 'available']);
  });

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
    for (const flags of [
      ['--plan'],
      ['--phase=browser'],
      ['--phase=vitest'],
      ['--phase=browser', '--browser-capability=controlled'],
    ]) {
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
      liveCommand,
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

  it('runs all available specs once in one invocation and keeps unavailable separate', () => {
    const live = resolveWebVitestChangedSuitePlan([
      spec,
      'apps/web/cypress/e2e/canvas/canvas-formula-lineage-live.cy.ts',
      'apps/web/cypress/e2e/runs/run-controls-live.cy.ts',
    ]);
    expect(live.browserCommands).toHaveLength(1);
    expect(live.browserCommands[0]).toEqual(liveCommand);
    expect(live.browserFiles.filter((path) => path.endsWith('.cy.ts'))).toHaveLength(23);
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
    for (const browserCapability of ['controlled', 'available', 'unavailable']) {
      expect(
        parseChangedSuiteArgs([`--browser-capability=${browserCapability}`, '--phase=browser'])
      ).toMatchObject({ phase: 'browser', browserCapability });
    }
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
      ['--browser-capability=available'],
      ['--phase=vitest', '--browser-capability=available'],
      ['--phase=browser', '--browser-capability='],
      ['--phase=browser', '--browser-capability=unknown'],
      ['--phase=browser', '--browser-capability'],
      ['--phase=browser', '--browser-capability=available', '--browser-capability=available'],
      ['--phase=browser', '--browser-capability=available', '--browser-capability=controlled'],
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

  it('partitions all browser capabilities without omitting or duplicating a command or environment', () => {
    const files = [fixture, 'apps/web/src/lib/format.ts'];
    const execute = (flags: string[]): Parameters<typeof spawnSync>[] => {
      vi.mocked(spawnSync).mockClear();
      main([...flags, '--files', ...files]);
      return [...vi.mocked(spawnSync).mock.calls];
    };
    const complete = execute([]);
    const vitest = execute(['--phase=vitest']);
    const capabilities = ['controlled', 'available', 'unavailable'];
    const partitioned = capabilities.flatMap((capability) => {
      const calls = execute(['--phase=browser', `--browser-capability=${capability}`]);
      expect(calls).toHaveLength(1);
      return calls;
    });
    expect([...vitest, ...partitioned]).toEqual(complete);
    expect(partitioned).toEqual(execute(['--phase=browser']));
    expect(new Set(partitioned.map(([command]) => command)).size).toBe(3);
  });

  it.each([
    { flags: ['--phase=vitest'], capabilities: [], provider: false },
    {
      flags: ['--phase=browser'],
      capabilities: ['controlled', 'available', 'unavailable'],
      provider: true,
    },
    {
      flags: ['--phase=browser', '--browser-capability=controlled'],
      capabilities: ['controlled'],
      provider: false,
    },
    {
      flags: ['--phase=browser', '--browser-capability=available'],
      capabilities: ['available'],
      provider: true,
    },
    {
      flags: ['--phase=browser', '--browser-capability=unavailable'],
      capabilities: ['unavailable'],
      provider: true,
    },
  ])(
    'reports only selected browser commands and provider needs for $flags',
    ({ flags, capabilities, provider }) => {
      const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      vi.stubEnv('GITHUB_OUTPUT', 'mock-github-output');
      const plan = resolveWebVitestChangedSuitePlan([fixture]);
      main(['--plan', ...flags, '--files', fixture]);
      expect(JSON.parse(String(stdout.mock.calls[0]?.[0]))).toEqual({
        ...plan,
        browserCommands: plan.browserCommands.filter(({ capability }) =>
          capabilities.includes(capability)
        ),
      });
      expect(
        vi
          .mocked(appendFileSync)
          .mock.calls.map(([, data]) => String(data))
          .join('')
      ).toBe(`browser_required=${capabilities.length > 0}\nprovider_required=${provider}\n`);
      expect(spawnSync).not.toHaveBeenCalled();
    }
  );

  it('validates missing and unknown consumers outside the selected capability before filtering', async () => {
    const { existsSync: originalExists } =
      await vi.importActual<typeof import('node:fs')>('node:fs');
    const flags = ['--phase=browser', '--browser-capability=controlled'];
    vi.mocked(existsSync).mockImplementation(
      (path) =>
        resolve(String(path)) !== resolve(spec.slice('apps/web/'.length)) && originalExists(path)
    );
    for (const mode of [[], ['--plan'], ['--full']])
      expect(() => main([...mode, ...flags, '--files', fixture])).toThrow(spec);
    vi.mocked(existsSync).mockReset();
    const unknown = 'apps/web/cypress/e2e/unregistered.cy.ts';
    expect(() => main([...flags, '--files', fixture, unknown])).toThrow(unknown);
    expect(spawnSync).not.toHaveBeenCalled();
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
    for (const capability of ['controlled', 'available', 'unavailable']) {
      vi.mocked(spawnSync).mockClear();
      main([
        '--full',
        '--phase=browser',
        `--browser-capability=${capability}`,
        '--files',
        'README.md',
      ]);
      expect(vi.mocked(spawnSync).mock.calls.map(([command]) => command)).toEqual(
        resolveWebVitestChangedSuitePlan([], { full: true })
          .browserCommands.filter((entry) => entry.capability === capability)
          .map(({ command }) => command)
      );
      vi.mocked(spawnSync).mockClear();
      main(['--phase=browser', `--browser-capability=${capability}`, '--files', 'README.md']);
      expect(spawnSync).not.toHaveBeenCalled();
    }
  });

  it('includes every shared-helper consumer once in its admitted runtime command', () => {
    const consumers: string[] = [];
    const revisitConsumers: string[] = [];
    const registrations = resolveWebVitestChangedSuitePlan([fixture])
      .browserCommands.flatMap(({ specPaths }) => specPaths)
      .map((path) => resolve(path.slice('apps/web/'.length)));
    const target = resolve(savedSampleHelper.slice('apps/web/'.length));
    const revisitTarget = resolve(revisitHelper.slice('apps/web/'.length));
    for (const [path, ast] of browserModules) {
      for (const statement of ast.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
          continue;
        const imported = resolve(dirname(path), `${statement.moduleSpecifier.text}.ts`);
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
        ...expected,
        ...inputConsumers,
        resolve('cypress/e2e/canvas/canvas-relational-workbench-removal.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-relational-workbench-union.cy.ts'),
        resolve(transformStage.slice('apps/web/'.length)),
        resolve(treeJourney.slice('apps/web/'.length)),
        resolve(formulaJourney.slice('apps/web/'.length)),
        resolve('cypress/e2e/canvas/canvas-measure-pipeline.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-calculated-column-authoring.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-dvt-postgres-connection-binding.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-formula-lineage.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-geometry-performance.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-join-output-policies.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-model-card-materialization.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-model-output-toggle.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-predicate-reopen.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-selected-relation-filter.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-selected-relation-sort-fetch.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-set-persistence.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-source-filter-authoring.cy.ts'),
        resolve('cypress/e2e/canvas/canvas-transform-chain.cy.ts'),
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
