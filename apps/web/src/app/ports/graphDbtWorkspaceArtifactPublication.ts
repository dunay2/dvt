/** Owned concern: expose the specific graph-derived dbt artifact publication command. */
import type {
  GraphDbtWorkspaceArtifactPublicationResult,
  PublishGraphDbtWorkspaceArtifactsRequest,
} from '@dvt/contracts';

export interface IGraphDbtWorkspaceArtifactPublicationCommandPort {
  publish(
    request: PublishGraphDbtWorkspaceArtifactsRequest
  ): Promise<GraphDbtWorkspaceArtifactPublicationResult>;
}
