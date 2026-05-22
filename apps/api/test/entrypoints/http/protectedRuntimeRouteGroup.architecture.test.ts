import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PROTECTED_RUNTIME_COMMAND_QUERY_RAILS } from '../../../src/application/ports/protectedRuntimeCommandQueryRails.js';
import { RUNTIME_ROUTE_PATH } from '../../../src/entrypoints/http/runtimeRoutes.constants.js';

const DOC_PATH = join(
  import.meta.dirname,
  '../../../docs/protected-runtime-route-group-component.md'
);
const DESIGN_DOC_PATH = join(
  import.meta.dirname,
  '../../../../../docs/architecture/components/api/protected-runtime-command-query-rail-design.md'
);
const CATALOG_PATH = join(
  import.meta.dirname,
  '../../../src/application/ports/protectedRuntimeCommandQueryRails.ts'
);
const SIGNAL_PARSER_CONSTANTS_PATH = join(
  import.meta.dirname,
  '../../../src/entrypoints/http/signalRunRouteParser.constants.ts'
);

const RUNTIME_ROUTE_METHOD_BY_KEY = {
  session: ['GET'],
  start: ['POST'],
  plansCompile: ['POST'],
  plansPreview: ['POST'],
  plansImport: ['POST'],
  workspaceContext: ['GET'],
  workspaceGraphDraft: ['GET', 'PUT'],
  workspaceDiffChanges: ['GET'],
  workspaceFiles: ['GET'],
  workspaceFileHistory: ['GET'],
  workspaceFileContent: ['GET'],
  list: ['GET'],
  get: ['GET'],
  events: ['GET'],
  signal: ['POST'],
  cancel: ['POST'],
  recover: ['POST'],
} as const satisfies Record<keyof typeof RUNTIME_ROUTE_PATH, readonly ('GET' | 'POST' | 'PUT')[]>;

const PROTECTED_RUNTIME_ADAPTER_SURFACES = new Set([
  ...Object.entries(RUNTIME_ROUTE_METHOD_BY_KEY).flatMap(([routeKey, methods]) =>
    methods.map(
      (method) => `${method} ${RUNTIME_ROUTE_PATH[routeKey as keyof typeof RUNTIME_ROUTE_PATH]}`
    )
  ),
  'POST /admin/runs/:runId/rebuild-snapshot',
]);

describe('protected runtime route group architecture', () => {
  it('ships a local component guide with the mandatory component sections', () => {
    expect(existsSync(DOC_PATH)).toBe(true);

    const docText = readFileSync(DOC_PATH, 'utf8');
    for (const section of [
      '## Owned concern',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
    ]) {
      expect(docText).toContain(section);
    }
    expect(docText).toContain('```mermaid');
  });

  it('keeps row-level rail truth in the executable catalog instead of a component guide table', () => {
    const docText = readFileSync(DOC_PATH, 'utf8');

    expect(docText).toContain(
      'Complete row-level rail truth lives in `PROTECTED_RUNTIME_COMMAND_QUERY_RAILS`'
    );
    expect(docText).toContain(
      '`apps/api/src/application/ports/protectedRuntimeCommandQueryRails.ts`'
    );
    expect(docText).not.toContain('## Command/query rail matrix');
    for (const rail of PROTECTED_RUNTIME_COMMAND_QUERY_RAILS) {
      const duplicatedRows = docText
        .split('\n')
        .filter((line) => line.startsWith('|') && line.includes(`\`${rail.adapterSurface}\``));

      expect(duplicatedRows, `${rail.name} has duplicated component-doc row truth`).toHaveLength(0);
    }
  });

  it('ships the protected runtime command/query rails as an application catalog', () => {
    expect(existsSync(CATALOG_PATH)).toBe(true);

    expect(PROTECTED_RUNTIME_COMMAND_QUERY_RAILS).toHaveLength(
      PROTECTED_RUNTIME_ADAPTER_SURFACES.size
    );
    for (const rail of PROTECTED_RUNTIME_COMMAND_QUERY_RAILS) {
      expect(PROTECTED_RUNTIME_ADAPTER_SURFACES.has(rail.adapterSurface)).toBe(true);
      expect(rail.name).toMatch(/^[A-Z][A-Za-z0-9]+$/);
      expect(['command', 'query']).toContain(rail.kind);
      expect(rail.boundedContext).not.toHaveLength(0);
      expect(rail.dddObject).not.toHaveLength(0);
      expect(rail.applicationPort).not.toHaveLength(0);
      expect(rail.scopeAndAuthorization).not.toHaveLength(0);
      expect(rail.negativeTests.length).toBeGreaterThan(0);
    }

    const docText = readFileSync(DOC_PATH, 'utf8');
    expect(docText).toContain('PROTECTED_RUNTIME_COMMAND_QUERY_RAILS');
  });

  it('maps every required negative rail case to executable test evidence', () => {
    for (const rail of PROTECTED_RUNTIME_COMMAND_QUERY_RAILS) {
      expect(rail.negativeCoverage).toHaveLength(rail.negativeTests.length);

      for (const negativeCase of rail.negativeTests) {
        const coverage = rail.negativeCoverage.find((entry) => entry.case === negativeCase);

        expect(coverage, `${rail.name} missing coverage for ${negativeCase}`).toBeDefined();
        expect(coverage?.testRefs.length).toBeGreaterThan(0);
        for (const testRef of coverage?.testRefs ?? []) {
          expect(testRef).toMatch(/^apps\/api\/test\/.+\.ts$/);
          expect(
            existsSync(join(import.meta.dirname, '../../../../..', testRef)),
            `${rail.name} references missing test evidence ${testRef}`
          ).toBe(true);
        }
      }
    }
  });

  it('keeps compatibility wording only on rails with explicit compatibility posture', () => {
    for (const rail of PROTECTED_RUNTIME_COMMAND_QUERY_RAILS) {
      if (rail.compatibilityPosture.status === 'compatibility') {
        expect(rail.scopeAndAuthorization.toLowerCase()).toContain('compatibility');
        continue;
      }

      expect(rail.scopeAndAuthorization.toLowerCase()).not.toContain('compatibility');
    }
  });

  it('documents the signal parser constants facade as an intentional parser boundary', () => {
    expect(existsSync(SIGNAL_PARSER_CONSTANTS_PATH)).toBe(true);

    const docText = readFileSync(DOC_PATH, 'utf8');
    const designDocText = readFileSync(DESIGN_DOC_PATH, 'utf8');
    for (const text of [docText, designDocText]) {
      const normalizedText = text.replace(/\s+/g, ' ');
      expect(normalizedText).toContain(
        '`signalRunRouteParser.constants.ts` is an intentional parser-local constants facade'
      );
      expect(normalizedText).toContain('not a generic barrel');
    }
  });

  it('documents CANCEL through /signal as compatibility, not a second canonical cancel rail', () => {
    const docText = readFileSync(DOC_PATH, 'utf8');
    const compatibilityRails = PROTECTED_RUNTIME_COMMAND_QUERY_RAILS.filter(
      (rail) => rail.compatibilityPosture.status === 'compatibility'
    );

    expect(compatibilityRails).toHaveLength(1);
    const signalCompatibilityRail = compatibilityRails[0];
    expect(signalCompatibilityRail?.name).toBe('SignalRun');
    if (signalCompatibilityRail?.compatibilityPosture.status !== 'compatibility') {
      throw new Error('SignalRun must declare compatibility posture');
    }
    expect(signalCompatibilityRail.compatibilityPosture.canonicalRail).toBe('CancelRun');
    expect(signalCompatibilityRail.compatibilityPosture.removalRequires).toContain(
      'governed deprecation plan'
    );
    for (const rail of PROTECTED_RUNTIME_COMMAND_QUERY_RAILS) {
      expect(['canonical', 'compatibility']).toContain(rail.compatibilityPosture.status);
      if (rail.compatibilityPosture.status === 'canonical') {
        expect(rail.compatibilityPosture.legacyAccepted).toBe(false);
      }
    }
    expect(docText).toContain('`POST /runs/:runId/signal` with `CANCEL` is compatibility behavior');
    expect(docText).toContain('`POST /runs/:runId/cancel` is the canonical cancel command route');
    expect(docText).toContain('No protected runtime rail accepts legacy behavior as canonical');
  });
});
