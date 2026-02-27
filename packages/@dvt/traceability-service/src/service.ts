/**
 * @file packages/@dvt/traceability-service/src/service.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.3 — Build manifest from scanned trace headers
 * @decision Section 4.4 — Enforce reverse coverage for Accepted ADR catalog
 * @decision Section 4.5 — Publish deterministic File/ADR/Module graph
 * @consequence A single orchestration entrypoint enforces governance deterministically in CI
 * @version 0.1.0
 * @date 2026-02-21
 */
import type {
  IAdrCatalog,
  IGraphPublisher,
  IManifestBuilder,
  ITraceHeaderScanner,
  ITraceabilityService,
  ITraceValidator,
} from './contracts.js';
import type { TraceabilityManifest, ValidationResult } from './types.js';

type TraceabilityDeps = {
  adrCatalog: IAdrCatalog;
  scanner: ITraceHeaderScanner;
  validator: ITraceValidator;
  manifestBuilder: IManifestBuilder;
  graphPublisher: IGraphPublisher;
};

export class TraceabilityService implements ITraceabilityService {
  constructor(private readonly deps: TraceabilityDeps) {}

  async validateAndPublish(input: {
    repoRoot: string;
    component: string;
    componentVersion: string;
    repoSha: string;
    includeGlobs: string[];
    excludeGlobs: string[];
    moduleName: string;
    modulePath: string;
    generated: string;
    publishGraph?: boolean;
    requireDecision?: boolean;
    failOnMissingVersion?: boolean;
  }): Promise<{ validation: ValidationResult; manifest?: TraceabilityManifest }> {
    const traces = await this.deps.scanner.scan({
      repoRoot: input.repoRoot,
      includeGlobs: input.includeGlobs,
      excludeGlobs: input.excludeGlobs,
    });

    const validation = await this.deps.validator.validate({
      traces,
      adrCatalog: this.deps.adrCatalog,
      ...(typeof input.requireDecision === 'boolean'
        ? { requireDecision: input.requireDecision }
        : {}),
      ...(typeof input.failOnMissingVersion === 'boolean'
        ? { failOnMissingVersion: input.failOnMissingVersion }
        : {}),
    });
    if (!validation.ok) return { validation };

    const accepted = await this.deps.adrCatalog.listAdrs('Accepted');
    const reverse = await this.deps.validator.validateReverseCoverage({
      traces,
      acceptedAdrs: accepted,
    });
    if (!reverse.ok) return { validation: reverse };

    const manifest = await this.deps.manifestBuilder.build({
      component: input.component,
      version: input.componentVersion,
      repoSha: input.repoSha,
      generated: input.generated,
      traces,
      adrCatalog: this.deps.adrCatalog,
    });

    if (input.publishGraph !== false) {
      await this.deps.graphPublisher.publish({
        moduleName: input.moduleName,
        modulePath: input.modulePath,
        traces,
        adrCatalog: this.deps.adrCatalog,
      });
    }

    return { validation: { ok: true, issues: [] }, manifest };
  }
}
