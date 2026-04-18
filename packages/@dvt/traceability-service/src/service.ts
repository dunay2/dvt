/**
 * @file packages/@dvt/traceability-service/src/service.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.3 - Build a manifest from scanned trace headers
 * @decision Section 4.4 - Enforce reverse coverage for the Accepted ADR catalog
 * @decision Section 4.5 - Emit deterministic manifest output as the canonical automation artifact
 * @consequence A single orchestration entrypoint enforces governance deterministically in CI
 * @version 0.1.0
 * @date 2026-02-21
 */
import type {
  IAdrCatalog,
  IManifestBuilder,
  ITraceHeaderScanner,
  ITraceabilityService,
  ITraceValidator,
} from './contracts.js';
import { filterValidationIssues } from './core/issue-baseline.js';
import type {
  TraceabilityManifest,
  ValidationIssueBaselineEntry,
  ValidationResult,
} from './types.js';

type TraceabilityDeps = {
  adrCatalog: IAdrCatalog;
  scanner: ITraceHeaderScanner;
  validator: ITraceValidator;
  manifestBuilder: IManifestBuilder;
};

export class TraceabilityService implements ITraceabilityService {
  constructor(private readonly deps: TraceabilityDeps) {}

  async validateAndBuildManifest(input: {
    repoRoot: string;
    component: string;
    componentVersion: string;
    repoSha: string;
    includeGlobs: string[];
    excludeGlobs: string[];
    generated: string;
    requireDecision?: boolean;
    failOnMissingVersion?: boolean;
    issueBaseline?: ValidationIssueBaselineEntry[];
  }): Promise<{ validation: ValidationResult; manifest?: TraceabilityManifest }> {
    const traces = await this.deps.scanner.scan({
      repoRoot: input.repoRoot,
      includeGlobs: input.includeGlobs,
      excludeGlobs: input.excludeGlobs,
    });

    const validation = filterValidationIssues(
      await this.deps.validator.validate({
        traces,
        adrCatalog: this.deps.adrCatalog,
        ...(typeof input.requireDecision === 'boolean'
          ? { requireDecision: input.requireDecision }
          : {}),
        ...(typeof input.failOnMissingVersion === 'boolean'
          ? { failOnMissingVersion: input.failOnMissingVersion }
          : {}),
      }),
      input.issueBaseline
    );
    if (!validation.ok) return { validation };

    const accepted = await this.deps.adrCatalog.listAdrs('Accepted');
    const reverse = filterValidationIssues(
      await this.deps.validator.validateReverseCoverage({
        traces,
        acceptedAdrs: accepted,
      }),
      input.issueBaseline
    );
    if (!reverse.ok) return { validation: reverse };

    const manifest = await this.deps.manifestBuilder.build({
      component: input.component,
      version: input.componentVersion,
      repoSha: input.repoSha,
      generated: input.generated,
      traces,
      adrCatalog: this.deps.adrCatalog,
    });

    return {
      validation: { ok: true, issues: [...validation.issues, ...reverse.issues] },
      manifest,
    };
  }
}
