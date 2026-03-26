export const DUPLICATE_RUN_PROBE_KIND = {
  notFound: 'not_found',
  foundRun: 'found_run',
  foundIntent: 'found_intent',
} as const;

export type DuplicateRunProbeResult =
  | { readonly kind: typeof DUPLICATE_RUN_PROBE_KIND.notFound }
  | { readonly kind: typeof DUPLICATE_RUN_PROBE_KIND.foundRun; readonly runId: string }
  | { readonly kind: typeof DUPLICATE_RUN_PROBE_KIND.foundIntent; readonly runId: string };

export interface DuplicateRunProbe {
  findExisting(tenantId: string, runId: string): Promise<DuplicateRunProbeResult>;
}
