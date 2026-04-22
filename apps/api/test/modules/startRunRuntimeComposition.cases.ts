import { describe, expect, it } from 'vitest';

import {
  apiDocExists,
  moduleComponentExists,
  readApiDoc,
  readModuleSource,
} from './modulesArchitectureAst.support.js';
import {
  buildDocumentedApiSnippets,
  collectMissingTextSnippets,
  hasMermaidDiagram,
  REQUIRED_COMPONENT_GUIDE_SECTIONS,
} from './modulesComponentDoc.support.js';

const BUILD_PROTECTED_RUNTIME_MODULE_SOURCE = readModuleSource('buildProtectedRuntimeModule.ts');
const START_RUN_RUNTIME_MODULE = 'startRun/buildProtectedStartRunRuntime.ts';
const START_RUN_RUNTIME_DOC = 'start-run-runtime-composition-component.md';
const START_RUN_RUNTIME_PUBLIC_API = {
  fileName: 'buildProtectedStartRunRuntime.ts',
  exportedIdentifiers: [
    'BuildProtectedStartRunRuntimeDeps',
    'ProtectedStartRunRuntime',
    'buildProtectedStartRunRuntime',
  ],
} as const;

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
      expect(
        collectMissingTextSnippets(docText, REQUIRED_COMPONENT_GUIDE_SECTIONS)
      ).toEqual([]);
      expect(hasMermaidDiagram(docText)).toBe(true);

      const startRunRuntimeSource = readModuleSource(START_RUN_RUNTIME_MODULE);
      const exportedIdentifiers = startRunRuntimeSource.collectExportedIdentifiers();
      for (const exportName of START_RUN_RUNTIME_PUBLIC_API.exportedIdentifiers) {
        expect(exportedIdentifiers).toContain(exportName);
      }
      expect(
        collectMissingTextSnippets(
          docText,
          buildDocumentedApiSnippets(
            START_RUN_RUNTIME_PUBLIC_API.fileName,
            START_RUN_RUNTIME_PUBLIC_API.exportedIdentifiers
          )
        )
      ).toEqual([]);
    });

    it('delegates start-run assembly from the protected runtime root into a dedicated builder', () => {
      expect(moduleComponentExists(START_RUN_RUNTIME_MODULE)).toBe(true);
      expect(
        BUILD_PROTECTED_RUNTIME_MODULE_SOURCE.hasNamedImport({
          moduleSpecifier: './startRun/buildProtectedStartRunRuntime.js',
          importedName: 'buildProtectedStartRunRuntime',
        })
      ).toBe(true);
      expect(
        BUILD_PROTECTED_RUNTIME_MODULE_SOURCE.hasCallToIdentifier('buildProtectedStartRunRuntime')
      ).toBe(true);

      for (const constructorName of [
        'StartRunAuthorizedFacade',
        'BackpressureAwareStartRunUseCase',
        'PlannerBackedStartRunUseCase',
        'EngineStartRunUseCase',
        'StoredPlanExecutabilityValidator',
      ]) {
        expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE.hasNewExpression(constructorName)).toBe(false);
      }
      expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE.sourceText).not.toContain(
        'const planCompilePlanner = buildPlanCompilePlanner();'
      );
    });

    it('keeps start-run orchestration constructors inside the dedicated builder module', () => {
      expect(moduleComponentExists(START_RUN_RUNTIME_MODULE)).toBe(true);

      const startRunRuntimeSource = readModuleSource(START_RUN_RUNTIME_MODULE);
      expect(startRunRuntimeSource.hasOwnedConcernDocblock()).toBe(true);
      expect(
        startRunRuntimeSource.hasNamedImport({
          moduleSpecifier: '../../application/services/startRunAuthorizedFacade.js',
          importedName: 'StartRunAuthorizedFacade',
        })
      ).toBe(true);
      expect(
        startRunRuntimeSource.hasNamedImport({
          moduleSpecifier: '../planCompileBoundary.js',
          importedName: 'buildPlanCompilePlanner',
        })
      ).toBe(true);

      for (const constructorName of [
        'StartRunAuthorizedFacade',
        'BackpressureAwareStartRunUseCase',
        'PlannerBackedStartRunUseCase',
        'EngineStartRunUseCase',
        'StoredPlanExecutabilityValidator',
      ]) {
        expect(startRunRuntimeSource.hasNewExpression(constructorName)).toBe(true);
      }
      expect(startRunRuntimeSource.hasCallToIdentifier('buildPlanCompilePlanner')).toBe(true);
    });
  });
}
