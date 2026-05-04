/**
 * Owned concern: define protected runtime command/query rail data shapes and
 * construction helpers.
 */

export type ProtectedRuntimeRailKind = 'command' | 'query';

export type ProtectedRuntimeNegativeCoverage = {
  readonly case: string;
  readonly testRefs: readonly string[];
};

export type ProtectedRuntimeCompatibilityPosture =
  | {
      readonly status: 'canonical';
      readonly legacyAccepted: false;
    }
  | {
      readonly status: 'compatibility';
      readonly legacyAccepted: false;
      readonly compatibilityCase: string;
      readonly canonicalRail: string;
      readonly policy: string;
      readonly removalRequires: string;
    };

export type ProtectedRuntimeCommandQueryRail = {
  readonly name: string;
  readonly kind: ProtectedRuntimeRailKind;
  readonly boundedContext: string;
  readonly dddObject: string;
  readonly applicationPort: string;
  readonly adapterSurface: string;
  readonly scopeAndAuthorization: string;
  readonly negativeTests: readonly string[];
  readonly negativeCoverage: readonly ProtectedRuntimeNegativeCoverage[];
  readonly compatibilityPosture: ProtectedRuntimeCompatibilityPosture;
};

export type RailInput = Omit<
  ProtectedRuntimeCommandQueryRail,
  'negativeTests' | 'negativeCoverage' | 'compatibilityPosture'
> & {
  readonly coverage: readonly (readonly [string, string | readonly string[]])[];
  readonly compatibilityPosture?: ProtectedRuntimeCompatibilityPosture;
};

const CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE = {
  status: 'canonical',
  legacyAccepted: false,
} as const satisfies ProtectedRuntimeCompatibilityPosture;

function normalizeTestRefs(testRefs: string | readonly string[]): readonly string[] {
  return typeof testRefs === 'string' ? [testRefs] : testRefs;
}

export function defineProtectedRuntimeRail(input: RailInput): ProtectedRuntimeCommandQueryRail {
  return {
    ...input,
    negativeTests: input.coverage.map(([negativeCase]) => negativeCase),
    negativeCoverage: input.coverage.map(([negativeCase, testRefs]) => ({
      case: negativeCase,
      testRefs: normalizeTestRefs(testRefs),
    })),
    compatibilityPosture: input.compatibilityPosture ?? CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
  };
}
