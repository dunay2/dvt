export type ExecutionAdapterName = "temporal" | "conductor" | "local";

export interface ObservabilityContext {
  readonly tenantId?: string;
  readonly projectId?: string;
  readonly environmentId?: string;

  readonly adapter?: ExecutionAdapterName;

  // High-cardinality identifiers (allowed for traces/logs; NOT for metric labels)
  readonly runId?: string;
  readonly planId?: string;
  readonly stepId?: string;
  readonly attemptId?: string;

  // Temporal-specific
  readonly taskQueue?: string;
}

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | { readonly [k: string]: JsonValue }
  | readonly JsonValue[];

export type Attributes = Readonly<Record<string, JsonValue>>;

export type MetricLabels = Readonly<Record<string, string>>;
