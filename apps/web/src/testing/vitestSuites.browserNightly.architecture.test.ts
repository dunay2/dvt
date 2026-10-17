// @vitest-environment node
/** @ownedConcern Keep large-graph stress scheduled without dropping functional browser evidence. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  WEB_CYPRESS_NIGHTLY_SPECS,
  WEB_CYPRESS_SPECS,
  resolveWebCypressChangedPlan,
} from '../../cypress.changed';
import { resolveWebVitestChangedSuitePlan } from '../../vitest.suites';

const nightly = 'apps/web/cypress/e2e/canvas/canvas-large-graph.nightly.cy.ts';
const authoring = 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts';
const guard = 'apps/web/src/testing/vitestSuites.browserNightly.architecture.test.ts';
const workflowPath = '.github/workflows/web-canvas-nightly.yml';
const repoRoot = resolve('../..');

describe('Canvas nightly browser cadence', () => {
  it('admits exactly one existing nightly spec, disjoint from every per-change runtime', () => {
    expect(WEB_CYPRESS_NIGHTLY_SPECS).toEqual([nightly]);
    expect(existsSync(resolve(repoRoot, nightly))).toBe(true);
    expect(Object.values(WEB_CYPRESS_SPECS).flat()).not.toContain(nightly);
    expect(WEB_CYPRESS_SPECS.controlled).toContain(authoring);
    expect(WEB_CYPRESS_SPECS.controlled).toContain(
      'apps/web/cypress/e2e/canvas/canvas-geometry-performance.cy.ts'
    );
  });

  it('keeps stress out of changed, shared-helper and full browser execution', () => {
    for (const [paths, full] of [
      [[nightly], false],
      [[authoring], false],
      [['apps/web/cypress/support/canvasReadyAuthoring.ts'], false],
      [['apps/web/cypress/support/canvasDraftAuthoring.ts'], false],
      [[], true],
    ] as const) {
      const plan = resolveWebCypressChangedPlan(paths, full);
      expect(plan.commands.flatMap(({ specPaths }) => specPaths)).not.toContain(nightly);
      if (paths.some((path) => path === authoring)) {
        expect(plan.commands[0]?.specPaths).toEqual([authoring]);
      }
    }
  });

  it('validates nightly changes and workflow wiring instead of silently ignoring them', () => {
    for (const path of [nightly, workflowPath]) {
      const plan = resolveWebVitestChangedSuitePlan([path]);
      expect(plan.browserCommands).toEqual([]);
      expect(plan.browserFiles).toContain(nightly);
      expect(plan.commandPlan).toContainEqual({
        kind: 'vitest-files',
        config: 'vitest.architecture.config.ts',
        filePaths: [guard.slice('apps/web/'.length)],
      });
    }
    expect(() =>
      resolveWebCypressChangedPlan(['apps/web/cypress/e2e/canvas/unregistered.nightly.cy.ts'])
    ).toThrow(/not admitted/);
  });

  it('extracts scale only and retains the canonical fixture and ready-session harness', () => {
    const ordinary = readFileSync(resolve(repoRoot, authoring), 'utf8');
    const stress = readFileSync(resolve(repoRoot, nightly), 'utf8');
    expect(ordinary).not.toContain('largeGraph: true');
    expect(stress).toContain('stubStatefulCanvasDraftAuthoring({ largeGraph: true })');
    for (const source of [ordinary, stress]) {
      expect(source).toContain("from '../../support/canvasReadyAuthoring'");
      expect(source).not.toMatch(/\bit\.(?:skip|only)\s*\(/);
    }
    for (const action of [
      'selected',
      'controls-zoomin',
      'mousedown',
      'mousemove',
      'mouseup',
      'openNodeProperties',
      'canvas-node-workbench-close',
    ]) {
      expect(stress).toContain(action);
    }
  });
});
