/** Inspect the terminal producer of an active draft without publishing or compiling it. */
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { useMemo, type ComponentProps } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasModelOutputInspector } from './CanvasModelOutputInspector';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { CanvasOperationInspectorTabs } from './CanvasRelationalTreeEditorFrame';
import { buildCanvasRelationalTreeRelation } from './canvasRelationalTreeRelationProjection';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeAuthoringDto } from './canvasRelationalTreeAuthoringView';
import { resolveCanvasStagedProducerDocument } from './canvasStagedOperationDocument';

export function CanvasDraftModelOutputInspector({
  data,
  canonicalRoot,
  ...inspector
}: Omit<
  ComponentProps<typeof CanvasModelOutputInspector>,
  'modelName' | 'root' | 'editable' | 'sqlOutput' | 'draftAnalysis'
> &
  Readonly<{
    data: CanvasRelationalTreeAuthoringDto;
    canonicalRoot: CanvasRelationalTreeNode | null;
  }>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const { outputRelationId, draft, stagedOperations, pendingSources } = data;
  const terminal = useMemo(() => {
    if (outputRelationId == null) return { root: null };
    if (canonicalRoot?.relationId === outputRelationId) return { root: canonicalRoot };
    const document = resolveCanvasStagedProducerDocument({
      relationId: outputRelationId,
      canonical: draft,
      operations: stagedOperations,
      sources: pendingSources,
    });
    if (document == null) return { root: null };
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok || indexed.index.rootId !== outputRelationId) return { root: null };
    return {
      root: buildCanvasRelationalTreeRelation({ index: indexed.index, digest: outputRelationId }),
      document,
    };
  }, [canonicalRoot, draft, outputRelationId, pendingSources, stagedOperations]);
  const draftAnalysis =
    terminal.document == null
      ? undefined
      : { binding: data.analysisBinding, document: terminal.document };
  return (
    <CanvasOperationInspectorTabs>
      <CanvasModelOutputInspector
        {...inspector}
        modelName={data.transformNode.name}
        root={terminal.root}
        draftAnalysis={draftAnalysis}
        editable={false}
        sqlOutput={
          <p role="status">{resolveCanvasViewCopy(language).inspectorModelSqlApplyHint}</p>
        }
      />
    </CanvasOperationInspectorTabs>
  );
}
