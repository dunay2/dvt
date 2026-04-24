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
const PROTECTED_RUNTIME_BUILDERS_DOC =
  'protected-runtime-dependency-builders-component.md';

const PROTECTED_RUNTIME_BUILDER_CASES = [
  {
    moduleFile: 'protectedRuntime/buildProtectedRuntimeStorage.ts',
    documentedFile: 'buildProtectedRuntimeStorage.ts',
    importName: 'buildProtectedRuntimeStorage',
    importPath: './protectedRuntime/buildProtectedRuntimeStorage.js',
    exportedIdentifiers: [
      'BuildProtectedRuntimeStorageDeps',
      'ProtectedRuntimeStorage',
      'buildProtectedRuntimeStorage',
    ],
    rootForbiddenConstructors: [
      'PostgresStateStoreAdapter',
      'PostgresStartRunIntentStore',
      'PostgresPlanStore',
      'SnapshotProjector',
      'StoredExecutablePlanResolver',
    ],
    ownedSnippets: [
      'new deps.PostgresStateStoreAdapter({',
      'new deps.PostgresStartRunIntentStore({',
      'new deps.PostgresPlanStore({',
      'new deps.SnapshotProjector();',
      'new StoredExecutablePlanResolver({',
    ],
  },
  {
    moduleFile: 'protectedRuntime/buildProtectedAdmissionRuntime.ts',
    documentedFile: 'buildProtectedAdmissionRuntime.ts',
    importName: 'buildProtectedAdmissionRuntime',
    importPath: './protectedRuntime/buildProtectedAdmissionRuntime.js',
    exportedIdentifiers: [
      'BuildProtectedAdmissionRuntimeDeps',
      'buildProtectedAdmissionRuntime',
    ],
    rootForbiddenConstructors: [
      'PostgresDuplicateRunProbe',
      'RawSqlBackpressureStore',
      'CircuitBreakingBackpressureStore',
      'CachedBackpressureStore',
      'MetricsEmittingBackpressureStore',
      'StartRunAdmissionGuard',
    ],
    ownedSnippets: [
      'new PostgresDuplicateRunProbe({',
      'new RawSqlBackpressureStore(backpressureReader)',
      'new CircuitBreakingBackpressureStore({',
      'new CachedBackpressureStore({',
      'new MetricsEmittingBackpressureStore({',
      'new StartRunAdmissionGuard({',
    ],
  },
  {
    moduleFile: 'protectedRuntime/buildProtectedSecurityRuntime.ts',
    documentedFile: 'buildProtectedSecurityRuntime.ts',
    importName: 'buildProtectedSecurityRuntime',
    importPath: './protectedRuntime/buildProtectedSecurityRuntime.js',
    exportedIdentifiers: [
      'BuildProtectedSecurityRuntimeDeps',
      'buildProtectedSecurityRuntime',
    ],
    rootForbiddenConstructors: [
      'EmbeddedAccessDecisionService',
      'StructuredAuditLogger',
      'AuthorizeCommandScopeService',
      'OidcAuthenticator',
      'JwksJwtVerifier',
    ],
    ownedSnippets: [
      'new EmbeddedAccessDecisionService(',
      'new StructuredAuditLogger(',
      'new AuthorizeCommandScopeService(',
      'new OidcAuthenticator(',
      'new JwksJwtVerifier({',
    ],
  },
  {
    moduleFile: 'protectedRuntime/buildProtectedExecutionCapacityPort.ts',
    documentedFile: 'buildProtectedExecutionCapacityPort.ts',
    importName: 'buildProtectedExecutionCapacityPort',
    importPath: './protectedRuntime/buildProtectedExecutionCapacityPort.js',
    exportedIdentifiers: [
      'BuildProtectedExecutionCapacityPortDeps',
      'buildProtectedExecutionCapacityPort',
    ],
    rootForbiddenConstructors: ['TemporalWorkerReadyzExecutionCapacityPort'],
    ownedSnippets: [
      'new TemporalWorkerReadyzExecutionCapacityPort({',
      'return DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT;',
    ],
  },
  {
    moduleFile: 'protectedRuntime/buildProtectedExecutionRuntime.ts',
    documentedFile: 'buildProtectedExecutionRuntime.ts',
    importName: 'buildProtectedExecutionRuntime',
    importPath: './protectedRuntime/buildProtectedExecutionRuntime.js',
    exportedIdentifiers: [
      'BuildProtectedExecutionRuntimeDeps',
      'buildProtectedExecutionRuntime',
    ],
    rootForbiddenConstructors: ['AllowAllAuthorizer'],
    ownedSnippets: [
      'const { adapters, close: closeAdapters } = await buildProviderAdapters(',
      'createStartRunTargetAdapterRegistryFromValues(',
      'new AllowAllAuthorizer()',
      'buildWorkflowEngine({',
    ],
  },
] as const;

/**
 * Architecture cases for the protected-runtime dependency builders.
 * These checks keep the root assembler thin and force the heavy constructor
 * clusters into dedicated runtime-builder modules.
 */
export function describeProtectedRuntimeDependencyBuildersCases(): void {
  describe('protected runtime dependency builders architecture', () => {
    it('ships a local component guide with API, invariants, transitions, and consumers', () => {
      expect(apiDocExists(PROTECTED_RUNTIME_BUILDERS_DOC)).toBe(true);

      const docText = readApiDoc(PROTECTED_RUNTIME_BUILDERS_DOC);
      expect(
        collectMissingTextSnippets(docText, REQUIRED_COMPONENT_GUIDE_SECTIONS)
      ).toEqual([]);
      expect(hasMermaidDiagram(docText)).toBe(true);

      for (const runtimeBuilder of PROTECTED_RUNTIME_BUILDER_CASES) {
        const runtimeBuilderSource = readModuleSource(runtimeBuilder.moduleFile);
        const exportedIdentifiers = runtimeBuilderSource.collectExportedIdentifiers();
        for (const exportName of runtimeBuilder.exportedIdentifiers) {
          expect(exportedIdentifiers).toContain(exportName);
        }
        expect(
          collectMissingTextSnippets(
            docText,
            buildDocumentedApiSnippets(
              runtimeBuilder.documentedFile,
              runtimeBuilder.exportedIdentifiers
            )
          )
        ).toEqual([]);
      }

      expect(docText).toContain('`shared.ts`');
      expect(docText).toContain('`RuntimePool`');
    });

    it('delegates protected-runtime dependency clusters out of the root assembler', () => {
      for (const runtimeBuilder of PROTECTED_RUNTIME_BUILDER_CASES) {
        expect(moduleComponentExists(runtimeBuilder.moduleFile)).toBe(true);
        expect(
          BUILD_PROTECTED_RUNTIME_MODULE_SOURCE.hasNamedImport({
            moduleSpecifier: runtimeBuilder.importPath,
            importedName: runtimeBuilder.importName,
          })
        ).toBe(true);
        expect(
          BUILD_PROTECTED_RUNTIME_MODULE_SOURCE.hasCallToIdentifier(runtimeBuilder.importName)
        ).toBe(true);

        for (const constructorName of runtimeBuilder.rootForbiddenConstructors) {
          expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE.hasNewExpression(constructorName)).toBe(false);
        }
      }
    });

    it('keeps builder-owned constructor clusters inside the dedicated runtime-builder modules', () => {
      for (const runtimeBuilder of PROTECTED_RUNTIME_BUILDER_CASES) {
        const runtimeBuilderSource = readModuleSource(runtimeBuilder.moduleFile);
        expect(runtimeBuilderSource.hasOwnedConcernDocblock()).toBe(true);

        for (const snippet of runtimeBuilder.ownedSnippets) {
          expect(runtimeBuilderSource.sourceText).toContain(snippet);
        }
      }
    });
  });
}
