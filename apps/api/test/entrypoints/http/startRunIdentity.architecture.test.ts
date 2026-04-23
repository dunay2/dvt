/**
 * Owned concern: verify that API start-run identity stays platform-owned and
 * semantically isolated from runtime lifecycle concerns.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { generatePlatformRunId } from '../../../src/entrypoints/http/startRunIdentity.js';
import { parseStartRunBody } from '../../../src/entrypoints/http/startRunRouteParser.js';

import {
  hasOwnedConcernDocblock,
  readHttpEntrypointSource,
} from './httpArchitectureAst.support.js';

const START_RUN_COMPONENT_FILES = [
  'startRunIdentity.ts',
  'startRunRoute.ts',
  'startRunRouteParser.ts',
  'startRunRouteCommandBuilder.ts',
].map(readHttpEntrypointSource);

const START_RUN_COMMAND_BUILDER_SOURCE = readHttpEntrypointSource('startRunRouteCommandBuilder.ts');
const START_RUN_IDENTITY_SOURCE = readHttpEntrypointSource('startRunIdentity.ts');
const START_RUN_IDENTITY_COMPONENT_DOC = readFileSync(
  join(import.meta.dirname, '../../../docs/start-run-platform-identity-component.md'),
  'utf8'
);

const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/p.json',
  sha256: 'abc123',
  schemaVersion: '1.0.0',
  planId: 'p1',
  planVersion: '1.0',
};

const START_RUN_ADAPTER_REGISTRY = {
  isSupported(value: string): value is 'mock' | 'temporal' {
    return value === 'mock' || value === 'temporal';
  },
  listSupported(): ReadonlyArray<'mock' | 'temporal'> {
    return ['mock', 'temporal'];
  },
};

const VALID_START_RUN_BODY = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
  selection: {
    mode: 'explicit',
    nodeIds: ['model.orders'],
  },
  targetAdapter: 'mock',
  planRef: VALID_PLAN_REF,
};

describe('start-run identity architecture', () => {
  it('states the owned concern at the top of each start-run identity boundary module', () => {
    for (const source of START_RUN_COMPONENT_FILES) {
      expect(hasOwnedConcernDocblock(source)).toBe(true);
    }
  });

  it('rejects caller-authored run identity before generating an internal command id', () => {
    let generatorCalled = false;

    const parsed = parseStartRunBody(
      {
        ...VALID_START_RUN_BODY,
        runId: 'client-authored-run',
      },
      START_RUN_ADAPTER_REGISTRY,
      () => {
        generatorCalled = true;
        return 'run_should_not_be_used';
      }
    );

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'client_run_id_not_allowed',
        target: 'runId',
      },
    });
    expect(generatorCalled).toBe(false);
  });

  it('injects platform-owned run identity only after caller-owned request fields are valid', () => {
    const parsed = parseStartRunBody(
      VALID_START_RUN_BODY,
      START_RUN_ADAPTER_REGISTRY,
      () => 'run_architecture_generated'
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.command.runId).toBe('run_architecture_generated');
    expect(parsed.value.command).toEqual(
      expect.objectContaining({
        planRef: VALID_PLAN_REF,
        selection: { mode: 'explicit', nodeIds: ['model.orders'] },
        targetAdapter: 'mock',
      })
    );
  });

  it('keeps client-run-id rejection ahead of run-id generation in the command builder', () => {
    const source = START_RUN_COMMAND_BUILDER_SOURCE.sourceText;

    expect(source.indexOf('rejectClientProvidedStartRunRunId(record)')).toBeLessThan(
      source.indexOf('runIdGenerator()')
    );
  });

  it('keeps API identity allocation out of engine and persistence semantics', () => {
    expect(START_RUN_IDENTITY_SOURCE.sourceText).toContain("from 'node:crypto'");
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('@dvt/engine');
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('@dvt/adapter-postgres');
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('IWorkflowEngine');
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('StartRunAuthorizedFacade');
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('stateStore');
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('retry');
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('idempotency');
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('recoverRun');
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('cancelRun');
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('workflowId');
  });

  it('generates platform-owned UUIDv7 run ids for multi-instance collision resistance and time locality', () => {
    const before = Date.now();
    const runId = generatePlatformRunId();
    const after = Date.now();
    const uuid = runId.replace(/^run_/, '');
    const timestampMs = Number.parseInt(uuid.replaceAll('-', '').slice(0, 12), 16);

    expect(runId).toMatch(
      /^run_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(timestampMs).toBeGreaterThanOrEqual(before);
    expect(timestampMs).toBeLessThanOrEqual(after);
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('randomUUID');
  });

  it('publishes a local semantic component guide for the platform identity allocator', () => {
    expect(START_RUN_IDENTITY_COMPONENT_DOC).toContain('# Start-run platform identity component');
    expect(START_RUN_IDENTITY_COMPONENT_DOC).toContain('## Owned concern');
    expect(START_RUN_IDENTITY_COMPONENT_DOC).toContain('## Public API');
    expect(START_RUN_IDENTITY_COMPONENT_DOC).toContain('## Invariants');
    expect(START_RUN_IDENTITY_COMPONENT_DOC).toContain('## Transitions');
    expect(START_RUN_IDENTITY_COMPONENT_DOC).toContain('## Consumers');
    expect(START_RUN_IDENTITY_COMPONENT_DOC).toContain('generatePlatformRunId(): string');
    expect(START_RUN_IDENTITY_COMPONENT_DOC).toContain('run_<UUIDv7>');
    expect(START_RUN_IDENTITY_COMPONENT_DOC).toContain('opaque');
    expect(START_RUN_IDENTITY_COMPONENT_DOC).toContain('not a second engine');
    expect(START_RUN_IDENTITY_COMPONENT_DOC).toContain('persistence uniqueness');
  });
});
