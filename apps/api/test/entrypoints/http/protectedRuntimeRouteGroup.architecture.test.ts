import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { RUNTIME_ROUTE_PATH } from '../../../src/entrypoints/http/runtimeRoutes.constants.js';

const DOC_PATH = join(
  import.meta.dirname,
  '../../../docs/protected-runtime-route-group-component.md'
);

const GOVERNED_ROUTE_RAILS = [
  {
    method: 'POST',
    path: RUNTIME_ROUTE_PATH.start,
    rail: 'Command',
    owner: 'StartRunAuthorizedFacade',
  },
  {
    method: 'POST',
    path: RUNTIME_ROUTE_PATH.plansPreview,
    rail: 'Command',
    owner: 'PreviewPlanUseCase',
  },
  {
    method: 'POST',
    path: RUNTIME_ROUTE_PATH.plansCompile,
    rail: 'Query',
    owner: 'CompilePlanUseCase',
  },
  {
    method: 'POST',
    path: RUNTIME_ROUTE_PATH.plansImport,
    rail: 'Command',
    owner: 'ImportPlanUseCase',
  },
  {
    method: 'GET',
    path: RUNTIME_ROUTE_PATH.workspaceGraphDraft,
    rail: 'Query',
    owner: 'getWorkspaceGraphDraftUseCase',
  },
  {
    method: 'PUT',
    path: RUNTIME_ROUTE_PATH.workspaceGraphDraft,
    rail: 'Command',
    owner: 'saveWorkspaceGraphDraftUseCase',
  },
  { method: 'GET', path: RUNTIME_ROUTE_PATH.list, rail: 'Query', owner: 'ListRunsUseCase' },
  { method: 'GET', path: RUNTIME_ROUTE_PATH.get, rail: 'Query', owner: 'GetRunStatusUseCase' },
  { method: 'GET', path: RUNTIME_ROUTE_PATH.events, rail: 'Query', owner: 'GetRunEventsUseCase' },
  { method: 'POST', path: RUNTIME_ROUTE_PATH.signal, rail: 'Command', owner: 'SignalRunUseCase' },
  { method: 'POST', path: RUNTIME_ROUTE_PATH.cancel, rail: 'Command', owner: 'CancelRunUseCase' },
  { method: 'POST', path: RUNTIME_ROUTE_PATH.recover, rail: 'Command', owner: 'RecoverRunUseCase' },
  {
    method: 'POST',
    path: '/admin/runs/:runId/rebuild-snapshot',
    rail: 'Command',
    owner: 'registerAdminRoutes',
  },
] as const;

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

    for (const route of GOVERNED_ROUTE_RAILS) {
      expect(docText).toContain(`\`${route.method} ${route.path}\``);
      expect(docText).toContain(`| \`${route.method} ${route.path}\` | ${route.rail} |`);
      expect(docText).toContain(`| ${route.owner} |`);
    }
  });

  it('documents CANCEL through /signal as compatibility, not a second canonical cancel rail', () => {
    const docText = readFileSync(DOC_PATH, 'utf8');

    expect(docText).toContain('`POST /runs/:runId/signal` with `CANCEL` is compatibility behavior');
    expect(docText).toContain('`POST /runs/:runId/cancel` is the canonical cancel command route');
  });
});
