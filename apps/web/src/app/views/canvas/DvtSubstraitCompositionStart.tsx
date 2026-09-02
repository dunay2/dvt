/** Owned concern: replace a stale single-input projection with one canonical composition. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createDvtSubstraitStringInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitUnionAllDraft,
  resolveDvtSubstraitUnionAllEntry,
} from './canvasDvtSubstraitSetComposition';
import { DvtSubstraitCompositionStartSection } from './DvtSubstraitCompositionStartSection';

export function DvtSubstraitCompositionStart({
  disabled,
  node,
  nodes,
  edges,
  onChange,
}: Readonly<{
  disabled: boolean;
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element | null {
  const inputs = resolveCanvasDvtCompositionInputs({ targetNodeId: node.id, nodes, edges });
  if (inputs.length < 2) return null;
  const unionAllEntry = resolveDvtSubstraitUnionAllEntry({ targetNode: node, nodes, edges });

  return (
    <DvtSubstraitCompositionStartSection
      disabled={disabled}
      inputs={inputs}
      onStartInnerJoin={({ left, right }) => {
        const leftInput = inputs.find((input) => input.nodeId === left.nodeId);
        const rightInput = inputs.find((input) => input.nodeId === right.nodeId);
        if (leftInput == null || rightInput == null) return;
        const join = createDvtSubstraitStringInnerJoinDraft({
          left: {
            source: leftInput,
            fields: leftInput.fields
              .filter((field) => field.stringCompatible)
              .map((field) => field.name),
          },
          right: {
            source: rightInput,
            fields: rightInput.fields
              .filter((field) => field.stringCompatible)
              .map((field) => field.name),
          },
          leftFieldName: left.fieldName,
          rightFieldName: right.fieldName,
          targetNodeId: node.id,
        });
        onChange((currentDraft) => ({
          ...currentDraft,
          dvt: {
            kind: 'transform',
            mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
            shape: 'inner_join',
            plan: join.plan,
            sidecar: join.sidecar,
          },
        }));
      }}
      onStartUnionAll={
        unionAllEntry == null
          ? undefined
          : () => {
              const unionAll = createDvtSubstraitUnionAllDraft(unionAllEntry);
              onChange((currentDraft) => ({
                ...currentDraft,
                dvt: {
                  kind: 'transform',
                  mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
                  shape: 'union_all',
                  plan: unionAll.plan,
                  sidecar: unionAll.sidecar,
                },
              }));
            }
      }
    />
  );
}
