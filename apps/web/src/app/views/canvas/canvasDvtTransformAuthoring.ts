/** Owns decoding and persistence of canonical DVT Transform shapes. */
import { DVT_TRANSFORM_AUTHORING_MODE, DvtTransformResultTargetV1Schema } from '@dvt/contracts';
import { inspectDvtSubstraitAcceptedCrossDraft } from '@dvt/postgres-projection';

import type { CanonicalNode } from '../../types/canonical';
import type {
  DvtNodeAuthoringMetadataErrors,
  DvtSubstraitTransformAuthoringMetadata,
  DvtUninitializedTransformAuthoringMetadata,
} from './canvasDvtAuthoringTypes';
import { inspectDvtSubstraitPilotAggregationDraft } from './canvasDvtSubstraitAggregation';
import { inspectDvtSubstraitPilotAggregateWindowDraft } from './canvasDvtSubstraitAggregateWindow';
import {
  encodeDvtSubstraitJoinDocument,
  inspectDvtSubstraitJoinAcceptedDraft,
  inspectDvtSubstraitJoinPredicateContext,
} from './canvasDvtSubstraitJoinComposition';
import {
  encodeDvtSubstraitPilotDocument,
  inspectDvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import {
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  encodeDvtSubstraitUnionAllDocument,
  resolveDvtSubstraitSetOperation,
} from './canvasDvtSubstraitSetComposition';
import {
  normalizeDvtIdentifier,
  readDvtNodeConfig,
  readDvtString,
  withDvtConfig,
} from './canvasDvtSourceAuthoring';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { peelCanvasDvtSubstraitSortFetch } from './canvasDvtSubstraitSortFetch';
import { inspectDvtSubstraitPilotWindowDraft } from './canvasDvtSubstraitWindow';
import {
  encodeDvtSubstraitFilterDocument,
  inspectDvtSubstraitFilter,
} from './canvasDvtSubstraitFilter';
import { canvasJoinOperationForType, isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import { isCanvasSetOperation } from './canvasRelationalOperationChoices';
import { encodeDvtSubstraitCrossDocument } from './canvasDvtSubstraitCrossComposition';

type TransformMetadata =
  DvtUninitializedTransformAuthoringMetadata | DvtSubstraitTransformAuthoringMetadata;

const DEFAULT_MATERIALIZATION = 'view';
const VALID_MATERIALIZATIONS = new Set(['table', 'view']);

function normalizeMaterialized(value: string | undefined): string {
  const normalized = normalizeDvtIdentifier(value, DEFAULT_MATERIALIZATION);
  return VALID_MATERIALIZATIONS.has(normalized) ? normalized : DEFAULT_MATERIALIZATION;
}

function readMaterialized(node: CanonicalNode): string {
  return normalizeMaterialized(readDvtString(readDvtNodeConfig(node).materialized));
}

export function resolveDvtTransformAuthoringMetadata(
  node: CanonicalNode
):
  | Readonly<{ outcome: 'resolved'; metadata: TransformMetadata }>
  | Readonly<{ outcome: 'rejected'; reason: 'invalid_document' | 'unsupported_shape' }> {
  const config = readDvtNodeConfig(node);
  const disposition = {
    materialized: readMaterialized(node),
    ...(Object.hasOwn(config, 'resultTarget')
      ? { resultTarget: DvtTransformResultTargetV1Schema.parse(config.resultTarget) }
      : {}),
  };
  let authority: ReturnType<typeof readDvtTransformAuthoringAuthority>;
  try {
    authority = readDvtTransformAuthoringAuthority(node);
  } catch {
    return { outcome: 'rejected', reason: 'invalid_document' };
  }
  if (authority == null) {
    return {
      outcome: 'resolved',
      metadata: { kind: 'transform', mode: 'uninitialized', ...disposition },
    };
  }
  let projection: ReturnType<typeof decodeDvtSubstraitProjectionDocument>;
  try {
    projection = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  } catch {
    return { outcome: 'rejected', reason: 'invalid_document' };
  }
  const classified = peelCanvasDvtSubstraitSortFetch(projection).base;
  if (
    inspectDvtSubstraitProjectionDraft(classified).ok ||
    inspectDvtSubstraitFilter(classified) != null
  ) {
    return {
      outcome: 'resolved',
      metadata: fromDraft(authority.mode, disposition, 'projection', projection),
    };
  }
  const pilot = classified;
  if (
    inspectDvtSubstraitPilotDraft(pilot).ok ||
    inspectDvtSubstraitPilotAggregateWindowDraft(pilot).ok ||
    inspectDvtSubstraitPilotAggregationDraft(pilot).ok ||
    inspectDvtSubstraitPilotWindowDraft(pilot).ok
  ) {
    return {
      outcome: 'resolved',
      metadata: fromDraft(authority.mode, disposition, 'pilot', projection),
    };
  }
  const join = classified;
  if (inspectDvtSubstraitJoinAcceptedDraft(join).ok) {
    const finalJoinType =
      inspectDvtSubstraitJoinPredicateContext(join)?.inspection.projection.joinRelations.at(
        -1
      )?.joinType;
    const operation = finalJoinType == null ? null : canvasJoinOperationForType(finalJoinType);
    if (!isCanvasJoinOperation(operation))
      return { outcome: 'rejected', reason: 'unsupported_shape' };
    return {
      outcome: 'resolved',
      metadata: fromDraft(authority.mode, disposition, operation, projection),
    };
  }
  if (inspectDvtSubstraitAcceptedCrossDraft(join).ok) {
    return {
      outcome: 'resolved',
      metadata: fromDraft(authority.mode, disposition, 'cross_join', projection),
    };
  }
  const setDraft = classified;
  const setOperation = resolveDvtSubstraitSetOperation(setDraft);
  if (setOperation == null) return { outcome: 'rejected', reason: 'unsupported_shape' };
  return {
    outcome: 'resolved',
    metadata: fromDraft(authority.mode, disposition, setOperation, projection),
  };
}

export function createDvtTransformAuthoringMetadata(node: CanonicalNode): TransformMetadata {
  const resolution = resolveDvtTransformAuthoringMetadata(node);
  if (resolution.outcome === 'resolved') return resolution.metadata;
  throw new Error(
    resolution.reason === 'invalid_document'
      ? 'Invalid canonical Substrait document.'
      : 'Unsupported canonical Substrait relation shape.'
  );
}

function fromDraft(
  mode: typeof DVT_TRANSFORM_AUTHORING_MODE.substrait,
  disposition: Pick<TransformMetadata, 'materialized' | 'resultTarget'>,
  shape: DvtSubstraitTransformAuthoringMetadata['shape'],
  draft: Pick<DvtSubstraitTransformAuthoringMetadata, 'plan' | 'sidecar'>
): DvtSubstraitTransformAuthoringMetadata {
  return {
    kind: 'transform',
    mode,
    ...disposition,
    shape,
    plan: draft.plan,
    sidecar: draft.sidecar,
  };
}

export function validateDvtTransformAuthoringMetadata(
  metadata: TransformMetadata
): DvtNodeAuthoringMetadataErrors {
  const errors: DvtNodeAuthoringMetadataErrors = VALID_MATERIALIZATIONS.has(
    metadata.materialized.trim()
  )
    ? {}
    : { materialization: 'dvt_materialization_invalid' };
  if (metadata.resultTarget != null) {
    const target = DvtTransformResultTargetV1Schema.safeParse(metadata.resultTarget);
    if (!target.success) {
      for (const issue of target.error.issues) {
        if (issue.path[0] === 'schema') errors.schema = 'dvt_identifier_invalid';
        else if (issue.path[0] === 'relation') errors.table = 'dvt_identifier_invalid';
        else errors.connectionRef = 'dvt_connection_required';
      }
    }
  }
  return errors;
}

export function applyDvtTransformAuthoringMetadata(
  node: CanonicalNode,
  metadata: TransformMetadata
): CanonicalNode {
  const materialized = metadata.materialized.trim();
  if (Object.keys(validateDvtTransformAuthoringMetadata(metadata)).length > 0) return node;
  const withMaterialization = (updatedNode: CanonicalNode): CanonicalNode => {
    const config = { ...readDvtNodeConfig(updatedNode), materialized } as Record<string, unknown>;
    if (metadata.resultTarget === null) delete config.resultTarget;
    else if (metadata.resultTarget !== undefined) config.resultTarget = metadata.resultTarget;
    return withDvtConfig(updatedNode, config);
  };
  if (metadata.mode === 'uninitialized') return withMaterialization(node);
  const draft = { plan: metadata.plan, sidecar: metadata.sidecar };
  const sortFetchChain = peelCanvasDvtSubstraitSortFetch(draft);
  const baseDraft = sortFetchChain.base;
  const baseDocument =
    metadata.shape === 'projection'
      ? inspectDvtSubstraitFilter(baseDraft) == null
        ? encodeDvtSubstraitProjectionDocument(baseDraft)
        : encodeDvtSubstraitFilterDocument(baseDraft)
      : isCanvasJoinOperation(metadata.shape)
        ? encodeDvtSubstraitJoinDocument(baseDraft)
        : metadata.shape === 'cross_join'
          ? encodeDvtSubstraitCrossDocument(baseDraft)
          : isCanvasSetOperation(metadata.shape)
            ? encodeDvtSubstraitUnionAllDocument(baseDraft)
            : encodeDvtSubstraitPilotDocument(baseDraft);
  const document =
    sortFetchChain.wrappers.length === 0 ? baseDocument : encodeDvtSubstraitSemanticDocument(draft);
  return withMaterialization(applyDvtSubstraitSemanticDocument(node, document));
}
