/** Owns decoding and persistence of canonical DVT Transform shapes. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import type {
  DvtSubstraitTransformAuthoringMetadata,
  DvtUninitializedTransformAuthoringMetadata,
} from './canvasDvtAuthoringTypes';
import { inspectDvtSubstraitPilotAggregationDraft } from './canvasDvtSubstraitAggregation';
import { inspectDvtSubstraitPilotAggregateWindowDraft } from './canvasDvtSubstraitAggregateWindow';
import {
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinAcceptedDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  decodeDvtSubstraitPilotDocument,
  encodeDvtSubstraitPilotDocument,
  inspectDvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import {
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitUnionAllDocument,
  encodeDvtSubstraitUnionAllDocument,
} from './canvasDvtSubstraitSetComposition';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import { inspectDvtSubstraitPilotWindowDraft } from './canvasDvtSubstraitWindow';
import {
  encodeDvtSubstraitFilterDocument,
  inspectDvtSubstraitFilter,
} from './canvasDvtSubstraitFilter';

type TransformMetadata =
  DvtUninitializedTransformAuthoringMetadata | DvtSubstraitTransformAuthoringMetadata;

export function createDvtTransformAuthoringMetadata(node: CanonicalNode): TransformMetadata {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) return { kind: 'transform', mode: 'uninitialized' };
  const projection = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  if (
    inspectDvtSubstraitProjectionDraft(projection).ok ||
    inspectDvtSubstraitFilter(projection) != null
  ) {
    return fromDraft(authority.mode, 'projection', projection);
  }
  const pilot = decodeDvtSubstraitPilotDocument(authority.semanticDocument);
  if (
    inspectDvtSubstraitPilotDraft(pilot).ok ||
    inspectDvtSubstraitPilotAggregateWindowDraft(pilot).ok ||
    inspectDvtSubstraitPilotAggregationDraft(pilot).ok ||
    inspectDvtSubstraitPilotWindowDraft(pilot).ok
  ) {
    return fromDraft(authority.mode, 'pilot', pilot);
  }
  const join = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
  if (inspectDvtSubstraitInnerJoinAcceptedDraft(join).ok) {
    return fromDraft(authority.mode, 'inner_join', join);
  }
  const unionAll = decodeDvtSubstraitUnionAllDocument(authority.semanticDocument);
  return fromDraft(authority.mode, 'union_all', unionAll);
}

function fromDraft(
  mode: typeof DVT_TRANSFORM_AUTHORING_MODE.substrait,
  shape: DvtSubstraitTransformAuthoringMetadata['shape'],
  draft: Pick<DvtSubstraitTransformAuthoringMetadata, 'plan' | 'sidecar'>
): DvtSubstraitTransformAuthoringMetadata {
  return { kind: 'transform', mode, shape, plan: draft.plan, sidecar: draft.sidecar };
}

export function applyDvtTransformAuthoringMetadata(
  node: CanonicalNode,
  metadata: TransformMetadata
): CanonicalNode {
  if (metadata.mode === 'uninitialized') return node;
  const draft = { plan: metadata.plan, sidecar: metadata.sidecar };
  const document =
    metadata.shape === 'projection'
      ? inspectDvtSubstraitFilter(draft) == null
        ? encodeDvtSubstraitProjectionDocument(draft)
        : encodeDvtSubstraitFilterDocument(draft)
      : metadata.shape === 'inner_join'
        ? encodeDvtSubstraitInnerJoinDocument(draft)
        : metadata.shape === 'union_all'
          ? encodeDvtSubstraitUnionAllDocument(draft)
          : encodeDvtSubstraitPilotDocument(draft);
  return applyDvtSubstraitSemanticDocument(node, document);
}
