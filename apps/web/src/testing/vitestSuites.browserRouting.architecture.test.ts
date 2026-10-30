// @vitest-environment node
/**
 * Owned concern: prove independent browser and Vitest obligations remain complete.
 * @baseline GH-3540: browser admission is independent of Vitest ownership.
 * @decision GH-3578/GH-3583/GH-3610/GH-3620: prove disjoint runtimes, complete consumer ownership and real toast withdrawal.
 * @consequence No phase or helper change can hide input obligations or replace real browser evidence.
 * @version 1.0.2
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WEB_CYPRESS_NIGHTLY_SPECS, WEB_CYPRESS_SPECS } from '../../cypress.changed';
import { WEB_CYPRESS_CATALOG, WEB_CYPRESS_CATALOG_PATH } from '../../cypress.catalog';
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
  'apps/web/cypress/e2e/canvas/canvas-dvt-sink-publication-live.cy.ts',
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

describe('public Canvas gesture preconditions', () => {
  it('requeries direction cues until all original marker and edge invariants hold', () => {
    const body = browserModules
      .get(resolve('cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts'))!
      .statements.find(
        (statement) =>
          ts.isFunctionDeclaration(statement) &&
          statement.name?.text === 'assertDependencyDirectionCues'
      )!
      .getText()
      .replace(/\s+/gu, ' ');
    expect(body).toContain('.should(($cues) => {');
    expect(body).toContain('for (const cue of $cues.toArray()) {');
    expect(body).toContain(
      'expect(getComputedStyle(glyph).fill).to.equal(getComputedStyle(edgePath!).stroke)'
    );
    expect(body).not.toMatch(/\.each\(|cy\.wait\(|timeout:/u);
  });

  it('proves active and withdrawn toast hit-testing before normal receipt close', () => {
    const ast = browserModules.get(
      resolve('cypress/e2e/canvas/canvas-dbt-source-connection-binding.cy.ts')
    )!;
    const calls: ts.CallExpression[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) calls.push(node);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    const namedCalls = (name: string): ts.CallExpression[] =>
      calls.filter(
        (call) =>
          ts.isPropertyAccessExpression(call.expression) && call.expression.name.text === name
      );
    const literalArgs = (call: ts.CallExpression): Array<string | null> =>
      call.arguments.map((argument) => (ts.isStringLiteral(argument) ? argument.text : null));
    const clocks = namedCalls('clock');
    expect(clocks).toHaveLength(1);
    const clock = clocks[0]!;
    const timers = clock.arguments[1];
    expect(timers && ts.isArrayLiteralExpression(timers)).toBe(true);
    if (timers && ts.isArrayLiteralExpression(timers)) {
      expect(
        timers.elements.map((timer) => (ts.isStringLiteral(timer) ? timer.text : null))
      ).toEqual(['setTimeout', 'clearTimeout']);
    }
    const ticks = namedCalls('tick');
    expect(ticks.map((tick) => Number(tick.arguments[0]?.getText(ast)))).toEqual([0, 4000, 200]);
    const expiry = ticks[1]!;
    const unmount = ticks[2]!;
    const assertions = [...namedCalls('should'), ...namedCalls('and')].map(literalArgs);
    for (const state of [
      ['data-mounted', 'true'],
      ['data-visible', 'true'],
      ['data-removed', 'false'],
      ['data-removed', 'true'],
    ]) {
      expect(assertions).toContainEqual(['have.attr', ...state]);
    }
    const done = namedCalls('contains').find((call) => literalArgs(call)[1] === 'Done')!;
    expect(done.getStart(ast)).toBeGreaterThan(expiry.getStart(ast));
    expect(done.getEnd()).toBeLessThan(unmount.getStart(ast));
    expect(
      namedCalls('click').some(
        (click) =>
          click.getStart(ast) === done.getStart(ast) &&
          click.getEnd() > done.getEnd() &&
          click.arguments.length === 0
      )
    ).toBe(true);
    expect(
      namedCalls('should').some(
        (call) =>
          literalArgs(call)[0] === 'exist' &&
          call.getStart(ast) > done.getEnd() &&
          call.getEnd() < unmount.getStart(ast)
      )
    ).toBe(true);
    expect(namedCalls('restore')).toHaveLength(1);
    expect(namedCalls('restore')[0]!.getStart(ast)).toBeGreaterThan(unmount.getStart(ast));
    expect(namedCalls('elementFromPoint')).toHaveLength(1);
    expect(namedCalls('getComputedStyle')).toHaveLength(1);
    const body = ast.getText().replace(/\s+/gu, ' ');
    expect(body).not.toContain('toast.dismiss');
    expect(body).not.toContain('.remove()');
    expect(body).not.toContain('cy.wait(');
    expect(body).not.toContain('force: true');
  });
  it.each(['canvas-graph-search-filter-live', 'canvas-minimap-focus-live'])(
    'owns an acknowledged independent project for read-only evidence in %s',
    (name) => {
      const ast = browserModules.get(resolve(`cypress/e2e/canvas/${name}.cy.ts`))!;
      expect(ast.getText()).toContain('createLiveProjectThroughUi');
      expect(ast.getText()).toContain('WorkspaceGraphDraftScope');
      expect(ast.getText()).not.toContain('readLiveGraphDraft(resolveLiveWorkspaceSession()');
    }
  );

  it('uses the single current template and an owned language for graph-search evidence', () => {
    const ast = browserModules.get(
      resolve('cypress/e2e/canvas/canvas-graph-search-filter-live.cy.ts')
    )!;
    const body = ast.getText();
    expect(body).toContain('APPLICATION_LANGUAGE_STORAGE_KEY');
    expect(body).toContain('canvas-playground-template-choice');
    expect(body).toContain('[data-testid="canvas-viewport"]');
    expect(body).not.toContain('[data-slot="canvas-viewport"]');
    expect(body).toContain("addCanvasNode('dvt:sink'");
    expect(body).not.toContain('dbt:seed');
    expect(body).not.toContain("cy.contains('Create canvas'");
    expect(body).not.toContain(".contains('button', 'dbt canvas')");
  });

  it.each([
    ['dbt-project-preview-run-live', 'visitProjectWithRequestObservations'],
    ['dbt-project-yaml-description-edit-live', 'openModelWorkbench'],
  ])('targets the real title for dbt inspection in %s', (name, symbol) => {
    const ast = browserModules.get(resolve(`cypress/e2e/dbt/${name}.cy.ts`))!;
    expect(ast.getText()).toContain('graph-node-card-title');
    const declaration = ast.statements.find(
      (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === symbol
    );
    expect(declaration).toBeDefined();
    expect(ast.getText()).not.toMatch(/canvas-node-shell[^;]*\.dblclick\(\)/u);
    if (name === 'dbt-project-preview-run-live') {
      expect(ast.getText()).not.toContain('Order Summary Model');
    } else {
      expect(ast.getText()).toContain('selectCanvasClosure([MODEL_UNIQUE_ID])');
      expect(ast.getText()).toContain('openCanvasNodeOperations(MODEL_UNIQUE_ID)');
      expect(ast.getText()).not.toContain('button[aria-label="Select for execution"]');
      for (const label of ['Canvas', 'Requested resources', 'Project root']) {
        expect(ast.getText()).toContain(`[aria-label="${label}"]`);
        expect(ast.getText()).not.toContain(`[aria-label="${label} value"]`);
      }
    }
  });

  it('opens Connections after creation before checking the selected connection option', () => {
    const ast = browserModules.get(resolve('cypress/support/liveWarehouseSourceImport.ts'))!;
    const declaration = ast.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === 'createLivePostgresConnection'
    );
    expect(declaration).toBeDefined();
    const body = declaration!.getText(ast).replace(/\s+/gu, ' ');
    expect(body).toContain(
      "cy.get('[data-slot=\"source-import-create-connection-name\"]').should('not.exist')"
    );
    expect(body.indexOf("'not.exist'")).toBeLessThan(body.indexOf("'Connections'"));
    expect(body).toContain("cy.contains('[role=\"tab\"]', 'Connections').click()");
    expect(body.indexOf("'Connections'")).toBeLessThan(
      body.indexOf('source-import-connection-option')
    );
    expect(body).toContain("'aria-pressed', 'true'");
    expect(body).not.toContain('force: true');
  });

  it('fits and focuses a visible node before an unforced context selection gesture', () => {
    const ast = browserModules.get(resolve('cypress/support/canvasExecutionSelection.ts'))!;
    const declaration = ast.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) && statement.name?.text === 'openCanvasNodeOperations'
    );
    expect(declaration).toBeDefined();
    const body = declaration!.getText(ast).replace(/\s+/gu, ' ');
    expect(body).toContain("cy.get('.react-flow__controls-fitview').click()");
    expect(body.indexOf('controls-fitview')).toBeLessThan(body.indexOf('getVisibleCanvasNode'));
    expect(body).toContain(".should('be.visible')");
    expect(body).toContain(".should('be.focused')");
    expect(body).toContain(".rightclick('center')");
    expect(body).not.toContain('force: true');
  });

  it('fits the outer Canvas before hovering and requesting a Model Preview', () => {
    const ast = browserModules.get(resolve('cypress/support/relationalWorkbench/navigation.ts'))!;
    const declaration = ast.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) && statement.name?.text === 'previewWorkbenchModel'
    );
    expect(declaration).toBeDefined();
    const body = declaration!.getText(ast).replace(/\s+/gu, ' ');
    expect(body).toContain("cy.get('.react-flow__controls-fitview').click()");
    expect(body.indexOf('controls-fitview')).toBeLessThan(body.indexOf('hoverWorkbenchCard'));
    expect(body).not.toContain('force: true');
  });
});

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
  it('pins one Git comparison before discovery even if an alias moves before catalog reads', async () => {
    const childProcess = await import('node:child_process');
    const output = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const previous = {
      ...WEB_CYPRESS_CATALOG,
      controlled: WEB_CYPRESS_SPECS.controlled.slice(0, -1),
    };
    const calls: string[][] = [];
    let discovered = false;
    vi.stubEnv('GIT_BASE', 'base-alias');
    vi.stubEnv('GIT_HEAD', 'head-alias');
    vi.spyOn(childProcess, 'execFileSync').mockImplementation((_command, args) => {
      const command = args as string[];
      calls.push(command);
      if (command[0] === 'rev-parse') {
        const ref = command.at(-1)!.replace(/\^\{commit\}$/, '');
        return `${ref === 'base-alias' ? (discovered ? 'advanced-base' : 'base-sha') : ref === 'head-alias' ? 'head-sha' : ref}\n`;
      }
      if (
        command[0] === 'diff' &&
        command.includes('--no-renames') &&
        !command.includes('--cached') &&
        command.length > 4
      ) {
        discovered = true;
        return `${WEB_CYPRESS_CATALOG_PATH}\0`;
      }
      if (command[0] === 'ls-tree') return `${WEB_CYPRESS_CATALOG_PATH}\0`;
      if (command[0] === 'show')
        return JSON.stringify(command[1]!.startsWith('base-sha:') ? previous : WEB_CYPRESS_CATALOG);
      return '';
    });

    main(['--plan', '--phase=browser', '--browser-capability=controlled']);
    const plan = JSON.parse(String(output.mock.calls[0]![0]));
    expect(plan.browserCommands).toMatchObject([
      { capability: 'controlled', specPaths: [WEB_CYPRESS_SPECS.controlled.at(-1)] },
    ]);
    expect(calls).toContainEqual([
      'diff',
      '--name-only',
      '--no-renames',
      '-z',
      'base-sha',
      'head-sha',
    ]);
    expect(calls.filter((args) => args.includes('base-alias^{commit}'))).toHaveLength(1);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('admits retained shell menu consumers in their actual independent runtimes', () => {
    const controlled = 'apps/web/cypress/e2e/templates/templates-workbench.cy.ts';
    const available = 'apps/web/cypress/e2e/shell/active-project-creation-live.cy.ts';
    const controlledPlan = resolveWebVitestChangedSuitePlan([controlled]);
    expect(controlledPlan.browserCommands).toMatchObject([
      { capability: 'controlled', specPaths: [controlled] },
    ]);
    expect(resolveWebVitestChangedSuitePlan([available]).browserCommands).toEqual([liveCommand]);
    const body = browserModules.get(resolve(available.slice('apps/web/'.length)))!.getText();
    expect(body).toContain('visitWithLiveWorkspaceSession');
    expect(body).toContain('hasLiveProtectedRuntimeEnv');
    expect(body).not.toContain('liveProjectCreation');
    expect(body).not.toContain('this.skip');
  });

  it('admits every exact selection-helper consumer in its real runtime', () => {
    const graph = new Map(
      [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
    );
    const helperPath = 'apps/web/cypress/support/canvasExecutionSelection.ts';
    const target = resolve(helperPath.slice('apps/web/'.length));
    const consumers = [...browserModules.keys()]
      .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
      .map((path) => `apps/web/${path.slice(resolve('.').length + 1).replaceAll('\\', '/')}`)
      .sort();
    const plan = resolveWebVitestChangedSuitePlan([helperPath]);
    expect(consumers.length).toBeGreaterThan(0);
    for (const consumer of consumers) {
      const owners = Object.entries(WEB_CYPRESS_SPECS)
        .filter(([, paths]) => paths.includes(consumer))
        .map(([capability]) => capability);
      expect(owners, consumer).toHaveLength(1);
      const consumerPlan = resolveWebVitestChangedSuitePlan([consumer]);
      expect(
        consumerPlan.browserCommands.map((command) => command.capability),
        consumer
      ).toEqual(owners);
      for (const consumerOrHelperPlan of [consumerPlan, plan]) {
        expect(
          consumerOrHelperPlan.browserCommands.flatMap((command) =>
            command.specPaths.filter((path) => path === consumer).map(() => command.capability)
          ),
          consumer
        ).toEqual(owners);
        expect(
          consumerOrHelperPlan.browserFiles.filter((path) => path === consumer),
          consumer
        ).toEqual([consumer]);
      }
    }
    expect(plan.browserCommands.map((command) => command.capability)).toEqual([
      'controlled',
      'available',
      'unavailable',
    ]);
  });

  it('routes all real source-import helper consumers to the available runtime', () => {
    const graph = new Map(
      [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
    );
    const target = resolve('cypress/support/liveWarehouseSourceImport.ts');
    const consumers = [...browserModules.keys()]
      .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
      .map((path) => `apps/web/${path.slice(resolve('.').length + 1).replaceAll('\\', '/')}`)
      .sort();
    expect(consumers.length).toBeGreaterThan(0);
    for (const consumer of consumers) {
      expect(
        Object.entries(WEB_CYPRESS_SPECS)
          .filter(([, paths]) => paths.includes(consumer))
          .map(([capability]) => capability),
        consumer
      ).toEqual(['available']);
    }
    for (const path of [...consumers, 'apps/web/cypress/support/liveWarehouseSourceImport.ts']) {
      expect(resolveWebVitestChangedSuitePlan([path]).browserCommands).toEqual([liveCommand]);
    }
  });

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
        'canvas-dvt-sink-publication-live',
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

  it('admits the real project-authoring consumers in the available runtime', () => {
    const graph = new Map(
      [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
    );
    const target = resolve('cypress/support/liveProjectAuthoring.ts');
    const consumers = [...browserModules.keys()]
      .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
      .sort();
    const expected = [
      'canvas-dvt-join-preview-live',
      'canvas-dvt-sink-publication-live',
      'canvas-first-authoring-live',
      'canvas-graph-search-filter-live',
      'canvas-minimap-focus-live',
      'canvas-source-identity-live',
      'canvas-source-import-live-clean',
    ];
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
    const registered = [...Object.values(WEB_CYPRESS_SPECS).flat(), ...WEB_CYPRESS_NIGHTLY_SPECS];
    const registeredPhysical = new Set(
      registered.map((path) => resolve(path.slice('apps/web/'.length)))
    );
    expect(registeredPhysical.size).toBe(registered.length);
    for (const path of registeredPhysical) {
      expect(browserModules.has(path), path).toBe(true);
    }
    expect(fixtureConsumers.filter((path) => !registeredPhysical.has(path))).toEqual([]);
    for (const path of WEB_CYPRESS_SPECS.available) {
      const owner = resolve(path.slice('apps/web/'.length));
      expect(
        specs.filter((candidate) => reachesModule(graph, owner, candidate)),
        path
      ).toEqual([owner]);
    }
    expect(existsSync(resolve('cypress/e2e/canvas/canvas-selected-measures.cy.ts'))).toBe(false);

    const runtime = resolve('cypress/support/liveProtectedRuntime.ts');
    const unadmittedTransport = specs.filter(
      (path) => reachesModule(graph, path, runtime) && !registeredPhysical.has(path)
    );
    expect(unadmittedTransport).toEqual([]);
    for (const path of specs.filter((candidate) => !registeredPhysical.has(candidate))) {
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
    if (!path) throw new Error('The controlled browser catalog must be nonempty.');
    const isolated = resolveWebVitestChangedSuitePlan([path, path]);
    expect(isolated.browserCommands).toHaveLength(1);
    expect(isolated.browserCommands[0]!.specPaths).toEqual([path]);
    expect(resolveWebVitestChangedSuitePlan([path, fixture]).browserCommands[0]!.specPaths).toEqual(
      WEB_CYPRESS_SPECS.controlled
    );
  });

  it.each([
    'apps/web/cypress/e2e/shell/session-publication-lifecycle.cy.ts',
    'apps/web/cypress/e2e/shell/startup-stylesheet-loading.cy.ts',
    'apps/web/cypress/support/startupReadiness.ts',
    'apps/web/cypress/support/relationalWorkbench/pendingComposition.ts',
  ])('admits exact evidence at the controlled runtime for %s', (path) => {
    const plan = resolveWebVitestChangedSuitePlan([path]);
    expect(plan.commandPlan).toEqual([]);
    expect(plan.browserCommands.map(({ capability }) => capability)).toEqual(['controlled']);
    expect(plan.browserCommands[0]!.specPaths).toEqual(
      path.endsWith('.cy.ts') ? [path] : WEB_CYPRESS_SPECS.controlled
    );
  });

  it.each([
    [
      'cypress/support/startupReadiness.ts',
      [
        'cypress/e2e/shell/startup-route-readiness.cy.ts',
        'cypress/e2e/shell/startup-stylesheet-loading.cy.ts',
      ],
    ],
    [
      'cypress/support/relationalWorkbench/pendingComposition.ts',
      [
        'cypress/e2e/canvas/canvas-join-output-policies.cy.ts',
        'cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts',
      ],
    ],
  ] as const)('keeps %s scoped to its two real browser consumers', (helperPath, specPaths) => {
    const graph = new Map(
      [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
    );
    const target = resolve(helperPath);
    const consumers = [...browserModules.keys()]
      .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
      .sort();
    expect(consumers).toEqual(specPaths.map((path) => resolve(path)).sort());
    for (const path of specPaths) {
      expect(WEB_CYPRESS_SPECS.controlled).toContain(`apps/web/${path}`);
    }
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
    expect(live.browserFiles.filter((path) => path.endsWith('.cy.ts')).sort()).toEqual(
      [...WEB_CYPRESS_SPECS.available].sort()
    );
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
      for (const missing of [spec, helper, ...WEB_CYPRESS_NIGHTLY_SPECS]) {
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
    'apps/web/cypress/support/postgresPublicationFlow.ts',
    'apps/web/cypress/support/semanticLive/progressive.ts',
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
    'apps/web/cypress/support/semanticLive/unregistered.ts',
    'apps/web/cypress/support/relationalWorkbench/unregistered.ts',
    'apps/web/cypress/fixtures/new.json',
    'apps/web/cypress.live.config.ts',
    'apps/web/cypress/node/unregisteredDiagnostic.ts',
    'apps/web/cypress/node/unregisteredDiagnostic.py',
  ])('rejects browser surfaces without admitted consumer evidence: %s', (file) => {
    expect(() => resolveWebVitestChangedSuitePlan([file])).toThrow(file);
    expect(() => resolveWebVitestChangedSuitePlan([spec, file], { full: true })).toThrow(file);
  });

  it.each([
    'apps/web/cypress.config.ts',
    'cypress.config.ts',
    'apps/web/cypress/node/chromiumNetworkDiagnostics.ts',
    'apps/web/cypress/node/chromiumNetworkProjection.ts',
    'apps/web/cypress/node/chromiumNetworkEvidence.ts',
    'apps/web/cypress/node/chromiumProcessObserver.ts',
  ])('exact Node configuration imports retain all browser obligations: %s', (file) => {
    expect(
      resolveWebVitestChangedSuitePlan([file]).browserCommands.map(({ capability }) => capability)
    ).toEqual(['controlled', 'available', 'unavailable']);
  });

  it.each([
    'apps/web/cypress/node/linuxChromiumProcessObserver.py',
    'apps/web/cypress/node/linuxChromiumProcessProtocol.py',
    'apps/web/cypress/node/linuxChromiumSignalTrace.py',
    'apps/web/cypress/node/linuxChromiumOomJournal.py',
  ])('Linux observer changes retain the real LIVE execution obligation: %s', (file) => {
    expect(
      resolveWebVitestChangedSuitePlan([file]).browserCommands.map(({ capability }) => capability)
    ).toEqual(['available']);
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

  it('compiled provider runtime changes retain both real obligations without allocating controlled providers', () => {
    expect(
      resolveWebVitestChangedSuitePlan(['scripts/live-proof-web-runtime.cjs']).browserCommands.map(
        ({ capability }) => capability
      )
    ).toEqual(['available', 'unavailable']);
  });

  it.each([
    [helper, 'interruptLiveRunEventFeed', spec],
    [dataHelper, 'registerCanvasNodeDataActionsProof', spec],
    [formulaJourney, 'exerciseTransformFormulaAuthoring', transformStage],
    [treeJourney, 'exerciseTransformTreeSelection', transformStage],
    [
      'apps/web/cypress/support/semanticLive/progressive.ts',
      'addLiveFormula',
      'apps/web/cypress/e2e/canvas/canvas-sql-progressive-live.cy.ts',
    ],
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
        resolve('cypress/support/canvasReadyAuthoring.ts'),
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
