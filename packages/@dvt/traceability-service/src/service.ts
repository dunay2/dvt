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
    requiredAdrs?: string[];
    publishGraph?: boolean;
  }): Promise<{ validation: ValidationResult; manifest?: TraceabilityManifest }> {
    const traces = await this.deps.scanner.scan({
      repoRoot: input.repoRoot,
      includeGlobs: input.includeGlobs,
      excludeGlobs: input.excludeGlobs,
    });

    const validation = await this.deps.validator.validate({
      traces,
      adrCatalog: this.deps.adrCatalog,
      ...(input.requiredAdrs ? { requiredAdrs: input.requiredAdrs } : {}),
    });
    if (!validation.ok) return { validation };

    const accepted = await this.deps.adrCatalog.listAdrs('Accepted');
    const reverse = await this.deps.validator.validateReverseCoverage({
      traces,
      acceptedAdrs: accepted,
      ...(input.requiredAdrs ? { requiredAdrs: input.requiredAdrs } : {}),
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
