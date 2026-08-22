/** Owned concern: prevent retired Canvas URL translation from regaining production authority. */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Canvas canonical route authority', () => {
  const appRoot = path.resolve(import.meta.dirname, '../..');

  function listProductionTypeScript(relativeDirectory: string): string[] {
    const absoluteDirectory = path.join(appRoot, relativeDirectory);

    return readdirSync(absoluteDirectory).flatMap((entry) => {
      const relativePath = path.join(relativeDirectory, entry).replaceAll(path.sep, '/');
      const absolutePath = path.join(appRoot, relativePath);

      if (statSync(absolutePath).isDirectory()) {
        return listProductionTypeScript(relativePath);
      }

      if (!/\.(?:ts|tsx)$/.test(entry) || /\.(?:test|spec)\.(?:ts|tsx)$/.test(entry)) {
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

  it('keeps the one-shot canvasIntent protocol out of production source', () => {
    const forbiddenFacts = [
      'CanvasLegacyWorkbenchRedirect',
      'canvasLegacyRouteIntent',
      'useCanvasRouteIntentHandler',
      'CanvasShellRouteIntentRequest',
      'canvasIntent',
    ];
    const retiredUrls = /\/canvas\/(?:code|lineage|diff|artifacts)(?:[/?'"`]|$)/;

    for (const relativePath of listProductionTypeScript('.')) {
      const source = readFileSync(path.join(appRoot, relativePath), 'utf8');

      for (const forbiddenFact of forbiddenFacts) {
        expect(source, `${relativePath} contains ${forbiddenFact}`).not.toContain(forbiddenFact);
      }
      expect(source, `${relativePath} contains a retired Canvas URL`).not.toMatch(retiredUrls);
    }
  });
});
