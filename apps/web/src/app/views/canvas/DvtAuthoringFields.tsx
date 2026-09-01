/** Owned concern: render DVT-specific Canvas Inspector authoring fields. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { resolveInheritedDvtConnectionRef } from './canvasDvtAuthoringModel';
import {
  createDvtSubstraitPilotDraft,
  resolveDvtSubstraitPilotEntry,
} from './canvasDvtSubstraitPilot';
import {
  createDvtSubstraitInnerJoinDraft,
  resolveDvtSubstraitJoinAppendCandidates,
  resolveDvtSubstraitInnerJoinEntry,
} from './canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitUnionAllDraft,
  resolveDvtSubstraitUnionAllEntry,
} from './canvasDvtSubstraitSetComposition';
import { DvtSinkAuthoringSection } from './DvtSinkAuthoringSection';
import { DvtSourceAuthoringSection } from './DvtSourceAuthoringSection';
import { DvtSqlTransformAuthoringSection } from './DvtSqlTransformAuthoringSection';
import { DvtSubstraitPilotAuthoringSection } from './DvtSubstraitPilotAuthoringSection';
import { DvtSubstraitInnerJoinAuthoringSection } from './DvtSubstraitInnerJoinAuthoringSection';
import { DvtSubstraitUnionAllAuthoringSection } from './DvtSubstraitUnionAllAuthoringSection';
import { DvtVisualTransformRecipeAuthoringSection } from './DvtVisualTransformRecipeAuthoringSection';

type DvtAuthoringFieldsProps = Readonly<{
  node: CanonicalNode;
  nodes?: readonly CanonicalNode[];
  edges?: readonly CanonicalEdge[];
  disabled: boolean;
  draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
  errors: ReturnType<typeof validateCanvasInspectorNodeDraft>;
  section?: 'all' | 'general' | 'columns' | 'code';
  onChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
}>;

function formatQualifiedTarget(parts: readonly string[]): string {
  const normalizedParts = parts.map((part) => part.trim()).filter((part) => part.length > 0);
  return normalizedParts.length > 0 ? normalizedParts.join('.') : '-';
}

export function DvtAuthoringFields({
  node,
  nodes = [node],
  edges = [],
  disabled,
  draft,
  errors,
  section = 'all',
  onChange,
}: DvtAuthoringFieldsProps): JSX.Element | null {
  if (!draft.dvt) {
    return null;
  }

  const inheritedConnectionRef = resolveInheritedDvtConnectionRef({
    node,
    nodes,
    edges,
  });

  if (draft.dvt.kind === 'source') {
    if (section !== 'all' && section !== 'general') {
      return null;
    }

    return (
      <DvtSourceAuthoringSection
        node={node}
        disabled={disabled}
        draft={draft.dvt}
        errors={errors.dvt}
        sourceTarget={formatQualifiedTarget([draft.dvt.schema, draft.dvt.table])}
        onChange={onChange}
      />
    );
  }

  if (draft.dvt.kind === 'transform') {
    if (draft.dvt.mode === DVT_TRANSFORM_AUTHORING_MODE.substrait) {
      if (section !== 'all' && section !== 'columns' && section !== 'code') {
        return null;
      }
      if (draft.dvt.shape === 'inner_join') {
        const appendCandidates = resolveDvtSubstraitJoinAppendCandidates({
          targetNode: node,
          nodes,
          edges,
          draft: { plan: draft.dvt.plan, sidecar: draft.dvt.sidecar },
        });
        return (
          <DvtSubstraitInnerJoinAuthoringSection
            disabled={disabled}
            draft={draft.dvt}
            appendCandidates={appendCandidates}
            onChange={onChange}
          />
        );
      }
      if (draft.dvt.shape === 'union_all') {
        return (
          <DvtSubstraitUnionAllAuthoringSection
            disabled={disabled}
            draft={draft.dvt}
            onChange={onChange}
          />
        );
      }
      return (
        <DvtSubstraitPilotAuthoringSection
          disabled={disabled}
          draft={draft.dvt}
          onChange={onChange}
        />
      );
    }

    if (draft.dvt.mode === DVT_TRANSFORM_AUTHORING_MODE.visual) {
      if (section !== 'all' && section !== 'columns') {
        return null;
      }
      return (
        <DvtVisualTransformRecipeAuthoringSection
          node={node}
          nodes={nodes}
          edges={edges}
          disabled={disabled}
          draft={draft.dvt}
          error={errors.dvt?.recipe}
          onChange={onChange}
        />
      );
    }

    if (section !== 'all' && section !== 'code') {
      return null;
    }

    const pilotSourceId =
      draft.dvt.sql.trim().length === 0
        ? resolveDvtSubstraitPilotEntry({ targetNode: node, nodes, edges })
        : null;
    const innerJoinEntry =
      draft.dvt.sql.trim().length === 0
        ? resolveDvtSubstraitInnerJoinEntry({ targetNode: node, nodes, edges })
        : null;
    const unionAllEntry =
      draft.dvt.sql.trim().length === 0
        ? resolveDvtSubstraitUnionAllEntry({ targetNode: node, nodes, edges })
        : null;
    return (
      <DvtSqlTransformAuthoringSection
        node={node}
        disabled={disabled}
        draft={draft.dvt}
        errors={errors.dvt}
        section={section === 'code' ? 'code' : 'all'}
        inheritedConnectionRef={inheritedConnectionRef}
        onStartSubstraitPilot={
          pilotSourceId == null
            ? undefined
            : () =>
                onChange((currentDraft) => {
                  if (
                    currentDraft.dvt?.kind !== 'transform' ||
                    currentDraft.dvt.mode !== DVT_TRANSFORM_AUTHORING_MODE.sql ||
                    currentDraft.dvt.sql.trim().length > 0
                  ) {
                    return currentDraft;
                  }
                  const pilot = createDvtSubstraitPilotDraft({
                    sourceNodeId: pilotSourceId,
                    targetNodeId: node.id,
                  });
                  return {
                    ...currentDraft,
                    dvt: {
                      kind: 'transform',
                      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
                      shape: 'pilot',
                      plan: pilot.plan,
                      sidecar: pilot.sidecar,
                    },
                  };
                })
        }
        substraitInnerJoinSummary={
          innerJoinEntry == null
            ? undefined
            : `${innerJoinEntry.left.table} + ${innerJoinEntry.right.table} · customer_id`
        }
        onStartSubstraitInnerJoin={
          innerJoinEntry == null
            ? undefined
            : () =>
                onChange((currentDraft) => {
                  if (
                    currentDraft.dvt?.kind !== 'transform' ||
                    currentDraft.dvt.mode !== DVT_TRANSFORM_AUTHORING_MODE.sql ||
                    currentDraft.dvt.sql.trim().length > 0
                  ) {
                    return currentDraft;
                  }
                  const join = createDvtSubstraitInnerJoinDraft(innerJoinEntry);
                  return {
                    ...currentDraft,
                    dvt: {
                      kind: 'transform',
                      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
                      shape: 'inner_join',
                      plan: join.plan,
                      sidecar: join.sidecar,
                    },
                  };
                })
        }
        substraitUnionAllSummary={
          unionAllEntry == null
            ? undefined
            : `${unionAllEntry.inputs[0].table} + ${unionAllEntry.inputs[1].table} · ${unionAllEntry.inputs[0].fields.length} fields`
        }
        onStartSubstraitUnionAll={
          unionAllEntry == null
            ? undefined
            : () =>
                onChange((currentDraft) => {
                  if (
                    currentDraft.dvt?.kind !== 'transform' ||
                    currentDraft.dvt.mode !== DVT_TRANSFORM_AUTHORING_MODE.sql ||
                    currentDraft.dvt.sql.trim().length > 0
                  ) {
                    return currentDraft;
                  }
                  const unionAll = createDvtSubstraitUnionAllDraft(unionAllEntry);
                  return {
                    ...currentDraft,
                    dvt: {
                      kind: 'transform',
                      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
                      shape: 'union_all',
                      plan: unionAll.plan,
                      sidecar: unionAll.sidecar,
                    },
                  };
                })
        }
        onChange={onChange}
      />
    );
  }

  if (section !== 'all' && section !== 'general') {
    return null;
  }

  return (
    <DvtSinkAuthoringSection
      node={node}
      disabled={disabled}
      draft={draft.dvt}
      errors={errors.dvt}
      destinationTarget={formatQualifiedTarget([draft.dvt.schema, draft.dvt.table])}
      inheritedConnectionId={inheritedConnectionRef?.connectionId}
      onChange={onChange}
    />
  );
}
