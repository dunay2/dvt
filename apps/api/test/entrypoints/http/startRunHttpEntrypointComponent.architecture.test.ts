import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  collectNamedImports,
  hasCallToIdentifier,
  hasCallToProperty,
  hasNamedImport,
  hasOwnedConcernDocblock,
  httpEntrypointExists,
  readHttpEntrypointSource,
} from './httpArchitectureAst.support.js';

const DOC_PATH = join(import.meta.dirname, '../../../docs/start-run-http-entrypoint-component.md');
const START_RUN_ROUTE_SOURCE = readHttpEntrypointSource('startRunRoute.ts');
const START_RUN_ROUTE_PARSER_SOURCE = readHttpEntrypointSource('startRunRouteParser.ts');
const START_RUN_ROUTE_COMMAND_BUILDER_SOURCE = readHttpEntrypointSource(
  'startRunRouteCommandBuilder.ts'
);
const START_RUN_ROUTE_TARGET_ADAPTER_PARSER_SOURCE = readHttpEntrypointSource(
  'startRunRouteTargetAdapterParser.ts'
);

describe('Start-run HTTP entrypoint component architecture', () => {
  it('ships a local component guide with API, invariants, transitions, and consumers', () => {
    expect(existsSync(DOC_PATH)).toBe(true);

    const docText = readFileSync(DOC_PATH, 'utf8');
    for (const section of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
    ]) {
      expect(docText).toContain(section);
    }
    expect(docText).toContain('```mermaid');
  });

  it('states owned concern docblocks on the start-run route boundary modules', () => {
    for (const source of [
      START_RUN_ROUTE_SOURCE,
      START_RUN_ROUTE_PARSER_SOURCE,
      START_RUN_ROUTE_COMMAND_BUILDER_SOURCE,
      START_RUN_ROUTE_TARGET_ADAPTER_PARSER_SOURCE,
    ]) {
      expect(hasOwnedConcernDocblock(source)).toBe(true);
    }
  });

  it('keeps the route seam focused on parser, facade, and public response translation', () => {
    expect(httpEntrypointExists('startRunRoute.ts')).toBe(true);
    expect(hasNamedImport(START_RUN_ROUTE_SOURCE, './startRunRouteParser.js', 'parseStartRunBody')).toBe(
      true
    );
    expect(hasNamedImport(START_RUN_ROUTE_SOURCE, './httpErrorTranslation.js', 'httpErrorTranslation')).toBe(
      true
    );
    expect(hasNamedImport(START_RUN_ROUTE_SOURCE, './httpErrorContract.js', 'sendHttpResponse')).toBe(false);
    expect(collectNamedImports(START_RUN_ROUTE_SOURCE, './startRunRouteCommandBuilder.js')).toEqual([]);
    expect(collectNamedImports(START_RUN_ROUTE_SOURCE, './planRouteBodyParser.js')).toEqual([]);
    expect(hasCallToProperty(START_RUN_ROUTE_SOURCE, 'httpErrorTranslation.respond')).toBe(true);
    expect(hasCallToIdentifier(START_RUN_ROUTE_SOURCE, 'sendHttpResponse')).toBe(false);
  });

  it('keeps default adapter-registry binding at the outer route seam only', () => {
    expect(
      hasNamedImport(
        START_RUN_ROUTE_SOURCE,
        '../../application/services/startRunTargetAdapterRegistry.js',
        'DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY'
      )
    ).toBe(true);
    for (const source of [
      START_RUN_ROUTE_PARSER_SOURCE,
      START_RUN_ROUTE_COMMAND_BUILDER_SOURCE,
      START_RUN_ROUTE_TARGET_ADAPTER_PARSER_SOURCE,
    ]) {
      expect(
        hasNamedImport(
          source,
          '../../application/services/startRunTargetAdapterRegistry.js',
          'DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY'
        )
      ).toBe(false);
    }
  });

  it('keeps parser and builder seams free of response-writing concerns', () => {
    expect(hasNamedImport(START_RUN_ROUTE_PARSER_SOURCE, './startRunRouteCommandBuilder.js', 'parseStartRunCommand')).toBe(
      true
    );
    expect(hasNamedImport(START_RUN_ROUTE_PARSER_SOURCE, './httpErrorTranslation.js', 'httpErrorTranslation')).toBe(
      false
    );
    expect(hasNamedImport(START_RUN_ROUTE_COMMAND_BUILDER_SOURCE, './planRoutePlanSourcePolicy.js', 'evaluatePlanRoutePlanSource')).toBe(
      true
    );
    expect(hasNamedImport(START_RUN_ROUTE_COMMAND_BUILDER_SOURCE, './httpErrorTranslation.js', 'httpErrorTranslation')).toBe(
      false
    );
    expect(hasNamedImport(START_RUN_ROUTE_COMMAND_BUILDER_SOURCE, './httpErrorContract.js', 'sendHttpResponse')).toBe(
      false
    );
  });

  it('binds the generic target-adapter parser through the start-run registry port', () => {
    expect(
      hasNamedImport(
        START_RUN_ROUTE_TARGET_ADAPTER_PARSER_SOURCE,
        './planRouteTargetAdapterParser.js',
        'parseRouteTargetAdapter'
      )
    ).toBe(true);
    expect(
      hasNamedImport(
        START_RUN_ROUTE_TARGET_ADAPTER_PARSER_SOURCE,
        '../../application/ports/IStartRunTargetAdapterRegistry.js',
        'IStartRunTargetAdapterRegistry'
      )
    ).toBe(true);
  });
});
