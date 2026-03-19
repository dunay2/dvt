export type DuplicateRunProbeResult =
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found_run'; readonly runId: string }
  | { readonly kind: 'found_intent'; readonly runId: string };

export interface DuplicateRunProbe {
  findExisting(tenantId: string, runId: string): Promise<DuplicateRunProbeResult>;
}
