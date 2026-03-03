import { describe, expect, it } from "vitest";
import { OtelObservability } from "../src";

describe("OtelObservability", () => {
  it("creates a no-op span and closes it without throwing", () => {
    const obs = new OtelObservability({ serviceName: "test-service" });
    expect(() => {
      const span = obs.traces.startSpan("test.span");
      span.setAttribute("k", "v");
      span.end();
    }).not.toThrow();
  });

  it("enforces forbidden high-cardinality metric labels", () => {
    const obs = new OtelObservability({ serviceName: "test-service" });
    expect(() => obs.metrics.counter("dvt.steps.started", { runId: "r-1" })).toThrow(
      /Forbidden metric label key/,
    );
  });
});
