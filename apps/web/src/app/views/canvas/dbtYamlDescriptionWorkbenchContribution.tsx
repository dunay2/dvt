/** Owned concern: adapt one editable file-backed dbt node to the generic node workbench port. */
import { DbtYamlDescriptionEditor } from '../../components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor';
import { NODE_PROPERTY_ROW_ID } from '../../components/inspector/nodePropertiesReadModel';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasNodeWorkbenchContribution } from './canvasNodeWorkbenchContribution';
import { hasDbtCompatibilityMetadata } from './canvasDbtAuthoringModel';

type BuildDbtYamlDescriptionWorkbenchContributionOptions = Readonly<{
  canvasId: string;
  node: CanonicalNode | null;
  onProjectChanged: () => Promise<void>;
  onReloadLatest: (nodeId: string) => Promise<string | null>;
}>;

function readDescriptionFilePath(node: CanonicalNode): string | null {
  const path = node.metadata?.descriptionFilePath;
  return typeof path === 'string' && path.trim().length > 0 ? path.trim() : null;
}

export function buildDbtYamlDescriptionWorkbenchContributions({
  canvasId,
  node,
  onProjectChanged,
  onReloadLatest,
}: BuildDbtYamlDescriptionWorkbenchContributionOptions): readonly CanvasNodeWorkbenchContribution[] {
  if (node == null || !hasDbtCompatibilityMetadata(node)) {
    return [];
  }

  const descriptionFilePath = readDescriptionFilePath(node);
  if (descriptionFilePath == null) {
    return [];
  }

  return [
    {
      id: 'dbt-yaml-description-editor',
      nodeId: node.id,
      sectionId: 'general',
      placement: 'after-body',
      supersededRowIds: [NODE_PROPERTY_ROW_ID.description],
      content: (
        <DbtYamlDescriptionEditor
          key={`${canvasId}:${node.id}:${descriptionFilePath}`}
          canvasId={canvasId}
          node={node}
          descriptionFilePath={descriptionFilePath}
          onProjectChanged={onProjectChanged}
          onReloadLatest={() => onReloadLatest(node.id)}
        />
      ),
    },
  ];
}
