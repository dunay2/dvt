import {
  parsePlanAdmissionFinding,
  type PlanAdmissionEvidence,
  type PlanAdmissionFindingSubject,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { buildPreviewSelectionRejection } from '../../../src/application/services/previewSelectionFinding.js';

const REQUEST_ID = 'request-2078';

describe('buildPreviewSelectionRejection', () => {
  it.each([
    ['authorized_scope_incomplete', 'REQUEST_AUTHORIZED_SCOPE'],
    ['dbt_project_preview_projection_unavailable', 'RETRY_PREVIEW'],
    ['dbt_project_selection_provenance_mismatch', 'REGENERATE_PREVIEW'],
    ['dbt_project_preview_provenance_stale', 'REGENERATE_PREVIEW'],
    ['dbt_project_graph_source_mismatch', 'REGENERATE_PREVIEW'],
    ['graph_source_selection_mismatch', 'REGENERATE_PREVIEW'],
    ['workspace_graph_draft_not_found', 'REGENERATE_PREVIEW'],
    ['workspace_graph_draft_unsupported_schema_version', 'REGENERATE_PREVIEW'],
    ['workspace_graph_draft_corrupt_payload', 'REGENERATE_PREVIEW'],
    ['dbt_project_selection_mode_unsupported', 'REDUCE_OR_REPAIR_SELECTION'],
    ['dbt_project_selected_resource_not_executable', 'REDUCE_OR_REPAIR_SELECTION'],
    ['dbt_project_dependency_gap', 'REDUCE_OR_REPAIR_SELECTION'],
    ['dependency_gap', 'REDUCE_OR_REPAIR_SELECTION'],
  ])('maps %s to the bounded remediation %s', (cause, remediationCode) => {
    const rejection = buildPreviewSelectionRejection({
      requestId: REQUEST_ID,
      cause,
      reason: 'Selection was rejected.',
    });

    expect(rejection).toMatchObject({
      code: 'REJECTED',
      cause,
      reason: 'Selection was rejected.',
      findings: [
        {
          phase: 'preview-selection',
          code: 'REJECTED',
          cause,
          requestId: REQUEST_ID,
          remediationCode,
        },
      ],
    });
    expect(parsePlanAdmissionFinding(rejection.findings[0])).toEqual(rejection.findings[0]);
    expect(JSON.stringify(rejection)).not.toMatch(/plan(Id|Version|Ref)/u);
  });

  it('canonicalizes subjects and evidence so repeated evaluation is byte-stable', () => {
    const subjects: readonly PlanAdmissionFindingSubject[] = [
      { kind: 'node', id: 'node-b' },
      { kind: 'node', id: 'node-a' },
      { kind: 'node', id: 'node-b' },
    ];
    const evidence: readonly PlanAdmissionEvidence[] = [
      { evidenceCode: 'selection_mode', observedValue: 'explicit' },
      { evidenceCode: 'dependency_present', observedValue: false, expectedValue: true },
    ];

    const first = buildPreviewSelectionRejection({
      requestId: REQUEST_ID,
      cause: 'dependency_gap',
      reason: 'Selection was rejected.',
      subjects,
      evidence,
    });
    const second = buildPreviewSelectionRejection({
      requestId: REQUEST_ID,
      cause: 'dependency_gap',
      reason: 'Selection was rejected.',
      subjects: [...subjects].reverse(),
      evidence: [...evidence].reverse(),
    });

    expect(second).toEqual(first);
    expect(first.findings[0].subjects).toHaveLength(3);
    expect(first.findings[0].evidence).toHaveLength(3);
  });
});
