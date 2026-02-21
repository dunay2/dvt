import type {
  AdrRef,
  AdrStatus,
  HeaderTrace,
  TraceabilityManifest,
  ValidationResult,
} from './types.js';

export interface IAdrCatalog {
  getAdr(number: string): Promise<AdrRef | null>;
  listAdrs(status?: AdrStatus): Promise<AdrRef[]>;
}

export interface ITraceHeaderScanner {
  scan(input: {
    repoRoot: string;
    includeGlobs: string[];
    excludeGlobs: string[];
  }): Promise<HeaderTrace[]>;
}

export interface ITraceValidator {
  validate(input: { traces: HeaderTrace[]; adrCatalog: IAdrCatalog }): Promise<ValidationResult>;
  validateReverseCoverage(input: {
    traces: HeaderTrace[];
    acceptedAdrs: AdrRef[];
  }): Promise<ValidationResult>;
}

export interface IManifestBuilder {
  build(input: {
    component: string;
    version: string;
    repoSha: string;
    generated: string;
    traces: HeaderTrace[];
    adrCatalog: IAdrCatalog;
  }): Promise<TraceabilityManifest>;
}

export interface IGraphPublisher {
  publish(input: {
    moduleName: string;
    modulePath: string;
    traces: HeaderTrace[];
    adrCatalog: IAdrCatalog;
  }): Promise<void>;
}

export interface ITraceabilityService {
  validateAndPublish(input: {
    repoRoot: string;
    component: string;
    componentVersion: string;
    repoSha: string;
    includeGlobs: string[];
    excludeGlobs: string[];
    moduleName: string;
    modulePath: string;
    generated: string;
  }): Promise<{ validation: ValidationResult; manifest?: TraceabilityManifest }>;
}
