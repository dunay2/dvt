import { describe, expect, it } from 'vitest';

import {
  collectNamedImports,
  collectObjectLiteralPropertyNames,
  hasNamedImport,
  hasOwnedConcernDocblock,
  httpEntrypointExists,
  readHttpEntrypointSource,
} from './httpArchitectureAst.support.js';

const PLAN_ROUTE_RESPONSE_TRANSLATION_SOURCE = readHttpEntrypointSource(
  'planRouteResponseTranslation.ts'
);
const COMPILE_PLAN_RESPONSE_MAPPER_SOURCE = readHttpEntrypointSource(
  'compilePlanRouteResponseMapper.ts'
);
const IMPORT_PLAN_RESPONSE_MAPPER_SOURCE = readHttpEntrypointSource(
  'importPlanRouteResponseMapper.ts'
);
const PREVIEW_PLAN_RESPONSE_MAPPER_SOURCE = readHttpEntrypointSource(
  'previewPlanRouteResponseMapper.ts'
);
const PREVIEW_PLAN_CONTRACT_ERROR_MAPPER_SOURCE = readHttpEntrypointSource(
  'planPreviewContractErrorMapper.ts'
);

describe('Plan route response translation architecture', () => {
  it('states the owned concern at the top of each boundary module', () => {
    for (const source of [
      PLAN_ROUTE_RESPONSE_TRANSLATION_SOURCE,
      COMPILE_PLAN_RESPONSE_MAPPER_SOURCE,
      IMPORT_PLAN_RESPONSE_MAPPER_SOURCE,
      PREVIEW_PLAN_RESPONSE_MAPPER_SOURCE,
      PREVIEW_PLAN_CONTRACT_ERROR_MAPPER_SOURCE,
    ]) {
      expect(hasOwnedConcernDocblock(source)).toBe(true);
    }
  });

  it('exposes one public component API grouped by plan-route concern', () => {
    expect(httpEntrypointExists('planRouteResponseTranslation.ts')).toBe(true);
    expect(
      collectObjectLiteralPropertyNames(
        PLAN_ROUTE_RESPONSE_TRANSLATION_SOURCE,
        'planRouteResponseTranslation'
      )
    ).toEqual(['compile', 'import', 'preview']);
    expect(
      hasNamedImport(
        PLAN_ROUTE_RESPONSE_TRANSLATION_SOURCE,
        './compilePlanRouteResponseMapper.js',
        'mapCompilePlanUseCaseResult'
      )
    ).toBe(true);
    expect(
      hasNamedImport(
        PLAN_ROUTE_RESPONSE_TRANSLATION_SOURCE,
        './importPlanRouteResponseMapper.js',
        'mapImportPlanUseCaseResult'
      )
    ).toBe(true);
    expect(
      hasNamedImport(
        PLAN_ROUTE_RESPONSE_TRANSLATION_SOURCE,
        './previewPlanRouteResponseMapper.js',
        'mapPreviewPlanUseCaseResult'
      )
    ).toBe(true);
    expect(
      collectNamedImports(PLAN_ROUTE_RESPONSE_TRANSLATION_SOURCE, './httpErrorContract.js')
    ).toEqual([]);
  });

  it('forces plan-route consumers to depend on the public component API instead of internal mappers', () => {
    for (const consumerFile of [
      'compilePlanRoute.ts',
      'importPlanRoute.ts',
      'previewPlanRoute.ts',
      'previewPlanRouteRequestResolver.ts',
    ]) {
      const consumerSource = readHttpEntrypointSource(consumerFile);
      expect(
        hasNamedImport(
          consumerSource,
          './planRouteResponseTranslation.js',
          'planRouteResponseTranslation'
        )
      ).toBe(true);
      expect(collectNamedImports(consumerSource, './compilePlanRouteResponseMapper.js')).toEqual([]);
      expect(collectNamedImports(consumerSource, './importPlanRouteResponseMapper.js')).toEqual([]);
      expect(collectNamedImports(consumerSource, './previewPlanRouteResponseMapper.js')).toEqual([]);
      expect(collectNamedImports(consumerSource, './planPreviewContractErrorMapper.js')).toEqual([]);
      expect(hasNamedImport(consumerSource, './httpErrorContract.js', 'createHttpErrorResponse')).toBe(
        false
      );
    }
  });

  it('keeps primitive envelope creation inside internal mapper modules', () => {
    for (const source of [
      COMPILE_PLAN_RESPONSE_MAPPER_SOURCE,
      IMPORT_PLAN_RESPONSE_MAPPER_SOURCE,
      PREVIEW_PLAN_RESPONSE_MAPPER_SOURCE,
      PREVIEW_PLAN_CONTRACT_ERROR_MAPPER_SOURCE,
    ]) {
      expect(hasNamedImport(source, './httpErrorContract.js', 'createHttpErrorResponse')).toBe(
        true
      );
    }

    expect(
      hasNamedImport(
        PLAN_ROUTE_RESPONSE_TRANSLATION_SOURCE,
        './httpErrorContract.js',
        'createHttpErrorResponse'
      )
    ).toBe(false);
  });
});
