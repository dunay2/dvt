import { describe, expect, it } from 'vitest';

import { WORKSPACE_GRAPH_DRAFT_APPLICATION_COMPONENT } from './applicationArchitectureAst.support.js';

const { artifacts, contracts } = WORKSPACE_GRAPH_DRAFT_APPLICATION_COMPONENT;

describe('Workspace graph draft application component architecture', () => {
  it('ships a local component guide with API, invariants, transitions, and consumers', () => {
    expect(artifacts.componentGuide.exists()).toBe(true);

    const docText = artifacts.componentGuide.readText();
    for (const section of [
      '## Owned concern',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component map',
    ]) {
      expect(docText).toContain(section);
    }
    expect(docText).toContain('```mermaid');
    expect(docText).toContain('AuthorizeWorkspaceGraphDraftCapabilityService');
    expect(docText).toContain('GetWorkspaceGraphDraftUseCase');
    expect(docText).toContain('SaveWorkspaceGraphDraftUseCase');
  });

  it('states owned concern docblocks on the workspace graph draft application modules', () => {
    for (const artifact of [
      artifacts.portFamily,
      artifacts.authorizeCapabilityService,
      artifacts.getUseCase,
      artifacts.saveUseCase,
    ]) {
      expect(artifact.hasOwnedConcernDocblock()).toBe(true);
    }
  });

  it('keeps authentication and command-scope authorization isolated to the capability service', () => {
    const authorizeSource = artifacts.authorizeCapabilityService.readSource();
    expect(
      authorizeSource.hasNamedImport({
        importedName: 'IAuthenticator',
        moduleSpecifier: '../ports/auth.js',
      })
    ).toBe(true);
    expect(
      authorizeSource.hasNamedImport({
        importedName: 'AuthorizeCommandScopeService',
        moduleSpecifier: './authorizeCommandScopeService.js',
      })
    ).toBe(true);

    for (const artifact of [artifacts.getUseCase, artifacts.saveUseCase]) {
      const source = artifact.readSource();
      expect(
        source.hasNamedImport({
          importedName: 'IAuthenticator',
          moduleSpecifier: '../ports/auth.js',
        })
      ).toBe(false);
      expect(
        source.hasNamedImport({
          importedName: 'AuthorizeCommandScopeService',
          moduleSpecifier: './authorizeCommandScopeService.js',
        })
      ).toBe(false);
    }
  });

  it('keeps read and write use cases on canonical contracts and local ports only', () => {
    for (const artifact of [artifacts.getUseCase, artifacts.saveUseCase]) {
      const source = artifact.readSource();
      expect(source.collectNamedImports('@dvt/contracts').length).toBeGreaterThan(0);
      expect(
        source.hasNamedImport({
          importedName: 'IWorkspaceGraphDraftStore',
          moduleSpecifier: '../ports/workspaceGraphDraft.js',
        })
      ).toBe(true);
      expect(
        source.hasNamedImport({
          importedName: 'IWorkspaceGraphDraftAuditPort',
          moduleSpecifier: '../ports/workspaceGraphDraft.js',
        })
      ).toBe(true);

      expect(source.collectNamedImports('../../entrypoints/http/workspaceGraphDraftRoutes.js')).toEqual(
        []
      );
      expect(source.collectNamedImports('../../modules/workspaceGraphDraft/buildWorkspaceGraphDraftRuntime.js')).toEqual(
        []
      );
    }
  });

  it('centralizes action names and persistence interfaces in the port family module', () => {
    const portFamilyText = artifacts.portFamily.readText();
    const portFamilySource = artifacts.portFamily.readSource();

    for (const exportedIdentifier of [
      'WORKSPACE_GRAPH_DRAFT_ACTION',
      'WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION',
      'WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION',
      'IWorkspaceGraphDraftStore',
      'IWorkspaceGraphDraftAuditPort',
      'IWorkspaceGraphDraftTelemetry',
    ]) {
      expect(portFamilyText).toContain(exportedIdentifier);
    }

    expect(
      artifacts.authorizeCapabilityService.readText().includes('WORKSPACE_GRAPH_DRAFT_ACTION')
    ).toBe(true);
    expect(artifacts.getUseCase.readText().includes('WORKSPACE_GRAPH_DRAFT_ACTION')).toBe(false);
    expect(artifacts.saveUseCase.readText().includes('WORKSPACE_GRAPH_DRAFT_ACTION')).toBe(false);
  });
});
