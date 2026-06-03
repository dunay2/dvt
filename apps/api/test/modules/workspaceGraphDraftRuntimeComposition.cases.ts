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
const WORKSPACE_GRAPH_DRAFT_RUNTIME_MODULE =
  'workspaceGraphDraft/buildWorkspaceGraphDraftRuntime.ts';
const WORKSPACE_GRAPH_DRAFT_RUNTIME_DOC =
  'workspace-graph-draft-runtime-composition-component.md';
const WORKSPACE_GRAPH_DRAFT_PUBLIC_API = {
  fileName: 'buildWorkspaceGraphDraftRuntime.ts',
  exportedIdentifiers: [
    'BuildWorkspaceGraphDraftRuntimeDeps',
    'buildWorkspaceGraphDraftRuntime',
  ],
} as const;

/**
 * Architecture cases for the dedicated workspace-graph-draft runtime seam.
 * These checks keep the protected root as an assembler while the subcomponent
 * owns the graph-draft runtime construction chain.
 */
export function describeWorkspaceGraphDraftRuntimeCompositionCases(): void {
  describe('workspace graph draft runtime composition architecture', () => {
    it('ships a local component guide with API, invariants, transitions, and consumers', () => {
      expect(apiDocExists(WORKSPACE_GRAPH_DRAFT_RUNTIME_DOC)).toBe(true);

      const docText = readApiDoc(WORKSPACE_GRAPH_DRAFT_RUNTIME_DOC);
      expect(
        collectMissingTextSnippets(docText, REQUIRED_COMPONENT_GUIDE_SECTIONS)
      ).toEqual([]);
      expect(hasMermaidDiagram(docText)).toBe(true);

      const workspaceGraphDraftRuntimeSource = readModuleSource(
        WORKSPACE_GRAPH_DRAFT_RUNTIME_MODULE
      );
      const exportedIdentifiers =
        workspaceGraphDraftRuntimeSource.collectExportedIdentifiers();
      for (const exportName of WORKSPACE_GRAPH_DRAFT_PUBLIC_API.exportedIdentifiers) {
        expect(exportedIdentifiers).toContain(exportName);
      }
      expect(
        collectMissingTextSnippets(
          docText,
          buildDocumentedApiSnippets(
            WORKSPACE_GRAPH_DRAFT_PUBLIC_API.fileName,
            WORKSPACE_GRAPH_DRAFT_PUBLIC_API.exportedIdentifiers
          )
        )
      ).toEqual([]);
    });

    it('delegates workspace graph draft assembly from the protected runtime root into a dedicated builder', () => {
      expect(moduleComponentExists(WORKSPACE_GRAPH_DRAFT_RUNTIME_MODULE)).toBe(true);
      expect(
        BUILD_PROTECTED_RUNTIME_MODULE_SOURCE.hasNamedImport({
          moduleSpecifier: './workspaceGraphDraft/buildWorkspaceGraphDraftRuntime.js',
          importedName: 'buildWorkspaceGraphDraftRuntime',
        })
      ).toBe(true);
      expect(
        BUILD_PROTECTED_RUNTIME_MODULE_SOURCE.hasCallToIdentifier(
          'buildWorkspaceGraphDraftRuntime'
        )
      ).toBe(true);

      for (const constructorName of [
        'PostgresWorkspaceGraphDraftStore',
        'StructuredWorkspaceGraphDraftAuditLogger',
        'AuthorizeWorkspaceGraphDraftCapabilityService',
        'GetWorkspaceGraphDraftUseCase',
        'SaveWorkspaceGraphDraftUseCase',
      ]) {
        expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE.hasNewExpression(constructorName)).toBe(false);
      }
    });

    it('keeps workspace graph draft runtime constructors inside the dedicated builder module', () => {
      expect(moduleComponentExists(WORKSPACE_GRAPH_DRAFT_RUNTIME_MODULE)).toBe(true);

      const workspaceGraphDraftRuntimeSource = readModuleSource(
        WORKSPACE_GRAPH_DRAFT_RUNTIME_MODULE
      );
      expect(workspaceGraphDraftRuntimeSource.hasOwnedConcernDocblock()).toBe(true);
      expect(
        workspaceGraphDraftRuntimeSource.hasNamedImport({
          moduleSpecifier:
            '../../application/services/authorizeWorkspaceGraphDraftCapabilityService.js',
          importedName: 'AuthorizeWorkspaceGraphDraftCapabilityService',
        })
      ).toBe(true);

      for (const constructorName of [
        'PostgresWorkspaceGraphDraftStore',
        'StructuredWorkspaceGraphDraftAuditLogger',
        'AuthorizeWorkspaceGraphDraftCapabilityService',
        'GetWorkspaceGraphDraftUseCase',
        'SaveWorkspaceGraphDraftUseCase',
      ]) {
        expect(workspaceGraphDraftRuntimeSource.hasNewExpression(constructorName)).toBe(true);
      }
    });
  });
}
