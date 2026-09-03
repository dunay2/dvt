/**
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Attach typed evidence from one admission-group collection.
 * @consequence No ID-set switch or parallel supported-capability registry remains.
 * @version 1.0.0
 */
import {
  DvtSubstraitStandardAdmissionEvidenceV1Schema,
  type DvtSubstraitStandardAdmissionEvidenceV1,
} from './DvtSubstraitCapabilityAdmission.v1.js';
import {
  DvtSubstraitStandardCapabilityV1Schema,
  type DvtSubstraitStandardCapabilityV1,
} from './DvtSubstraitCapabilityCatalogSchema.v1.js';
import {
  buildDvtSubstraitStandardCapabilityId,
  type DvtSubstraitCapabilityCategory,
} from './DvtSubstraitCapabilityIdentity.v1.js';

const standardId = (
  category: DvtSubstraitCapabilityCategory,
  message: string,
  selector?: string
): string =>
  buildDvtSubstraitStandardCapabilityId(category, {
    sourceKind: 'core',
    message,
    ...(selector ? { selector } : {}),
  });
const functionId = (
  category: 'scalar-function' | 'aggregate-function' | 'window-function',
  family: string,
  name: string
): string =>
  buildDvtSubstraitStandardCapabilityId(category, {
    sourceKind: 'simple-extension',
    urn: `extension:io.substrait:${family}`,
    name,
  });

interface SupportedCapabilityGroup {
  readonly entryIds: readonly string[];
  readonly useCaseRefs: readonly string[];
  readonly proofRef: string;
  readonly targetStatus?: 'unavailable' | 'mapped' | 'provider-accepted';
  readonly visualExposure?: 'not-exposed' | 'exposed';
}

const LOWER_ID = functionId('scalar-function', 'functions_string', 'lower');
const SUPPORTED_CAPABILITY_GROUPS: readonly SupportedCapabilityGroup[] = [
  {
    entryIds: [
      standardId('relation', 'substrait.ReadRel', 'read_type.named_table'),
      standardId('relation', 'substrait.RelCommon', 'emit_kind.emit'),
      standardId('relation', 'substrait.ProjectRel'),
      standardId('expression-form', 'substrait.Expression', 'rex_type.selection'),
      standardId('expression-form', 'substrait.Expression', 'rex_type.scalar_function'),
      standardId('type', 'substrait.Type', 'kind.string'),
      functionId('scalar-function', 'functions_string', 'trim'),
      functionId('scalar-function', 'functions_string', 'upper'),
    ],
    useCaseRefs: ['dvt:#2598'],
    proofRef: 'docs/evidence/ED-20260826-vtx2-substrait-card-pilot.md',
  },
  {
    entryIds: [LOWER_ID],
    useCaseRefs: ['dvt:#2598', 'dvt:#2827'],
    proofRef: 'docs/evidence/ED-20260902-transform-function-alias-authoring.md',
  },
  {
    entryIds: [
      standardId('relation', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_INNER'),
      functionId('scalar-function', 'functions_comparison', 'equal'),
      standardId('type', 'substrait.Type', 'kind.bool'),
    ],
    useCaseRefs: ['dvt:#2634'],
    proofRef: 'docs/evidence/ED-20260826-vtx2-substrait-card-pilot.md',
  },
  {
    entryIds: [
      standardId('relation', 'substrait.AggregateRel'),
      functionId('aggregate-function', 'functions_aggregate_generic', 'count'),
      standardId('type', 'substrait.Type', 'kind.i64'),
    ],
    useCaseRefs: ['dvt:#2641', 'dvt:#2642'],
    proofRef: 'docs/evidence/ED-20260831-vtx2-substrait-grouping.md',
  },
  {
    entryIds: [
      standardId('expression-form', 'substrait.Expression', 'rex_type.window_function'),
      functionId('window-function', 'functions_arithmetic', 'row_number'),
    ],
    useCaseRefs: ['dvt:#2641', 'dvt:#2642'],
    proofRef: 'docs/evidence/ED-20260831-vtx2-substrait-row-number-window.md',
  },
  {
    entryIds: [
      standardId('expression-form', 'substrait.Expression', 'rex_type.literal'),
      standardId('type', 'substrait.Type', 'kind.precision_timestamp_tz'),
    ],
    useCaseRefs: ['dvt:#2833'],
    proofRef: 'docs/evidence/ED-20260902-canvas-calculated-column-authoring.md',
  },
  {
    entryIds: [standardId('relation', 'substrait.SetRel', 'SetOp.SET_OP_UNION_ALL')],
    useCaseRefs: ['dvt:#2634'],
    proofRef: 'docs/evidence/ED-20260831-vtx2-substrait-union-all.md',
  },
  {
    entryIds: [standardId('type', 'substrait.Type', 'kind.struct')],
    useCaseRefs: ['dvt:#2771'],
    proofRef: 'packages/@dvt/contracts/test/dvt-substrait-struct-capability.contract.test.ts',
    targetStatus: 'unavailable',
    visualExposure: 'not-exposed',
  },
];

function admissionFor(
  entry: DvtSubstraitStandardCapabilityV1,
  group: SupportedCapabilityGroup
): DvtSubstraitStandardAdmissionEvidenceV1 {
  const identityRef = entry.evidenceRefs.find((reference) => reference.startsWith('substrait:'));
  if (identityRef === undefined) throw new Error(`Missing standard evidence for ${entry.entryId}.`);
  return DvtSubstraitStandardAdmissionEvidenceV1Schema.parse({
    kind: 'standard-admission',
    productUseCaseRef: group.useCaseRefs[group.useCaseRefs.length - 1],
    standardIdentityRef: identityRef,
    canonicalFixtureRef: group.proofRef,
    semanticValidationRef: group.proofRef,
    negativeValidationRef: group.proofRef,
    stableIdentity: {
      status: 'proved',
      evidenceRefs: ['docs/evidence/ED-20260903-vtx2-durable-semantic-document.md'],
    },
    targetConformance: [
      {
        targetId: 'postgres',
        status: group.targetStatus ?? 'mapped',
        evidenceRefs: [group.proofRef],
      },
    ],
    visualExposure:
      group.visualExposure === 'not-exposed'
        ? {
            status: 'not-exposed',
            rationale: 'Structured projection is unavailable until the governed vertical slice.',
          }
        : { status: 'exposed', evidenceRefs: [group.proofRef] },
  });
}

export function admitDvtSubstraitStandardCandidatesV1(
  candidates: readonly DvtSubstraitStandardCapabilityV1[]
): DvtSubstraitStandardCapabilityV1[] {
  return candidates.map((entry) => {
    const group = SUPPORTED_CAPABILITY_GROUPS.find(({ entryIds }) =>
      entryIds.includes(entry.entryId)
    );
    return group === undefined
      ? entry
      : DvtSubstraitStandardCapabilityV1Schema.parse({
          ...entry,
          profileStatus: 'supported-profile',
          evidenceRefs: [...entry.evidenceRefs, ...group.useCaseRefs],
          admission: admissionFor(entry, group),
        });
  });
}
