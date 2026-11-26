/** Owned concern: validate complete discovered Vitest consumer witness structure. */
export type WebVitestImpactWitness = Readonly<{
  testFiles: readonly string[];
  sources: readonly Readonly<{ path: string; tests: readonly string[] }>[];
}>;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string');
}

function isImpactSource(value: unknown): value is WebVitestImpactWitness['sources'][number] {
  if (value === null || typeof value !== 'object') return false;
  return (
    'path' in value &&
    typeof value.path === 'string' &&
    'tests' in value &&
    isStringArray(value.tests)
  );
}

export function isCompleteWebVitestImpactWitness(value: unknown): value is WebVitestImpactWitness {
  if (value === null || typeof value !== 'object') return false;
  return (
    'testFiles' in value &&
    isStringArray(value.testFiles) &&
    'sources' in value &&
    Array.isArray(value.sources) &&
    value.sources.every(isImpactSource)
  );
}
