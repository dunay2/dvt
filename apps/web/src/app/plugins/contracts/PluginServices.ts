import type { PlanPreviewInput as ShellPlanPreviewInput } from '../../ports/plans';
import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunEvent,
  RunStatusSnapshot,
} from '../../types/engine';
import type { ExecutionPlan } from '../../types/dbt';
import type { NodeBadgeContribution, NodeRendererRegistration } from './NodeRendering';
import type { CanvasOverlayContribution } from './NodeRendering';
import type { LocalizableString } from './PluginManifest';

// ---------------------------------------------------------------------------
// Run operations
// ---------------------------------------------------------------------------

export interface StartRunInput {
  planRef: PlanRef;
  runContext: RunContext;
}

export interface RunObserveOptions {
  afterSeq?: number;
  onEvent: (event: RunEvent) => void;
  onError: (error: Error) => void;
  onStatusChange?: (status: RunStatusSnapshot) => void;
}

export interface RunObserveHandle {
  stop: () => void;
  getLastSeq: () => number;
}

export interface RunOperations {
  start?: (input: StartRunInput) => Promise<EngineRunRef>;
  /** Internally handles SSE → polling fallback. Caller does not distinguish. */
  observe?: (runId: string, opts: RunObserveOptions) => RunObserveHandle;
  cancel?: (runRef: EngineRunRef) => Promise<void>;
  signal?: (runRef: EngineRunRef, request: import('../../types/engine').RunEvent) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Plan operations
// ---------------------------------------------------------------------------

export type PlanPreviewInput = ShellPlanPreviewInput;

export interface PlanOperations {
  preview?: (input: PlanPreviewInput) => Promise<ExecutionPlan>;
}

// ---------------------------------------------------------------------------
// Plan import / export
// ---------------------------------------------------------------------------

export type ImportedPlan = {
  planRef: PlanRef;
  label: string;
  description?: string;
};

export interface PlanImportSource {
  id: string;
  label: LocalizableString;
  type: 'file' | 'url' | 'api-connection';
  /** Only relevant when type='file' */
  acceptedFileTypes?: string[];
  /** Shell injects RunContext from sessionStore — the plugin does not manage it */
  parse: (
    input: File | string | Record<string, unknown>,
    context: RunContext
  ) => Promise<ImportedPlan>;
}

export interface PlanExportFormat {
  id: string;
  label: LocalizableString;
  mimeType: string;
  /** Shell handles the download trigger. Plugin returns serialized content. */
  generate: (
    planRef: PlanRef,
    context: RunContext
  ) => Promise<{ content: string; filename: string }>;
}

export interface PluginPlanHandlers {
  import?: {
    label: LocalizableString;
    sources: PlanImportSource[];
  };
  export?: {
    label: LocalizableString;
    formats: PlanExportFormat[];
  };
}

// ---------------------------------------------------------------------------
// Artifact operations
// ---------------------------------------------------------------------------

export type ArtifactType = 'manifest' | 'catalog' | 'run-results' | 'sources' | 'custom';

export interface ArtifactRef {
  runId: string;
  type: ArtifactType;
  url?: string;
}

export interface ArtifactOperations {
  read?: (ref: ArtifactRef) => Promise<unknown>;
  list?: (runId: string) => Promise<ArtifactRef[]>;
}

// ---------------------------------------------------------------------------
// Cost operations
// ---------------------------------------------------------------------------

export interface NodeCostData {
  nodeId: string;
  cost: number;
  currency: string;
  breakdown?: Record<string, number>;
}

export interface CostOperations {
  analyze?: (runId: string) => Promise<NodeCostData[]>;
}

// ---------------------------------------------------------------------------
// Lineage operations
// ---------------------------------------------------------------------------

export interface LineageResolution {
  nodeId: string;
  columnName: string;
  upstreamColumns: Array<{ nodeId: string; columnName: string }>;
}

export interface LineageOperations {
  resolve?: (nodeId: string, columnName: string) => Promise<LineageResolution>;
}

// ---------------------------------------------------------------------------
// PluginServices — the full services object returned by createServices()
//
// Each field maps to one or more PluginCapabilityId:
//   nodeRenderers    ← canvas.render
//   nodeBadges       ← canvas.render (optional — additive decorators)
//   overlays         ← canvas.overlay
//   planHandlers     ← plan.import / plan.export
//   planOperations   ← plan.preview
//   runOperations    ← run.start / run.observe / run.cancel
//   artifactOps      ← artifact.read
//   costOps          ← cost.analyze
//   lineageOps       ← lineage.resolve
// ---------------------------------------------------------------------------

export interface PluginServices {
  /** Base renderers per node kind. One renderer is chosen as the base (highest priority). */
  nodeRenderers?: Map<string, NodeRendererRegistration>;
  /** Badge decorators — additive, independent from base renderer */
  nodeBadges?: NodeBadgeContribution[];
  /** Canvas overlay contributions */
  overlays?: CanvasOverlayContribution[];
  /** Plan import/export handlers */
  planHandlers?: PluginPlanHandlers;
  /** Plan preview operation */
  planOperations?: PlanOperations;
  /** Run lifecycle operations */
  runOperations?: RunOperations;
  /** Artifact access */
  artifactOps?: ArtifactOperations;
  /** Cost analysis */
  costOps?: CostOperations;
  /** Column lineage resolution */
  lineageOps?: LineageOperations;
}
