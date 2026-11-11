// @vitest-environment node
/**
 * Owned concern: register the complete browser routing proof once.
 * @baseline GH-3765: independent Vitest files repeated the complete Cypress source scan.
 * @decision Keep bounded contract modules behind the existing architecture entry.
 * @consequence All original assertions share one input graph without changing test discovery.
 */
import { afterEach, beforeEach, describe, vi } from 'vitest';
import { registerBrowserRoutingCli } from './vitestSuites.browserRouting.cli.test-cases';
import { registerBrowserRoutingComparison } from './vitestSuites.browserRouting.comparison.test-cases';
import { registerBrowserRoutingFixtureClosure } from './vitestSuites.browserRouting.fixtureClosure.test-cases';
import { registerBrowserRoutingGestures } from './vitestSuites.browserRouting.gestures.test-cases';
import { registerBrowserRoutingHelperClosure } from './vitestSuites.browserRouting.helperClosure.test-cases';
import { registerBrowserRoutingOwnership } from './vitestSuites.browserRouting.ownership.test-cases';
import { registerBrowserRoutingPartitions } from './vitestSuites.browserRouting.partitions.test-cases';
import { registerBrowserRoutingRetirement } from './vitestSuites.browserRouting.retirement.test-cases';
import { registerBrowserRoutingRuntime } from './vitestSuites.browserRouting.runtime.test-cases';
import {
  resetBrowserRoutingDoubles,
  restoreBrowserRoutingDoubles,
} from './vitestSuites.browserRouting.runtime.test-support';
import { registerBrowserRoutingSurfaces } from './vitestSuites.browserRouting.surfaces.test-cases';

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  spawnSync: vi.fn(),
}));
vi.mock('../../scripts/web-evidence-environment', () => ({
  resolveWebEvidenceEnvironment: vi.fn((_commands, env) => env),
}));
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: vi.fn(actual.existsSync), appendFileSync: vi.fn() };
});

describe('governed browser evidence routing', () => {
  beforeEach(resetBrowserRoutingDoubles);
  afterEach(restoreBrowserRoutingDoubles);
  registerBrowserRoutingCli();
  registerBrowserRoutingComparison();
  registerBrowserRoutingFixtureClosure();
  registerBrowserRoutingGestures();
  registerBrowserRoutingHelperClosure();
  registerBrowserRoutingOwnership();
  registerBrowserRoutingPartitions();
  registerBrowserRoutingRetirement();
  registerBrowserRoutingRuntime();
  registerBrowserRoutingSurfaces();
});
