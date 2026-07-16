import { describe, expect, it } from 'vitest';

import { EXECUTABLE_SUBGRAPH_RESOLUTION_COMPONENT } from './executableSubgraphResolutionArchitecture.support.js';

const { artifacts, contracts } = EXECUTABLE_SUBGRAPH_RESOLUTION_COMPONENT;

describe('Executable-subgraph resolution component architecture', () => {
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
    expect(docText).toContain('ResolveAuthorizedExecutableSubgraphService');
    expect(docText).toContain('PreviewPlanUseCase');
    expect(docText).toContain('PlannerBackedStartRunUseCase');
  });

  it('states owned concern docblocks on resolver-owned modules', () => {
    for (const artifact of [
      artifacts.resolverService,
      artifacts.previewUseCase,
      artifacts.plannerBackedUseCase,
    ]) {
      expect(artifact.hasOwnedConcernDocblock()).toBe(true);
    }
  });

  it('keeps protected draft parsing and store access isolated to the resolver service', () => {
    const resolverSource = artifacts.resolverService.readSource();
    expect(
      resolverSource.hasNamedImport({
        importedName: 'WorkspaceGraphAuthoringDraftSchema',
        moduleSpecifier: contracts.canonicalBoundaryModule,
      })
    ).toBe(true);
    expect(
      resolverSource.hasNamedImport({
        importedName: 'IWorkspaceGraphDraftStore',
        moduleSpecifier: contracts.workspaceGraphDraftPortsModule,
      })
    ).toBe(true);

    for (const artifact of [artifacts.previewUseCase, artifacts.plannerBackedUseCase]) {
      const source = artifact.readSource();
      expect(
        source.hasNamedImport({
          importedName: 'WorkspaceGraphAuthoringDraftSchema',
          moduleSpecifier: contracts.canonicalBoundaryModule,
        })
      ).toBe(false);
      expect(
        source.hasNamedImport({
          importedName: 'IWorkspaceGraphDraftStore',
          moduleSpecifier: contracts.workspaceGraphDraftPortsModule,
        })
      ).toBe(false);
    }
  });

  it('routes preview by authority while planner-backed start-run keeps graph-draft resolution', () => {
    const previewSource = artifacts.previewUseCase.readSource();
    expect(
      previewSource.hasNamedImport({
        importedName: 'ResolveAuthorizedPreviewSelectionService',
        moduleSpecifier: './resolveAuthorizedPreviewSelection.js',
      })
    ).toBe(true);
    expect(artifacts.previewUseCase.readText()).toContain(
      'this.deps.previewSelectionResolver.execute('
    );
    expect(artifacts.previewUseCase.readText()).toContain('previewSelection.value.nodeIds');

    const startRunSource = artifacts.plannerBackedUseCase.readSource();
    expect(
      startRunSource.hasNamedImport({
        importedName: 'ResolveAuthorizedExecutableSubgraphService',
        moduleSpecifier: './resolveAuthorizedExecutableSubgraph.js',
      })
    ).toBe(true);
    expect(artifacts.plannerBackedUseCase.readText()).toContain(
      'this.deps.executableSubgraphResolver.execute('
    );
    expect(artifacts.plannerBackedUseCase.readText()).toContain('executableSubgraph.value.nodeIds');

    for (const artifact of [artifacts.previewUseCase, artifacts.plannerBackedUseCase]) {
      expect(artifact.readText()).not.toContain('selectedNodeIds: command.selection.nodeIds');
    }

    expect(artifacts.previewSelectionAuthority.readText()).toContain(
      'this.deps.graphDraftResolver.execute(input, context)'
    );
  });

  it('wires the resolver from the protected draft store into both runtime composition paths', () => {
    expect(artifacts.startRunRuntimeBuilder.readText()).toContain(
      'new ResolveAuthorizedExecutableSubgraphService({'
    );
    expect(artifacts.startRunRuntimeBuilder.readText()).toContain(
      'workspaceGraphDraftStore: deps.workspaceGraphDraftStore'
    );
    expect(artifacts.routeDependencies.readText()).toContain(
      'new ResolveAuthorizedExecutableSubgraphService({'
    );
    expect(artifacts.routeDependencies.readText()).toContain(
      'workspaceGraphDraftStore: protectedModule.workspaceGraphDraftStore'
    );
    expect(artifacts.routeDependencies.readText()).toContain(
      'new ResolveAuthorizedPreviewSelectionService({'
    );
    expect(artifacts.routeDependencies.readText()).toContain(
      'projectGraph: protectedModule.dbtProjectImport.projectGraphUseCase'
    );
  });
});
