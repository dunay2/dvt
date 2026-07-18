/** Owned concern: compose the dbt YAML description editor with its application port. */
import type { CanonicalNode } from '../../types/canonical';
import { useDbtYamlDescriptionEditPort } from '../../services/AppServicesContext';
import { resolveDbtYamlDescriptionEditorCopy } from './dbtYamlDescriptionEditorCopy';
import { DbtYamlDescriptionEditorView } from './DbtYamlDescriptionEditorView';
import { useDbtYamlDescriptionEditor } from './useDbtYamlDescriptionEditor';

export type DbtYamlDescriptionEditorProps = Readonly<{
  canvasId: string;
  node: CanonicalNode;
  descriptionFilePath: string;
  onProjectChanged: () => Promise<void>;
  onReloadLatest: () => Promise<string | null>;
}>;

export function DbtYamlDescriptionEditor({
  canvasId,
  node,
  descriptionFilePath,
  onProjectChanged,
  onReloadLatest,
}: DbtYamlDescriptionEditorProps): JSX.Element {
  const port = useDbtYamlDescriptionEditPort();
  const copy = resolveDbtYamlDescriptionEditorCopy();
  const controller = useDbtYamlDescriptionEditor({
    canvasId,
    resourceUniqueId: node.id,
    currentDescription: node.description ?? null,
    port,
    copy,
    onProjectChanged,
    onReloadLatest,
  });

  return (
    <DbtYamlDescriptionEditorView
      path={descriptionFilePath}
      copy={copy}
      state={controller.state}
      onDraftChange={controller.commands.setDraft}
      onReview={() => void controller.commands.review()}
      onDiscardReview={controller.commands.discardReview}
      onApply={() => void controller.commands.apply()}
      onRevert={() => void controller.commands.revert()}
      onReloadLatest={() => void controller.commands.reloadLatest()}
      onContinueEditing={controller.commands.continueEditing}
    />
  );
}
