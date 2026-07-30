/** Owned concern: define the specific graph-derived dbt artifact publication command. */
import type {
  GraphDbtWorkspaceArtifactPublicationResult,
  PublishGraphDbtWorkspaceArtifactsRequest,
} from '@dvt/contracts';

import type { WorkspaceStorageScope } from './workspaceFiles.js';

export type PublishGraphDbtWorkspaceArtifactsInput = Readonly<
  PublishGraphDbtWorkspaceArtifactsRequest & {
    scope: WorkspaceStorageScope;
  }
>;

export interface IPublishGraphDbtWorkspaceArtifactsCommand {
  execute(
    input: PublishGraphDbtWorkspaceArtifactsInput
  ): Promise<GraphDbtWorkspaceArtifactPublicationResult>;
}
