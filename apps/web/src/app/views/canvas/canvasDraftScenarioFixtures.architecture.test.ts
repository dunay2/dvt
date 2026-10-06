/**
 * Owned concern: prove fixture and live transport modules load without browser globals.
 * @baseline GH-3578: consumer routing follows actual fixture dependencies.
 * @decision Exercise real module imports and guard the transport boundary.
 * @consequence Transport-only LIVE consumers do not inherit draft scenario construction.
 * @version 1.0.0
 */
import { describe, expect, it } from 'vitest';

const scenarios = import.meta.glob('../../../../cypress/support/canvasDrafts/*.ts');
const scenarioSources = import.meta.glob<string>('../../../../cypress/support/canvasDrafts/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const liveModules = import.meta.glob([
  '../../../../cypress/support/liveProtectedRuntime.ts',
  '../../../../cypress/support/liveProtectedRequest.ts',
  '../../../../cypress/support/liveCanvasDraftAuthoring.ts',
]);
const transportSources = import.meta.glob<string>(
  [
    '../../../../cypress/support/liveProtectedRuntime.ts',
    '../../../../cypress/support/liveProtectedRequest.ts',
  ],
  { query: '?raw', import: 'default', eager: true }
);

describe('Canvas fixture and transport ownership', () => {
  it('imports the real fixture and LIVE modules without installing browser globals', async () => {
    expect('cy' in globalThis).toBe(false);
    expect('Cypress' in globalThis).toBe(false);
    expect(Object.keys(scenarios)).toHaveLength(11);
    expect(Object.keys(liveModules)).toHaveLength(3);
    await Promise.all(
      Object.values({ ...scenarios, ...liveModules }).map((load) =>
        expect(load()).resolves.toBeDefined()
      )
    );
    expect('cy' in globalThis).toBe(false);
    expect('Cypress' in globalThis).toBe(false);
  });

  it('keeps scenario construction out of generic LIVE transport', async () => {
    const runtime = await liveModules['../../../../cypress/support/liveProtectedRuntime.ts']!();
    expect(runtime).not.toHaveProperty('seedLiveSelectedClosureDraft');
    for (const [path, source] of Object.entries(transportSources)) {
      expect(source, path).not.toMatch(
        /canvasDraftAuthoring|canvasDrafts\/|liveCanvasDraftAuthoring/
      );
    }
    for (const [path, source] of Object.entries(scenarioSources)) {
      expect(source, path).not.toMatch(
        /canvasDraftAuthoring|e2eApiStub|workspaceSession|\b(?:cy|Cypress)\./
      );
    }
  });
});
