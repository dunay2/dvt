export interface PlanRefAllowlist {
  allowedSchemes: ReadonlyArray<string>;
  allowedHosts?: ReadonlyArray<string>;
  allowedUriPrefixes?: ReadonlyArray<string>;
}
export declare class PlanRefPolicy {
  private readonly allowlist;
  constructor(allowlist: PlanRefAllowlist);
  validateOrThrow(uri: string): void;
}
//# sourceMappingURL=planRefPolicy.d.ts.map
