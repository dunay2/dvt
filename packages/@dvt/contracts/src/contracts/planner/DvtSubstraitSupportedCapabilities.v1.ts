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
  type DvtSubstraitFunctionInvocationV1,
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
  readonly targetConformance: readonly Pick<
    DvtSubstraitStandardAdmissionEvidenceV1['targetConformance'][number],
    'targetId' | 'status'
  >[];
  readonly visualExposure:
    | { readonly status: 'exposed' }
    | Extract<DvtSubstraitStandardAdmissionEvidenceV1['visualExposure'], { status: 'not-exposed' }>;
  readonly invocationByEntryId?: Readonly<Record<string, DvtSubstraitFunctionInvocationV1>>;
  readonly overloadsByEntryId?: Readonly<
    Record<string, readonly DvtSubstraitFunctionInvocationV1[]>
  >;
}

const LOWER_ID = functionId('scalar-function', 'functions_string', 'lower');
const CONCAT_ID = functionId('scalar-function', 'functions_string', 'concat');
const CONCAT_WS_ID = functionId('scalar-function', 'functions_string', 'concat_ws');
const COALESCE_ID = functionId('scalar-function', 'functions_comparison', 'coalesce');
const EXTRACT_ID = functionId('scalar-function', 'functions_datetime', 'extract');
const DIVIDE_ID = functionId('scalar-function', 'functions_arithmetic', 'divide');
const SUM_ID = functionId('aggregate-function', 'functions_arithmetic', 'sum');
const SUPPORTED_CAPABILITY_GROUPS: readonly SupportedCapabilityGroup[] = [
  {
    entryIds: [SUM_ID],
    useCaseRefs: ['dvt:#3456'],
    proofRef: 'apps/api/test/integration/dvtSumSql.integration.test.ts',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
    overloadsByEntryId: {
      [SUM_ID]: ['i64', 'fp64'].map((type) => ({
        signature: `sum:${type}`,
        argumentTypes: [type],
        minimumArgumentCount: 1,
        maximumArgumentCount: 1,
        outputType: type,
        options: [{ name: 'overflow', preference: ['ERROR'] }],
      })),
    },
  },
  {
    entryIds: [CONCAT_WS_ID],
    useCaseRefs: ['dvt:#3456'],
    proofRef: 'apps/api/test/integration/dvtScalarSql.integration.test.ts',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
    invocationByEntryId: {
      [CONCAT_WS_ID]: {
        signature: 'concat_ws:str_str',
        argumentTypes: ['str', 'str'],
        minimumArgumentCount: 2,
        outputType: 'str',
        options: [],
      },
    },
  },
  {
    entryIds: [DIVIDE_ID],
    useCaseRefs: ['dvt:#3434'],
    proofRef: 'docs/evidence/ED-20260928-transform-bigint-divide.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
    invocationByEntryId: {
      [DIVIDE_ID]: {
        signature: 'divide:i64_i64',
        argumentTypes: ['i64', 'i64'],
        minimumArgumentCount: 2,
        maximumArgumentCount: 2,
        outputType: 'i64',
        options: [
          { name: 'overflow', preference: ['ERROR'] },
          { name: 'on_domain_error', preference: ['ERROR'] },
          { name: 'on_division_by_zero', preference: ['ERROR'] },
        ],
      },
    },
  },
  ...['add', 'subtract', 'multiply'].map((name): SupportedCapabilityGroup => ({
    entryIds: [functionId('scalar-function', 'functions_arithmetic', name)],
    useCaseRefs: ['dvt:#3419'],
    proofRef: 'packages/@dvt/postgres-projection/test/relationalArithmetic.test.ts',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
    overloadsByEntryId: {
      [functionId('scalar-function', 'functions_arithmetic', name)]: ['i64', 'fp64'].map(
        (type) => ({
          signature: `${name}:${type}_${type}`,
          argumentTypes: [type, type],
          minimumArgumentCount: 2,
          maximumArgumentCount: 2,
          outputType: type,
          options:
            type === 'i64'
              ? [{ name: 'overflow', preference: ['ERROR'] }]
              : [{ name: 'rounding', preference: ['TIE_TO_EVEN'] }],
        })
      ),
    },
  })),
  {
    entryIds: [
      functionId('scalar-function', 'functions_comparison', 'is_null'),
      functionId('scalar-function', 'functions_comparison', 'is_not_null'),
    ],
    useCaseRefs: ['dvt:#3135'],
    proofRef: 'docs/evidence/ED-20260913-join-null-predicates.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
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
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [LOWER_ID],
    useCaseRefs: ['dvt:#2598', 'dvt:#2827'],
    proofRef: 'docs/evidence/ED-20260902-transform-function-alias-authoring.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [CONCAT_ID],
    useCaseRefs: ['dvt:#2642', 'dvt:#2921'],
    proofRef: 'docs/evidence/ED-20260908-algebraic-derived-output.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
    invocationByEntryId: {
      [CONCAT_ID]: {
        signature: 'concat:str',
        argumentTypes: ['str'],
        minimumArgumentCount: 2,
        maximumArgumentCount: 2,
        outputType: 'str',
        options: [{ name: 'null_handling', preference: ['ACCEPT_NULLS'] }],
      },
    },
  },
  {
    entryIds: [COALESCE_ID],
    useCaseRefs: ['dvt:#2935'],
    proofRef: 'docs/evidence/ED-20260911-substrait-coalesce-variadic-admission.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
    invocationByEntryId: {
      [COALESCE_ID]: {
        signature: 'coalesce:any1',
        argumentTypes: ['any1'],
        minimumArgumentCount: 2,
        outputType: 'any1',
        options: [],
      },
    },
  },
  {
    entryIds: [
      EXTRACT_ID,
      standardId('type', 'substrait.Type', 'kind.precision_timestamp_tz'),
      standardId('type', 'substrait.Type', 'kind.i64'),
    ],
    useCaseRefs: ['dvt:#2935', 'dvt:#3101'],
    proofRef: 'docs/evidence/ED-20260910-timestamp-column-function.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
    invocationByEntryId: {
      [EXTRACT_ID]: {
        signature: 'extract:req_ptstz_str',
        argumentTypes: ['req', 'ptstz', 'str'],
        minimumArgumentCount: 3,
        maximumArgumentCount: 3,
        outputType: 'i64',
        options: [],
      },
    },
  },
  {
    entryIds: [standardId('relation', 'substrait.FilterRel')],
    useCaseRefs: ['dvt:#2642', 'dvt:#2894'],
    proofRef: 'docs/evidence/ED-20260903-source-filter-capability-admission.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [
      functionId('scalar-function', 'functions_boolean', 'and'),
      functionId('scalar-function', 'functions_boolean', 'or'),
      functionId('scalar-function', 'functions_comparison', 'not_equal'),
      functionId('scalar-function', 'functions_comparison', 'gt'),
      functionId('scalar-function', 'functions_comparison', 'gte'),
      functionId('scalar-function', 'functions_comparison', 'lt'),
      functionId('scalar-function', 'functions_comparison', 'lte'),
    ],
    useCaseRefs: ['dvt:#3087'],
    proofRef: 'apps/web/src/app/views/canvas/canvasSelectedJoinConditionPersistence.test.ts',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [
      standardId('relation', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_INNER'),
      functionId('scalar-function', 'functions_comparison', 'equal'),
      standardId('type', 'substrait.Type', 'kind.bool'),
    ],
    useCaseRefs: ['dvt:#2634'],
    proofRef: 'docs/evidence/ED-20260826-vtx2-substrait-card-pilot.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [standardId('relation', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_LEFT')],
    useCaseRefs: ['dvt:#3307'],
    proofRef: 'docs/evidence/ED-20260919-left-join-end-to-end.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [
      standardId('relation', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_RIGHT'),
      standardId('relation', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_OUTER'),
    ],
    useCaseRefs: ['dvt:#3308'],
    proofRef: 'docs/evidence/ED-20260919-right-full-join-end-to-end.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [
      standardId('relation', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_LEFT_SEMI'),
      standardId('relation', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_LEFT_ANTI'),
      standardId('relation', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_RIGHT_SEMI'),
      standardId('relation', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_RIGHT_ANTI'),
    ],
    useCaseRefs: ['dvt:#3320'],
    proofRef: 'docs/evidence/ED-20260919-semi-anti-join-end-to-end.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [standardId('relation', 'substrait.CrossRel')],
    useCaseRefs: ['dvt:#3322'],
    proofRef: 'docs/evidence/ED-20260919-cross-join-end-to-end.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [
      standardId('relation', 'substrait.SortRel'),
      standardId('relation', 'substrait.FetchRel'),
    ],
    useCaseRefs: ['dvt:#3324'],
    proofRef: 'docs/evidence/ED-20260920-sort-fetch-end-to-end.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [
      standardId('relation', 'substrait.AggregateRel'),
      functionId('aggregate-function', 'functions_aggregate_generic', 'count'),
      standardId('type', 'substrait.Type', 'kind.i64'),
    ],
    useCaseRefs: ['dvt:#2641', 'dvt:#2642'],
    proofRef: 'docs/evidence/ED-20260831-vtx2-substrait-grouping.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [standardId('type', 'substrait.Type', 'kind.fp64')],
    useCaseRefs: ['dvt:semantic-workbench-lab'],
    proofRef: 'apps/web/src/app/labs/semanticWorkbenchFixture.test.ts',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [
      standardId('expression-form', 'substrait.Expression', 'rex_type.window_function'),
      functionId('window-function', 'functions_arithmetic', 'row_number'),
    ],
    useCaseRefs: ['dvt:#2641', 'dvt:#2642'],
    proofRef: 'docs/evidence/ED-20260831-vtx2-substrait-row-number-window.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [
      standardId('expression-form', 'substrait.Expression', 'rex_type.literal'),
      standardId('type', 'substrait.Type', 'kind.precision_timestamp_tz'),
    ],
    useCaseRefs: ['dvt:#2833'],
    proofRef: 'docs/evidence/ED-20260902-canvas-calculated-column-authoring.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [standardId('relation', 'substrait.SetRel', 'SetOp.SET_OP_UNION_ALL')],
    useCaseRefs: ['dvt:#2634'],
    proofRef: 'docs/evidence/ED-20260831-vtx2-substrait-union-all.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [standardId('relation', 'substrait.SetRel', 'SetOp.SET_OP_UNION_DISTINCT')],
    useCaseRefs: ['dvt:#3317'],
    proofRef: 'docs/evidence/ED-20260919-union-distinct-end-to-end.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [
      standardId('relation', 'substrait.SetRel', 'SetOp.SET_OP_INTERSECTION_MULTISET'),
      standardId('relation', 'substrait.SetRel', 'SetOp.SET_OP_MINUS_PRIMARY'),
    ],
    useCaseRefs: ['dvt:#3318'],
    proofRef: 'docs/evidence/ED-20260920-intersect-except-distinct-end-to-end.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [
      standardId('relation', 'substrait.SetRel', 'SetOp.SET_OP_INTERSECTION_MULTISET_ALL'),
      standardId('relation', 'substrait.SetRel', 'SetOp.SET_OP_MINUS_PRIMARY_ALL'),
    ],
    useCaseRefs: ['dvt:#3319'],
    proofRef: 'docs/evidence/ED-20260920-intersect-except-all-end-to-end.md',
    targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
    visualExposure: { status: 'exposed' },
  },
  {
    entryIds: [
      standardId('type', 'substrait.Type', 'kind.struct'),
      standardId('expression-form', 'substrait.Expression', 'rex_type.nested'),
    ],
    useCaseRefs: ['dvt:#2771'],
    proofRef: 'packages/@dvt/contracts/test/dvt-substrait-struct-capability.contract.test.ts',
    targetConformance: [{ targetId: 'postgres', status: 'unavailable' }],
    visualExposure: {
      status: 'not-exposed',
      rationale: 'Structured projection is unavailable until the governed vertical slice.',
    },
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
    targetConformance: group.targetConformance.map((target) => ({
      ...target,
      evidenceRefs: [group.proofRef],
    })),
    visualExposure:
      group.visualExposure.status === 'exposed'
        ? { status: 'exposed', evidenceRefs: [group.proofRef] }
        : group.visualExposure,
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
          ...(group.overloadsByEntryId?.[entry.entryId] == null
            ? {}
            : { overloads: group.overloadsByEntryId[entry.entryId] }),
          ...(group.invocationByEntryId?.[entry.entryId] === undefined
            ? {}
            : { invocation: group.invocationByEntryId[entry.entryId] }),
        });
  });
}
