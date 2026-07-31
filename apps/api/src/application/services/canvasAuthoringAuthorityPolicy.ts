import {
  WorkspaceGraphAuthoringDraftSchema,
  type CanvasAuthoringAuthorityBinding,
  type CanvasAuthoringAuthorityResolution,
  type GraphDbtWorkspaceArtifactPublicationAuthorityRefused,
} from '@dvt/contracts';

import type {
  CanvasAuthoringAuthorityKey,
  ICanvasAuthoringAuthorityStore,
} from '../ports/canvasAuthoringAuthority.js';
import type { IWorkspaceGraphDraftStore } from '../ports/workspaceGraphDraft.js';

export class CanvasAuthoringAuthorityMissingError extends Error {
  public constructor(readonly canvasId: string) {
    super(`Canvas ${canvasId} has no persisted authoring authority.`);
    this.name = 'CanvasAuthoringAuthorityMissingError';
  }
}

export class CanvasAuthoringAuthorityMixedError extends Error {
  public constructor(readonly canvasId: string) {
    super(`Canvas ${canvasId} has conflicting graph and dbt project file authority.`);
    this.name = 'CanvasAuthoringAuthorityMixedError';
  }
}

export type GraphArtifactPublicationAuthorityDecision =
  | Readonly<{ kind: 'allowed'; binding: CanvasAuthoringAuthorityBinding }>
  | Readonly<{
      kind: 'refused';
      reason: GraphDbtWorkspaceArtifactPublicationAuthorityRefused['reason'];
    }>;

export type GraphArtifactPublicationExecution<T> =
  | Readonly<{ kind: 'executed'; value: T }>
  | Readonly<{
      kind: 'refused';
      reason: GraphDbtWorkspaceArtifactPublicationAuthorityRefused['reason'];
    }>;

export class CanvasAuthoringAuthorityPolicy {
  public constructor(
    private readonly store: ICanvasAuthoringAuthorityStore,
    private readonly graphDraftStore: Pick<IWorkspaceGraphDraftStore, 'read'>
  ) {}

  public async resolve(key: CanvasAuthoringAuthorityKey): Promise<CanvasAuthoringAuthorityBinding> {
    const resolution = await this.resolveAuthorityFacts(key);
    if (resolution.kind === 'mixed') {
      throw new CanvasAuthoringAuthorityMixedError(key.canvasId);
    }
    if (resolution.kind === 'missing') {
      throw new CanvasAuthoringAuthorityMissingError(key.canvasId);
    }
    return resolution.binding;
  }

  public async resolveGraphDraftReadAuthority(
    key: CanvasAuthoringAuthorityKey
  ): Promise<CanvasAuthoringAuthorityResolution> {
    const stored = await this.store.read(key);
    return stored
      ? {
          kind: 'unresolved',
          reason: 'mixed_authority',
          canvasId: key.canvasId,
        }
      : {
          kind: 'resolved',
          binding: graphDraftBinding(key.canvasId),
        };
  }

  public async authorizeGraphArtifactPublication(
    key: CanvasAuthoringAuthorityKey,
    projectRoot: string
  ): Promise<GraphArtifactPublicationAuthorityDecision> {
    const resolution = await this.resolveAuthorityFacts(key);
    if (resolution.kind === 'missing') {
      return { kind: 'refused', reason: 'missing_authority' };
    }
    if (resolution.kind === 'mixed') {
      return { kind: 'refused', reason: 'mixed_authority' };
    }
    if (resolution.binding.authority.kind !== 'graph-draft') {
      return { kind: 'refused', reason: 'dbt_project_files_authority' };
    }

    const rootOwner = await this.store.readFileAuthorityByProjectRoot(key, projectRoot);
    return rootOwner
      ? { kind: 'refused', reason: 'dbt_project_files_authority' }
      : { kind: 'allowed', binding: resolution.binding };
  }

  public async runAuthorizedGraphArtifactPublication<T>(
    key: CanvasAuthoringAuthorityKey,
    projectRoot: string,
    operation: () => Promise<T>
  ): Promise<GraphArtifactPublicationExecution<T>> {
    return this.store.withGraphArtifactPublicationLock({ key, projectRoot }, async () => {
      const decision = await this.authorizeGraphArtifactPublication(key, projectRoot);
      return decision.kind === 'refused'
        ? decision
        : {
            kind: 'executed',
            value: await operation(),
          };
    });
  }

  private async resolveAuthorityFacts(
    key: CanvasAuthoringAuthorityKey
  ): Promise<
    | Readonly<{ kind: 'resolved'; binding: CanvasAuthoringAuthorityBinding }>
    | Readonly<{ kind: 'missing' }>
    | Readonly<{ kind: 'mixed' }>
  > {
    const [stored, graphDraftRecord] = await Promise.all([
      this.store.read(key),
      this.graphDraftStore.read({
        tenantId: key.tenantId,
        projectId: key.projectId,
        environmentId: key.environmentId,
      }),
    ]);
    let graphOwnsCanvas = false;
    if (graphDraftRecord !== null) {
      const graphDraft = WorkspaceGraphAuthoringDraftSchema.parse(graphDraftRecord.draftPayload);
      graphOwnsCanvas = (graphDraft.activeCanvasId ?? graphDraft.canvas.id) === key.canvasId;
    }

    if (stored && graphOwnsCanvas) {
      return { kind: 'mixed' };
    }
    if (stored) {
      return { kind: 'resolved', binding: stored.binding };
    }
    if (!graphOwnsCanvas) {
      return { kind: 'missing' };
    }

    return {
      kind: 'resolved',
      binding: graphDraftBinding(key.canvasId),
    };
  }
}

function graphDraftBinding(canvasId: string): CanvasAuthoringAuthorityBinding {
  return {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId,
    authority: { kind: 'graph-draft' },
  };
}
