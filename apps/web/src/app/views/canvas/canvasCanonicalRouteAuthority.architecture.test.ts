/** Owned concern: prevent retired Canvas URL translation from regaining production authority. */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { readArchitectureSources } from '../../../testing/vitestSuites.architecture.support';

const FORBIDDEN_CANVAS_ROUTE_FACTS = [
  'CanvasLegacyWorkbenchRedirect',
  'canvasLegacyRouteIntent',
  'useCanvasRouteIntentHandler',
  'CanvasShellRouteIntentRequest',
  'canvasIntent',
];
const RETIRED_CANVAS_URLS = /\/canvas\/(?:code|lineage|diff|artifacts)(?:[/?'"`]|$)/;

function collectRetiredCanvasRouteViolations(filePath: string, source: string): string[] {
  const violations = FORBIDDEN_CANVAS_ROUTE_FACTS.filter((forbiddenFact) =>
    source.includes(forbiddenFact)
  ).map((forbiddenFact) => `${filePath} contains ${forbiddenFact}`);
  if (RETIRED_CANVAS_URLS.test(source))
    violations.push(`${filePath} contains a retired Canvas URL`);
  return violations;
}

describe('Canvas canonical route authority', () => {
  const appRoot = path.resolve(import.meta.dirname, '../..');

  function listProductionTypeScript(relativeDirectory: string): string[] {
    const absoluteDirectory = path.join(appRoot, relativeDirectory);

    return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
      const relativePath = path.join(relativeDirectory, entry.name).replaceAll(path.sep, '/');
      const absolutePath = path.join(appRoot, relativePath);

      if (entry.isDirectory() || (entry.isSymbolicLink() && statSync(absolutePath).isDirectory())) {
        return listProductionTypeScript(relativePath);
      }

      if (!/\.(?:ts|tsx)$/.test(entry.name) || /\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name)) {
        return [];
      }

      return [relativePath];
    });
  }

  it('keeps exhausted legacy route modules and the wildcard route absent', () => {
    const retiredModules = [
      'routes/CanvasLegacyWorkbenchRedirect.tsx',
      'views/canvas/canvasLegacyRouteIntent.ts',
      'views/canvas/useCanvasRouteIntentHandler.ts',
    ];

    for (const retiredModule of retiredModules) {
      expect(existsSync(path.join(appRoot, retiredModule)), retiredModule).toBe(false);
    }

    const routesSource = readFileSync(path.join(appRoot, 'routes.ts'), 'utf8');
    expect(routesSource).not.toContain("path: 'canvas/*'");
    expect(routesSource).not.toContain('dbt.canvas.retired-workbench-redirect');
  });

  it('reports every retired route fact and preserves the Canvas URL boundaries', () => {
    expect(
      collectRetiredCanvasRouteViolations(
        'fixture.ts',
        `
      CanvasLegacyWorkbenchRedirect canvasLegacyRouteIntent useCanvasRouteIntentHandler
      CanvasShellRouteIntentRequest canvasIntent '/canvas/code'
    `
      )
    ).toEqual([
      'fixture.ts contains CanvasLegacyWorkbenchRedirect',
      'fixture.ts contains canvasLegacyRouteIntent',
      'fixture.ts contains useCanvasRouteIntentHandler',
      'fixture.ts contains CanvasShellRouteIntentRequest',
      'fixture.ts contains canvasIntent',
      'fixture.ts contains a retired Canvas URL',
    ]);
    for (const route of ['code', 'lineage', 'diff', 'artifacts']) {
      for (const suffix of ['', '/', '?', "'", '"', '`']) {
        expect(
          collectRetiredCanvasRouteViolations('route.tsx', `/canvas/${route}${suffix}`)
        ).toEqual(['route.tsx contains a retired Canvas URL']);
      }
      expect(collectRetiredCanvasRouteViolations('clean.tsx', `/canvas/${route}-review`)).toEqual(
        []
      );
    }
    expect(collectRetiredCanvasRouteViolations('clean.tsx', 'CanvasIntent /canvas')).toEqual([]);
  });

  it('keeps the one-shot canvasIntent protocol out of production source', async () => {
    const sources = await readArchitectureSources(
      listProductionTypeScript('.').map((relativePath) => path.join(appRoot, relativePath))
    );
    const violations = Array.from(sources, ([filePath, source]) =>
      collectRetiredCanvasRouteViolations(
        path.relative(appRoot, filePath).replaceAll(path.sep, '/'),
        source
      )
    ).flat();

    expect(violations).toEqual([]);
  });
});
