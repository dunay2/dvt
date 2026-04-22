import { describe, expect, it } from 'vitest';

import {
  apiDocExists,
  hasCallToIdentifier,
  hasNamedImport,
  hasNewExpression,
  hasOwnedConcernDocblock,
  moduleComponentExists,
  readApiDoc,
  readModuleSource,
} from './modulesArchitectureAst.support.js';

const BUILD_PROTECTED_RUNTIME_MODULE_SOURCE = readModuleSource('buildProtectedRuntimeModule.ts');
const START_RUN_RUNTIME_MODULE = 'startRun/buildProtectedStartRunRuntime.ts';
const START_RUN_RUNTIME_DOC = 'start-run-runtime-composition-component.md';

/**
 * Architecture cases for the dedicated start-run runtime composition seam.
 * These checks enforce semantic ownership: the protected root may compose the
 * subcomponent, but it must not also be the place where start-run orchestration
 * objects are constructed.
 */
export function describeStartRunRuntimeCompositionCases(): void {
  describe('start-run runtime composition architecture', () => {
    it('ships a local component guide with API, invariants, transitions, and consumers', () => {
      expect(apiDocExists(START_RUN_RUNTIME_DOC)).toBe(true);

      const docText = readApiDoc(START_RUN_RUNTIME_DOC);
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

    it('delegates start-run assembly from the protected runtime root into a dedicated builder', () => {
      expect(moduleComponentExists(START_RUN_RUNTIME_MODULE)).toBe(true);
      expect(
        hasNamedImport(
          BUILD_PROTECTED_RUNTIME_MODULE_SOURCE,
          './startRun/buildProtectedStartRunRuntime.js',
          'buildProtectedStartRunRuntime'
        )
      ).toBe(true);
      expect(hasCallToIdentifier(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE, 'buildProtectedStartRunRuntime')).toBe(
        true
      );

      for (const constructorName of [
        'StartRunAuthorizedFacade',
        'BackpressureAwareStartRunUseCase',
        'PlannerBackedStartRunUseCase',
        'EngineStartRunUseCase',
        'StoredPlanExecutabilityValidator',
      ]) {
        expect(hasNewExpression(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE, constructorName)).toBe(false);
      }
      expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE.sourceText).not.toContain(
        'const planCompilePlanner = buildPlanCompilePlanner();'
      );
    });

    it('keeps start-run orchestration constructors inside the dedicated builder module', () => {
      expect(moduleComponentExists(START_RUN_RUNTIME_MODULE)).toBe(true);

      const startRunRuntimeSource = readModuleSource(START_RUN_RUNTIME_MODULE);
      expect(hasOwnedConcernDocblock(startRunRuntimeSource)).toBe(true);
      expect(
        hasNamedImport(
          startRunRuntimeSource,
          '../../application/services/startRunAuthorizedFacade.js',
          'StartRunAuthorizedFacade'
        )
      ).toBe(true);
      expect(
        hasNamedImport(
          startRunRuntimeSource,
          '../planCompileBoundary.js',
          'buildPlanCompilePlanner'
        )
      ).toBe(true);

      for (const constructorName of [
        'StartRunAuthorizedFacade',
        'BackpressureAwareStartRunUseCase',
        'PlannerBackedStartRunUseCase',
        'EngineStartRunUseCase',
        'StoredPlanExecutabilityValidator',
      ]) {
        expect(hasNewExpression(startRunRuntimeSource, constructorName)).toBe(true);
      }
      expect(hasCallToIdentifier(startRunRuntimeSource, 'buildPlanCompilePlanner')).toBe(true);
    });
  });
}
