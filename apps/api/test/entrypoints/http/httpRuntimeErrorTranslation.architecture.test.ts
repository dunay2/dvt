import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const COMPONENT_ROOT = join(import.meta.dirname, '../../../src/entrypoints/http');

function readComponentSource(fileName: string): string {
  return readFileSync(join(COMPONENT_ROOT, fileName), 'utf8');
}

const HTTP_ERROR_CONTRACT_SOURCE = readComponentSource('httpErrorContract.ts');
const HTTP_ERROR_TRANSLATION_SOURCE = readComponentSource('httpErrorTranslation.ts');
const HTTP_ERROR_REASON_CATALOG_SOURCE = readComponentSource('httpErrorReasonCatalog.ts');
const ROUTE_PARSE_ISSUE_SOURCE = readComponentSource('routeParseIssue.ts');
const HTTP_ERROR_MAPPER_SOURCE = readComponentSource('httpErrorMapper.ts');
const HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE = readComponentSource('httpDomainErrorClassifier.ts');

describe('HTTP runtime error translation architecture', () => {
  it('keeps a dedicated shared helper for optional error details', () => {
    expect(existsSync(join(COMPONENT_ROOT, 'httpErrorDetails.ts'))).toBe(true);
    expect(HTTP_ERROR_MAPPER_SOURCE).toContain("from './httpErrorDetails.js'");
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE).toContain("from './httpErrorDetails.js'");
    expect(HTTP_ERROR_MAPPER_SOURCE).not.toContain('function compactDetails(');
    expect(HTTP_ERROR_MAPPER_SOURCE).not.toContain('function withDetails(');
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE).not.toContain('function compactDetails(');
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE).not.toContain('function withDetails(');
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
      expect(source.startsWith('/**\n * Owned concern:')).toBe(true);
    }
  });

  it('keeps runtime-domain classification in the dedicated classifier instead of the mapper', () => {
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE).toContain("from '@dvt/engine'");
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE).toContain('export function mapRuntimeDomainError');
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE).not.toContain('RouteParseIssue');

    expect(HTTP_ERROR_MAPPER_SOURCE).toContain('export function mapRouteParseIssue');
    expect(HTTP_ERROR_MAPPER_SOURCE).toContain('export function mapStartRunFacadeResult');
    expect(HTTP_ERROR_MAPPER_SOURCE).toContain('export function mapStartRunEngineError');
    expect(HTTP_ERROR_MAPPER_SOURCE).toContain('export function mapAuthenticationFailure');
    expect(HTTP_ERROR_MAPPER_SOURCE).toContain('export function mapAuthorizationFailure');
    expect(HTTP_ERROR_MAPPER_SOURCE).not.toContain("from '@dvt/engine'");
    expect(HTTP_ERROR_MAPPER_SOURCE).not.toContain('mapRuntimeDomainError');
    expect(HTTP_ERROR_MAPPER_SOURCE).not.toContain('export { HTTP_HEADER');
    expect(HTTP_ERROR_MAPPER_SOURCE).not.toContain('type HttpResponseModel } from');
  });

  it('exposes one public component API grouped by concern', () => {
    expect(existsSync(join(COMPONENT_ROOT, 'httpErrorTranslation.ts'))).toBe(true);
    expect(HTTP_ERROR_TRANSLATION_SOURCE).toContain('export const httpErrorTranslation = {');
    expect(HTTP_ERROR_TRANSLATION_SOURCE).toContain('parse: {');
    expect(HTTP_ERROR_TRANSLATION_SOURCE).toContain('auth: {');
    expect(HTTP_ERROR_TRANSLATION_SOURCE).toContain('startRun: {');
    expect(HTTP_ERROR_TRANSLATION_SOURCE).toContain('runtime: {');
    expect(HTTP_ERROR_TRANSLATION_SOURCE).toContain("from './httpErrorMapper.js'");
    expect(HTTP_ERROR_TRANSLATION_SOURCE).toContain("from './httpDomainErrorClassifier.js'");
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
    ]) {
      const consumerSource = readComponentSource(consumerFile);
      expect(consumerSource).toContain("from './httpErrorTranslation.js'");
      expect(consumerSource).not.toContain("from './httpDomainErrorClassifier.js'");
      expect(consumerSource).not.toContain("from './httpErrorMapper.js'");
    }
  });

  it('uses the owned serializer for translated HttpResponseModel values', () => {
    const listRunsRouteSource = readComponentSource('listRunsRoute.ts');
    expect(listRunsRouteSource).toContain('sendHttpResponse(reply, auth.response)');
    expect(listRunsRouteSource).toContain('sendHttpResponse(reply, mapped)');
    expect(listRunsRouteSource).not.toContain('reply.code(auth.response.status).send(auth.response.body)');
    expect(listRunsRouteSource).not.toContain('reply.code(mapped.status).send(mapped.body)');

    const startRunRouteSource = readComponentSource('startRunRoute.ts');
    expect(startRunRouteSource).toContain('sendHttpResponse(reply, mapped)');
    expect(startRunRouteSource).not.toContain('reply.code(mapped.status).send(mapped.body)');
    expect(startRunRouteSource).not.toContain('reply.header(name, value)');
  });
});
