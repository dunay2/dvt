import { describe, expect, it } from 'vitest';

import {
  listCanvasSourceFiles,
  readAppSource,
  readRepoFile,
} from './canvasStartupAndDraftRecovery.architecture.support';

describe('canvas draft recovery boundary architecture', () => {
  it('documents and guards protected-runtime token refresh and layout persistence semantics', () => {
    const mailbox = readRepoFile(
      'buzon/20260429-codex-canvas-operability-auth-and-drag-fowler-review.md'
    );
    const authGuide = readRepoFile('docs/architecture/components/web/api-client-auth-component.md');
    const layoutGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-layout-persistence-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md'
    );

    expect(mailbox).toContain('## Fowler verdict');
    expect(mailbox).toContain('## Pattern improvements');
    expect(mailbox).toContain('## Antipatterns removed or reduced');
    expect(mailbox).toContain('## Drift fixed');
    expect(mailbox).toContain('## ADR decision');

    for (const guide of [authGuide, layoutGuide]) {
      expect(guide).toContain('## Public API');
      expect(guide).toContain('## Invariants');
      expect(guide).toContain('## Transitions');
      expect(guide).toContain('## Consumers');
      expect(guide).toContain('```mermaid');
    }
    expect(authGuide).toContain('VITE_API_BEARER_TOKEN_REFRESH_URL');
    expect(authGuide).toContain('401');
    expect(layoutGuide).toContain('drag-stop event payload');
    expect(layoutGuide).toContain('persistedNodePositions');

    expect(userStories).toContain('US-CANVAS-AUTH-001');
    expect(userStories).toContain('US-CANVAS-AUTH-002');
    expect(userStories).toContain('US-CANVAS-LAYOUT-001');
    expect(userStories).toContain('US-CANVAS-LAYOUT-003');

    const apiAuthSource = readAppSource('../../services/api/apiAuthConfig.ts');
    const apiClientSource = readAppSource('../../services/api/createApiClient.ts');
    const layoutPersistenceSource = readAppSource('useCanvasLayoutPersistence.ts');
    const controllerSource = readAppSource('useCanvasController.ts');

    expect(apiAuthSource).toContain('resolveApiBearerTokenForRequest');
    expect(apiAuthSource).toContain('VITE_API_BEARER_TOKEN_REFRESH_URL');
    expect(apiAuthSource).toContain('isExpiredOrExpiring');
    expect(apiClientSource).toContain('dispatchRequest(true)');
    expect(apiClientSource).toContain('canRetryRequestBody');

    expect(layoutPersistenceSource).toContain('function useCanvasNodePositionPersistence(');
    expect(layoutPersistenceSource).toContain('function useCanvasViewportPersistenceHandler(');
    expect(layoutPersistenceSource).toContain('mergeDraggedNodePosition(allNodes, draggedNode)');
    expect(layoutPersistenceSource).not.toContain('workspaceGraphDraftAuthoringPort');
    expect(layoutPersistenceSource).not.toContain('saveGraphDraft');
    expect(readAppSource('canvasDraftLayoutHydrationPolicy.ts')).toContain(
      'function shouldSeedCanvasLayoutFromRemoteDraft('
    );
    expect(controllerSource).toContain('nodes: graphModel.nodes');
    expect(controllerSource).toContain('persistedNodePositions: store.persistedNodePositions');
  });

  it('keeps projection and replacement command decisions behind named semantic helpers', () => {
    const projectionSource = readAppSource(
      '../../services/workspace/workspaceGraphDraftProjection.ts'
    );
    const snapshotProjectionSource = readAppSource(
      '../../services/workspace/workspaceGraphDraftSnapshotProjection.ts'
    );
    const createCommandSource = readAppSource('canvasCreateCanvasDocumentCommand.ts');
    const createCommandPolicySource = readAppSource('canvasCreateCanvasDocumentCommandPolicy.ts');
    const createCommandSaveResultSource = readAppSource('canvasCreateCanvasDocumentSaveResult.ts');

    expect(projectionSource).toContain('function buildCanonicalEdgeProjection(');
    expect(projectionSource).not.toContain('DBT_NODE_TYPE_RULES');
    expect(projectionSource).not.toContain('DbtNodeType');

    expect(snapshotProjectionSource).toContain('const DBT_NODE_TYPE_RULES');
    expect(snapshotProjectionSource).toContain('function matchesDbtNodeTypeRule(');
    expect(snapshotProjectionSource).toContain('function projectCanonicalNodeToDbtNode(');

    expect(createCommandPolicySource).toContain(
      'function resolveCreateCanvasDocumentCommandEligibility('
    );
    expect(createCommandPolicySource).toContain('function buildBlankCanvasDocumentDraftInput(');
    expect(createCommandSaveResultSource).toContain('function applyCanvasDocumentSaveSuccess(');
    expect(createCommandSaveResultSource).toContain('function applyCanvasDocumentSaveConflict(');
    expect(createCommandSource).not.toContain(
      'function resolveCreateCanvasDocumentCommandEligibility('
    );
  });

  it('keeps Canvas authoring draft persistence on aggregate-native types', () => {
    const workspacePortSource = readAppSource('../../ports/workspace.ts');
    const workspacePortsSource = readAppSource('../../services/workspace/workspacePorts.ts');
    const repositorySource = readAppSource('canvasDraftRepository.ts');
    const authoringSource = readAppSource('canvasDraftAuthoring.ts');
    const structuralSignatureSource = readAppSource('canvasDraftStructuralSignature.ts');

    for (const retiredExport of [
      'export type WorkspaceGraphDraft',
      'export type WorkspaceGraphDraftRecord',
      'export type SaveWorkspaceGraphDraftInput',
      'export type SaveWorkspaceGraphDraftResult',
    ]) {
      expect(workspacePortSource).not.toContain(retiredExport);
      expect(workspacePortsSource).not.toContain(retiredExport.replace('export type ', ''));
    }

    expect(repositorySource).toContain('draft: WorkspaceGraphAuthoringDraft');
    expect(repositorySource).not.toContain('CanvasDraftAuthoringPayload');
    expect(repositorySource).not.toContain('buildCanvasDraftAuthoringGraph');
    expect(repositorySource).not.toContain('projectedDraft');

    expect(authoringSource).not.toContain('CanvasDraftAuthoringPayload');
    expect(authoringSource).not.toContain('projectedDraft');
    expect(authoringSource).not.toContain("from '../../ports/workspace'");
    expect(structuralSignatureSource).toContain('WorkspaceGraphAuthoringDraft');
    expect(structuralSignatureSource).not.toContain('WorkspaceGraphDraft');

    const bannedWorkspaceDraftImport =
      /import\s+type\s+\{[^}]*\b(?:WorkspaceGraphDraft|WorkspaceGraphDraftRecord)\b[^}]*\}\s+from\s+['"]\.\.\/\.\.\/ports\/workspace['"]/;
    for (const relativePath of listCanvasSourceFiles()) {
      const source = readAppSource(relativePath);
      expect(source, relativePath).not.toMatch(bannedWorkspaceDraftImport);
    }

    const allowedDesignGraphDraftFiles = new Set([
      'previewDesignGraphArtifact.ts',
      'previewGraphNodePayloads.ts',
    ]);
    const designGraphDraftContractImport =
      /import\s+type\s+\{[^}]*\bDesignGraphDraft\b[^}]*\}\s+from\s+['"]@dvt\/contracts['"]/;
    for (const relativePath of listCanvasSourceFiles()) {
      const source = readAppSource(relativePath);
      if (!designGraphDraftContractImport.test(source)) {
        continue;
      }

      expect(allowedDesignGraphDraftFiles.has(relativePath), relativePath).toBe(true);
    }
  });

  it('keeps canvas node viewport projection options behind a named argument object', () => {
    const mapperSource = readAppSource('canvasNodeMapper.ts');

    expect(mapperSource).toContain('type MapCanonicalNodeToCanvasNodeArgs = {');
    expect(mapperSource).toContain('export function mapCanonicalNodeToCanvasNode({');
    expect(mapperSource).toContain('}: MapCanonicalNodeToCanvasNodeArgs): Node<DbtNodeData>');
    expect(mapperSource).not.toContain('canonicalNode: CanonicalNode,\n  index: number,');
  });

  it('keeps first-canvas and recovery banner HTML behind passive templates', () => {
    const hostSource = readAppSource('CanvasPlaygroundHost.tsx');
    const hostTemplateSource = readAppSource('CanvasPlaygroundHost.templates.tsx');
    const recoveryBannerSource = readAppSource('CanvasRecoveryBanner.tsx');
    const recoveryModelSource = readAppSource('canvasRecoveryBannerModel.ts');
    const recoveryTemplateSource = readAppSource('CanvasRecoveryBanner.templates.tsx');

    expect(hostSource).toContain("from './CanvasPlaygroundHost.templates'");
    expect(hostSource).toContain('onCreateCanvasKind');
    expect(hostSource).not.toContain('<div');
    expect(hostSource).not.toContain('Button');
    expect(hostSource).not.toContain('Card');
    expect(hostTemplateSource).toContain('function CanvasPlaygroundHostTemplate(');
    expect(hostTemplateSource).not.toContain('CanvasCreateCanvasDocumentCommand');
    expect(hostTemplateSource).not.toContain('canvasViewCopy');

    expect(recoveryBannerSource).toContain("from './canvasRecoveryBannerModel'");
    expect(recoveryBannerSource).toContain("from './CanvasRecoveryBanner.templates'");
    expect(recoveryBannerSource).not.toContain('<div');
    expect(recoveryBannerSource).not.toContain('Button');
    expect(recoveryBannerSource).not.toContain('canvasViewCopy');
    expect(recoveryModelSource).toContain('function resolveCanvasRecoveryBannerViewState(');
    expect(recoveryModelSource).not.toContain('JSX.Element');
    expect(recoveryTemplateSource).toContain('function CanvasRecoveryBannerTemplate(');
    expect(recoveryTemplateSource).not.toContain('CanvasDraftPresentationState');
    expect(recoveryTemplateSource).not.toContain('canvasViewCopy');
  });
});
