/** Owned concern: present canonical Transform output and route semantic edits to the Model editor. */

import { Button } from '../../components/ui/button';
import { DvtTransformOutputView, type DvtTransformOutputViewProps } from './DvtTransformOutputView';

export function DvtTransformCodeWorkbenchContent({
  transformNode,
  nodes,
  edges,
  canonicalContent,
  canonicalDescription,
  openSemanticEditorLabel,
  onOpenSemanticEditor,
  copy,
}: Omit<DvtTransformOutputViewProps, 'canonicalContent'> &
  Readonly<{
    canonicalContent?: string;
    openSemanticEditorLabel: string;
    onOpenSemanticEditor?: () => void;
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
        <DvtTransformOutputView
          transformNode={transformNode}
          nodes={nodes}
          edges={edges}
          canonicalContent={canonicalContent}
          canonicalDescription={canonicalDescription}
          copy={copy}
        />
      )}
    </div>
  );
}
