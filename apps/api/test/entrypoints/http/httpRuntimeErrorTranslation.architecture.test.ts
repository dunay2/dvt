import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const COMPONENT_ROOT = join(import.meta.dirname, '../../../src/entrypoints/http');

function readComponentSource(fileName: string): string {
  return readFileSync(join(COMPONENT_ROOT, fileName), 'utf8');
}

const HTTP_ERROR_CONTRACT_SOURCE = readComponentSource('httpErrorContract.ts');
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

  it('forces runtime route consumers to import the classifier directly', () => {
    for (const consumerFile of [
      'adminRoutes.ts',
      'getRunRoute.ts',
      'getRunEventsRoute.ts',
      'listRunsRoute.ts',
      'runCommandRouteExecutor.ts',
    ]) {
      const consumerSource = readComponentSource(consumerFile);
      expect(consumerSource).toContain("from './httpDomainErrorClassifier.js'");
      expect(consumerSource).not.toContain(
        "mapRuntimeDomainError } from './httpErrorMapper.js'"
      );
      expect(consumerSource).not.toContain('RUN_NOT_FOUND:');
    }
  });
});
