/** Owned concern: present canonical Transform output and route semantic edits to the Model editor. */

import { Button } from '../../components/ui/button';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasViewCopy } from './canvasCopy.types';
import { DvtTransformOutputView } from './DvtTransformOutputView';

export function DvtTransformCodeWorkbenchContent({
  transformNode,
  nodes,
  edges,
  canonicalContent,
  canonicalDescription,
  openSemanticEditorLabel,
  onOpenSemanticEditor,
  copy,
}: Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  canonicalContent?: string;
  canonicalDescription?: string;
  openSemanticEditorLabel: string;
  onOpenSemanticEditor?: () => void;
  copy: Pick<
    CanvasViewCopy,
    | 'inspectorTransformOutputViewLabel'
    | 'inspectorTransformOutputSubstraitLabel'
    | 'inspectorTransformOutputPostgresSqlLabel'
    | 'inspectorTransformOutputLoadingMessage'
    | 'inspectorTransformOutputErrorMessage'
  >;
}>): JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {onOpenSemanticEditor == null ? null : (
        <div className="flex shrink-0 justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            data-slot="canvas-open-semantic-editor"
            onClick={onOpenSemanticEditor}
          >
            {openSemanticEditorLabel}
          </Button>
        </div>
      )}
      {canonicalContent == null ? null : (
        <div className="min-h-0 flex-1">
          <DvtTransformOutputView
            transformNode={transformNode}
            nodes={nodes}
            edges={edges}
            canonicalContent={canonicalContent}
            canonicalDescription={canonicalDescription}
            copy={copy}
          />
        </div>
      )}
    </div>
  );
}
