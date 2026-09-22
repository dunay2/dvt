/** Owned concern: replace a stale single-input projection with one canonical composition. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import {
  createDvtSubstraitSetDraft,
  createDvtSubstraitUnionAllDraft,
  createDvtSubstraitUnionDistinctDraft,
  resolveDvtSubstraitUnionAllEntry,
} from './canvasDvtSubstraitSetComposition';
import { DvtSubstraitCompositionStartSection } from './DvtSubstraitCompositionStartSection';
import type { CanvasRelationalPredicateSeed } from './canvasRelationalPredicateSeed';

export function DvtSubstraitCompositionStart({
  disabled,
  node,
  nodes,
  edges,
  predicateSeed,
  onClearPredicateSeed,
  onChange,
}: Readonly<{
  disabled: boolean;
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  predicateSeed?: CanvasRelationalPredicateSeed;
  onClearPredicateSeed?: () => void;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element | null {
  const inputs = resolveCanvasDvtCompositionInputs({ targetNodeId: node.id, nodes, edges });
  if (inputs.length < 2) return null;
  const unionAllEntry = resolveDvtSubstraitUnionAllEntry({ targetNode: node, nodes, edges });

  return (
    <DvtSubstraitCompositionStartSection
      disabled={disabled}
      inputs={inputs}
      predicateSeed={predicateSeed}
      onClearPredicateSeed={onClearPredicateSeed}
      onStartInnerJoin={(join, operation) => {
        onChange((currentDraft) => ({
          ...currentDraft,
          dvt: {
            kind: 'transform',
            materialized:
              currentDraft.dvt?.kind === 'transform' ? currentDraft.dvt.materialized : 'view',
            mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
            shape: operation,
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
                  materialized:
                    currentDraft.dvt?.kind === 'transform' ? currentDraft.dvt.materialized : 'view',
                  mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
                  shape: 'union_all',
                  plan: unionAll.plan,
                  sidecar: unionAll.sidecar,
                },
              }));
            }
      }
      onStartUnionDistinct={
        unionAllEntry == null
          ? undefined
          : () => {
              const unionDistinct = createDvtSubstraitUnionDistinctDraft(unionAllEntry);
              onChange((currentDraft) => ({
                ...currentDraft,
                dvt: {
                  kind: 'transform',
                  materialized:
                    currentDraft.dvt?.kind === 'transform' ? currentDraft.dvt.materialized : 'view',
                  mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
                  shape: 'union_distinct',
                  plan: unionDistinct.plan,
                  sidecar: unionDistinct.sidecar,
                },
              }));
            }
      }
      onStartIntersectDistinct={
        unionAllEntry == null
          ? undefined
          : () => {
              const set = createDvtSubstraitSetDraft({
                ...unionAllEntry,
                operation: 'intersect_distinct',
              });
              onChange((currentDraft) => ({
                ...currentDraft,
                dvt: {
                  kind: 'transform',
                  materialized:
                    currentDraft.dvt?.kind === 'transform' ? currentDraft.dvt.materialized : 'view',
                  mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
                  shape: 'intersect_distinct',
                  plan: set.plan,
                  sidecar: set.sidecar,
                },
              }));
            }
      }
      onStartExceptDistinct={
        unionAllEntry == null
          ? undefined
          : () => {
              const set = createDvtSubstraitSetDraft({
                ...unionAllEntry,
                operation: 'except_distinct',
              });
              onChange((currentDraft) => ({
                ...currentDraft,
                dvt: {
                  kind: 'transform',
                  materialized:
                    currentDraft.dvt?.kind === 'transform' ? currentDraft.dvt.materialized : 'view',
                  mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
                  shape: 'except_distinct',
                  plan: set.plan,
                  sidecar: set.sidecar,
                },
              }));
            }
      }
      onStartIntersectAll={
        unionAllEntry == null
          ? undefined
          : () => {
              const set = createDvtSubstraitSetDraft({
                ...unionAllEntry,
                operation: 'intersect_all',
              });
              onChange((currentDraft) => ({
                ...currentDraft,
                dvt: {
                  kind: 'transform',
                  materialized:
                    currentDraft.dvt?.kind === 'transform' ? currentDraft.dvt.materialized : 'view',
                  mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
                  shape: 'intersect_all',
                  plan: set.plan,
                  sidecar: set.sidecar,
                },
              }));
            }
      }
      onStartExceptAll={
        unionAllEntry == null
          ? undefined
          : () => {
              const set = createDvtSubstraitSetDraft({
                ...unionAllEntry,
                operation: 'except_all',
              });
              onChange((currentDraft) => ({
                ...currentDraft,
                dvt: {
                  kind: 'transform',
                  materialized:
                    currentDraft.dvt?.kind === 'transform' ? currentDraft.dvt.materialized : 'view',
                  mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
                  shape: 'except_all',
                  plan: set.plan,
                  sidecar: set.sidecar,
                },
              }));
            }
      }
    />
  );
}
