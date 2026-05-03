import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PROTECTED_RUNTIME_COMMAND_QUERY_RAILS } from '../../../src/application/ports/protectedRuntimeCommandQueryRails.js';
import { RUNTIME_ROUTE_PATH } from '../../../src/entrypoints/http/runtimeRoutes.constants.js';

const DOC_PATH = join(
  import.meta.dirname,
  '../../../docs/protected-runtime-route-group-component.md'
);
const CATALOG_PATH = join(
  import.meta.dirname,
  '../../../src/application/ports/protectedRuntimeCommandQueryRails.ts'
);

const PROTECTED_RUNTIME_ADAPTER_SURFACES = new Set([
  `POST ${RUNTIME_ROUTE_PATH.start}`,
  `POST ${RUNTIME_ROUTE_PATH.plansPreview}`,
  `POST ${RUNTIME_ROUTE_PATH.plansCompile}`,
  `POST ${RUNTIME_ROUTE_PATH.plansImport}`,
  `GET ${RUNTIME_ROUTE_PATH.workspaceGraphDraft}`,
  `PUT ${RUNTIME_ROUTE_PATH.workspaceGraphDraft}`,
  `GET ${RUNTIME_ROUTE_PATH.list}`,
  `GET ${RUNTIME_ROUTE_PATH.get}`,
  `GET ${RUNTIME_ROUTE_PATH.events}`,
  `POST ${RUNTIME_ROUTE_PATH.signal}`,
  `POST ${RUNTIME_ROUTE_PATH.cancel}`,
  `POST ${RUNTIME_ROUTE_PATH.recover}`,
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

  it('keeps every protected runtime route in the documented command/query rail matrix', () => {
    const docText = readFileSync(DOC_PATH, 'utf8');

    for (const rail of PROTECTED_RUNTIME_COMMAND_QUERY_RAILS) {
      expect(docText).toContain(`\`${rail.adapterSurface}\``);
      expect(docText).toContain(rail.kind === 'command' ? '| Command |' : '| Query   |');
      expect(docText).toContain(rail.applicationPort);
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

  it('documents CANCEL through /signal as compatibility, not a second canonical cancel rail', () => {
    const docText = readFileSync(DOC_PATH, 'utf8');

    expect(docText).toContain('`POST /runs/:runId/signal` with `CANCEL` is compatibility behavior');
    expect(docText).toContain('`POST /runs/:runId/cancel` is the canonical cancel command route');
  });
});
