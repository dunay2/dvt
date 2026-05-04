import { describe, expect, it } from 'vitest';

import {
  collectExportedFunctionNames,
  collectNamedImports,
  collectObjectLiteralPropertyNames,
  collectReExportedModuleSpecifiers,
  hasCallToIdentifier,
  hasCallToProperty,
  hasNamedImport,
  hasOwnedConcernDocblock,
  httpEntrypointExists,
  readHttpEntrypointSource,
} from './httpArchitectureAst.support.js';

const HTTP_ERROR_CONTRACT_SOURCE = readHttpEntrypointSource('httpErrorContract.ts');
const HTTP_ERROR_TRANSLATION_SOURCE = readHttpEntrypointSource('httpErrorTranslation.ts');
const HTTP_ERROR_REASON_CATALOG_SOURCE = readHttpEntrypointSource('httpErrorReasonCatalog.ts');
const ROUTE_PARSE_ISSUE_SOURCE = readHttpEntrypointSource('routeParseIssue.ts');
const HTTP_ERROR_MAPPER_SOURCE = readHttpEntrypointSource('httpErrorMapper.ts');
const HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE = readHttpEntrypointSource(
  'httpDomainErrorClassifier.ts'
);

describe('HTTP runtime error translation architecture', () => {
  it('keeps a dedicated shared helper for optional error details', () => {
    expect(httpEntrypointExists('httpErrorDetails.ts')).toBe(true);
    expect(
      hasNamedImport(HTTP_ERROR_MAPPER_SOURCE, './httpErrorDetails.js', 'compactHttpErrorDetails')
    ).toBe(true);
    expect(
      hasNamedImport(
        HTTP_ERROR_MAPPER_SOURCE,
        './httpErrorDetails.js',
        'withOptionalHttpErrorDetails'
      )
    ).toBe(true);
    expect(
      hasNamedImport(
        HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE,
        './httpErrorDetails.js',
        'compactHttpErrorDetails'
      )
    ).toBe(true);
    expect(
      hasNamedImport(
        HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE,
        './httpErrorDetails.js',
        'withOptionalHttpErrorDetails'
      )
    ).toBe(true);
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('function compactDetails(');
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('function withDetails(');
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE.sourceText).not.toContain(
      'function compactDetails('
    );
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE.sourceText).not.toContain('function withDetails(');
  });

  it('states the owned concern at the top of each boundary module', () => {
    for (const source of [
      HTTP_ERROR_CONTRACT_SOURCE,
      HTTP_ERROR_TRANSLATION_SOURCE,
      HTTP_ERROR_REASON_CATALOG_SOURCE,
      ROUTE_PARSE_ISSUE_SOURCE,
      HTTP_ERROR_MAPPER_SOURCE,
      HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE,
    ]) {
      expect(hasOwnedConcernDocblock(source)).toBe(true);
    }
  });

  it('keeps runtime-domain classification in the dedicated classifier instead of the mapper', () => {
    expect(
      hasNamedImport(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE, '@dvt/engine', 'RunNotFoundError')
    ).toBe(true);
    expect(collectExportedFunctionNames(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE)).toContain(
      'mapRuntimeDomainError'
    );
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE.sourceText).not.toContain('RouteParseIssue');

    expect(collectExportedFunctionNames(HTTP_ERROR_MAPPER_SOURCE)).toEqual([
      'mapRouteParseIssue',
      'mapStartRunFacadeResult',
      'mapStartRunEngineError',
      'mapAuthenticationFailure',
      'mapAuthorizationFailure',
    ]);
    expect(collectNamedImports(HTTP_ERROR_MAPPER_SOURCE, '@dvt/engine')).toEqual([]);
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('mapRuntimeDomainError');
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('export { HTTP_HEADER');
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('type HttpResponseModel } from');
  });

  it('keeps httpErrorMapper free of compatibility-style re-export shims', () => {
    expect(collectReExportedModuleSpecifiers(HTTP_ERROR_MAPPER_SOURCE)).toEqual([]);
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('export * from');
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('compat');
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('legacy');
  });

  it('exposes one public component API grouped by concern', () => {
    expect(httpEntrypointExists('httpErrorTranslation.ts')).toBe(true);
    expect(
      collectObjectLiteralPropertyNames(HTTP_ERROR_TRANSLATION_SOURCE, 'httpErrorTranslation')
    ).toEqual([
      'respond',
      'admin',
      'parse',
      'auth',
      'startRun',
      'workspaceGraphDraft',
      'workspaceFiles',
      'runtime',
    ]);
    expect(
      hasNamedImport(HTTP_ERROR_TRANSLATION_SOURCE, './httpErrorContract.js', 'sendHttpResponse')
    ).toBe(true);
    expect(
      hasNamedImport(HTTP_ERROR_TRANSLATION_SOURCE, './httpErrorMapper.js', 'mapRouteParseIssue')
    ).toBe(true);
    expect(
      hasNamedImport(
        HTTP_ERROR_TRANSLATION_SOURCE,
        './httpDomainErrorClassifier.js',
        'mapRuntimeDomainError'
      )
    ).toBe(true);
    expect(hasCallToProperty(HTTP_ERROR_TRANSLATION_SOURCE, 'httpErrorTranslation.respond')).toBe(
      false
    );
    expect(hasCallToIdentifier(HTTP_ERROR_TRANSLATION_SOURCE, 'sendHttpResponse')).toBe(true);
  });

  it('forces production consumers to depend on the public component API instead of internals', () => {
    for (const consumerFile of [
      'adminRoutes.ts',
      'authorizeAdminExecutionScope.ts',
      'authorizeExecutionScope.ts',
      'getRunRoute.ts',
      'getRunEventsRoute.ts',
      'listRunsRoute.ts',
      'planRouteRequestResolver.ts',
      'runCommandRouteExecutor.ts',
      'startRunRoute.ts',
      'workspaceGraphDraftRoutes.ts',
      'executePlanRouteFacade.ts',
    ]) {
      const consumerSource = readHttpEntrypointSource(consumerFile);
      expect(
        hasNamedImport(consumerSource, './httpErrorTranslation.js', 'httpErrorTranslation')
      ).toBe(true);
      expect(collectNamedImports(consumerSource, './httpDomainErrorClassifier.js')).toEqual([]);
      expect(collectNamedImports(consumerSource, './httpErrorMapper.js')).toEqual([]);
      expect(hasNamedImport(consumerSource, './httpErrorContract.js', 'sendHttpResponse')).toBe(
        false
      );
    }
  });

  it('keeps route-local static envelopes behind the component facade', () => {
    for (const consumerFile of ['adminRoutes.ts', 'workspaceGraphDraftRoutes.ts']) {
      const consumerSource = readHttpEntrypointSource(consumerFile);
      expect(
        hasNamedImport(consumerSource, './httpErrorContract.js', 'createHttpErrorResponse')
      ).toBe(false);
    }

    expect(
      collectObjectLiteralPropertyNames(HTTP_ERROR_TRANSLATION_SOURCE, 'httpErrorTranslation')
    ).toContain('admin');
    expect(
      collectObjectLiteralPropertyNames(HTTP_ERROR_TRANSLATION_SOURCE, 'httpErrorTranslation')
    ).toContain('workspaceGraphDraft');
  });

  it('uses the owned serializer for translated HttpResponseModel values', () => {
    for (const consumerFile of [
      'adminRoutes.ts',
      'getRunRoute.ts',
      'getRunEventsRoute.ts',
      'listRunsRoute.ts',
      'runCommandRouteExecutor.ts',
      'startRunRoute.ts',
      'workspaceGraphDraftRoutes.ts',
      'executePlanRouteFacade.ts',
    ]) {
      const consumerSource = readHttpEntrypointSource(consumerFile);
      expect(hasCallToProperty(consumerSource, 'httpErrorTranslation.respond')).toBe(true);
      expect(hasCallToIdentifier(consumerSource, 'sendHttpResponse')).toBe(false);
    }
  });
});
