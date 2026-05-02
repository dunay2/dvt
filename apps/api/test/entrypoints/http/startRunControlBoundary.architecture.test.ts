/**
 * Owned concern: verify the grouped API start-run control boundary keeps
 * caller intent, platform identity, and admission ownership in the correct
 * layers.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { START_RUN_EXECUTION_CAPACITY_ADMISSION_COMPONENT } from '../../application/services/applicationArchitectureAst.support.js';

import {
  hasNamedImport,
  hasOwnedConcernDocblock,
  readHttpEntrypointSource,
} from './httpArchitectureAst.support.js';

const APP_SOURCE_PATH = join(
  import.meta.dirname,
  '../../../src/entrypoints/http/registerProtectedRuntimeRoutes.ts'
);
const APP_SOURCE_TEXT = readFileSync(APP_SOURCE_PATH, 'utf8');
const CONTROL_BOUNDARY_DOC_PATH = join(
  import.meta.dirname,
  '../../../docs/start-run-control-boundary-component.md'
);
const START_RUN_ROUTE_SOURCE = readHttpEntrypointSource('startRunRoute.ts');
const START_RUN_PARSER_SOURCE = readHttpEntrypointSource('startRunRouteParser.ts');
const START_RUN_COMMAND_BUILDER_SOURCE = readHttpEntrypointSource('startRunRouteCommandBuilder.ts');
const START_RUN_IDENTITY_SOURCE = readHttpEntrypointSource('startRunIdentity.ts');

describe('start-run control boundary architecture', () => {
  it('ships a local grouped guide for the API start-run control boundary', () => {
    expect(existsSync(CONTROL_BOUNDARY_DOC_PATH)).toBe(true);

    const docText = readFileSync(CONTROL_BOUNDARY_DOC_PATH, 'utf8');
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
    expect(docText).toContain('platform-owned `run_<UUIDv7>`');
    expect(docText).toContain('execution-capacity admission');
  });

  it('keeps the grouped boundary on owned-concern modules instead of leaking responsibilities across layers', () => {
    expect(hasOwnedConcernDocblock(START_RUN_ROUTE_SOURCE)).toBe(true);
    expect(hasOwnedConcernDocblock(START_RUN_PARSER_SOURCE)).toBe(true);
    expect(hasOwnedConcernDocblock(START_RUN_COMMAND_BUILDER_SOURCE)).toBe(true);
    expect(hasOwnedConcernDocblock(START_RUN_IDENTITY_SOURCE)).toBe(true);
  });

  it('keeps platform identity in the HTTP boundary and execution-capacity admission in the application/runtime boundary', () => {
    expect(
      hasNamedImport(START_RUN_ROUTE_SOURCE, './startRunIdentity.js', 'generatePlatformRunId')
    ).toBe(true);
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('executionCapacity');
    expect(START_RUN_IDENTITY_SOURCE.sourceText).not.toContain('system_backpressure');

    const backpressureSource =
      START_RUN_EXECUTION_CAPACITY_ADMISSION_COMPONENT.artifacts.backpressureUseCase.readSource();
    const runtimeBuilderSource =
      START_RUN_EXECUTION_CAPACITY_ADMISSION_COMPONENT.artifacts.runtimeBuilder.readSource();

    expect(backpressureSource.sourceText).not.toContain('generatePlatformRunId');
    expect(runtimeBuilderSource.sourceText).toContain(
      'deps.executionCapacity ?? DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT'
    );
  });

  it('wires the control boundary from route registration through the authenticated facade without bypassing the dedicated seams', () => {
    expect(APP_SOURCE_TEXT).toContain(
      'startRunRoute(request as never, reply, protectedModule.facade, {'
    );
    expect(APP_SOURCE_TEXT).toContain(
      'adapterRegistry: protectedModule.startRunTargetAdapterRegistry'
    );
    expect(START_RUN_ROUTE_SOURCE.sourceText).toContain('parseStartRunBody(');
    expect(START_RUN_ROUTE_SOURCE.sourceText).toContain('httpErrorTranslation.respond');
    expect(START_RUN_ROUTE_SOURCE.sourceText).toContain('facade.execute(');
  });

  it('documents and preserves the semantic ordering from caller intent to runtime delegate dispatch', () => {
    const docText = readFileSync(CONTROL_BOUNDARY_DOC_PATH, 'utf8');

    expect(docText).toContain('reject caller-authored `runId` before allocation');
    expect(docText).toContain(
      'duplicate probe -> delivery admission -> execution-capacity admission ->'
    );
    expect(docText).toContain('delegate dispatch');

    expect(
      START_RUN_COMMAND_BUILDER_SOURCE.sourceText.indexOf(
        'rejectClientProvidedStartRunRunId(record)'
      )
    ).toBeLessThan(START_RUN_COMMAND_BUILDER_SOURCE.sourceText.indexOf('runIdGenerator()'));
  });
});
