// @vitest-environment node
/** @ownedConcern Keep large-graph stress scheduled without dropping functional browser evidence. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';
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

type WorkflowStep = {
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, unknown>;
  'continue-on-error'?: boolean;
};
type NightlyWorkflow = {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency: { group: string; 'cancel-in-progress': boolean };
  jobs: Record<string, { services?: unknown; steps: WorkflowStep[]; 'timeout-minutes': number }>;
};

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

  it('schedules the exact controlled native proof with owned build, failure reporting and no providers', () => {
    const workflow = load(readFileSync(resolve(repoRoot, workflowPath), 'utf8')) as NightlyWorkflow;
    expect(Object.keys(workflow.on).sort()).toEqual(['schedule', 'workflow_dispatch']);
    expect(workflow.on.schedule).toEqual([{ cron: '30 3 * * *' }]);
    expect(workflow.permissions).toEqual({ contents: 'read', issues: 'write' });
    expect(workflow.concurrency.group).toContain('web-canvas-nightly');
    expect(workflow.concurrency['cancel-in-progress']).toBe(true);
    const jobs = Object.values(workflow.jobs);
    expect(jobs).toHaveLength(1);
    const job = jobs[0]!;
    expect(job.services).toBeUndefined();
    expect(job['timeout-minutes']).toBe(20);
    const proof = job.steps.find(({ run }) => run?.includes('test:e2e:native'));
    expect(proof?.run).toBe(
      `pnpm --filter @dvt/web test:e2e:native --browser chrome --spec ${nightly.slice('apps/web/'.length)}`
    );
    expect(proof?.if).toBeUndefined();
    expect(job.steps.every((step) => step['continue-on-error'] !== true)).toBe(true);
    expect(job.steps.some(({ uses }) => uses === './.github/actions/setup-node-pnpm')).toBe(true);
    for (const { uses } of job.steps)
      if (uses && !uses.startsWith('./')) expect(uses).toMatch(/@[a-f\d]{40}$/);
    const upload = job.steps.find(({ uses }) => uses?.startsWith('actions/upload-artifact@'));
    expect(upload?.if).toBe('failure() || cancelled()');
    expect(upload?.with?.path).toBe('.dvt/evidence/selected-closure/screenshots');
    const notify = job.steps.find(({ run }) => run?.includes('gh issue create'));
    expect(notify?.if).toBe('failure()');
    expect(notify?.run).toContain('gh issue comment');
  });
});
