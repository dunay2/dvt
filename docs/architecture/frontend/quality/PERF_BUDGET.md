# PERF_BUDGET.md - Frontend Performance Budget

**Version**: 1.0  
**Date**: 2026-02-11  
**Status**: Informative (Targets & Best Practices)  
**Location**: docs/architecture/frontend/quality/PERF_BUDGET.md

---

## Executive Summary

Performance budgets define **hard limits** on metrics that impact user experience. Violating these budgets blocks deployment.

**Philosophy**: "Fast by default" - performance is a feature, not an optimization.

---

## 1. Core Web Vitals (Lighthouse)

Targets based on **Lighthouse v10** scoring:

| Metric | Target (Good) | Max (Acceptable) | Percentile |
|--------|---------------|------------------|------------|
| **First Contentful Paint (FCP)** | <1.5s | <2.5s | p75 |
| **Largest Contentful Paint (LCP)** | <2.0s | <2.5s | p75 |
| **Time to Interactive (TTI)** | <3.0s | <3.5s | p75 |
| **Total Blocking Time (TBT)** | <200ms | <300ms | p75 |
| **Cumulative Layout Shift (CLS)** | <0.1 | <0.25 | p75 |
| **Speed Index** | <2.5s | <3.5s | p75 |
| **Lighthouse Score** | ≥90 | ≥80 | - |

**Measurement**: Lighthouse CI runs on every PR against staging environment.

**Enforcement**:
```yaml
# .lighthouserc.json
{
  "ci": {
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "first-contentful-paint": ["error", {"maxNumericValue": 1500}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "total-blocking-time": ["error", {"maxNumericValue": 300}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.25}],
        "categories:performance": ["error", {"minScore": 0.9}]
      }
    }
  }
}
```

---

## 2. Bundle Size Limits

JavaScript bundle size directly impacts parse/compile time.

| Bundle | Max Size (Gzipped) | Notes |
|--------|-------------------|-------|
| **Main Bundle** (vendor + app) | 250 KB | Initial page load |
| **React Flow** (code-split) | 150 KB | Lazy-loaded for editor |
| **Chart Library** (recharts) | 80 KB | Lazy-loaded for metrics |
| **Total Page Weight** | 500 KB | Including CSS, images |

**Measurement**: `npm run build` + `bundlesize` package

**Enforcement**:
```json
// package.json
{
  "bundlesize": [
    {
      "path": "./dist/main.*.js",
      "maxSize": "250 KB"
    },
    {
      "path": "./dist/editor.*.js",
      "maxSize": "150 KB"
    }
  ]
}
```

**CI check**:
```yaml
- name: Check bundle size
  run: npm run bundlesize
```

---

## 3. Graph Editor Performance

React Flow editor has special performance requirements:

| Metric | Limit | Notes |
|--------|-------|-------|
| **Max visible nodes** | 500 | Without virtualization |
| **Max nodes with virtualization** | 5,000 | Use `react-flow-renderer` viewport culling |
| **Node rendering time** | <16ms per node | 60fps = 16.67ms per frame |
| **Pan/zoom FPS** | ≥60 FPS | Smooth interactions |
| **Autosave debounce** | 2 seconds | Prevent excessive API calls |

**Optimization techniques**:

### 3.1 Virtualization

For graphs with >500 nodes, enable viewport culling:

```tsx
// src/components/GraphEditor.tsx
import { ReactFlow, useViewport } from 'reactflow';

function GraphEditor({ nodes, edges }) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      minZoom={0.1}
      maxZoom={2}
      // Enable viewport culling for large graphs
      onlyRenderVisibleElements={nodes.length > 500}
    />
  );
}
```

### 3.2 Lazy Panel Loading

Don't render config panels until user opens them:

```tsx
// ❌ WRONG: Always renders panel (slow)
<NodeConfigPanel node={selectedNode} />

// ✅ CORRECT: Lazy render
{selectedNode && <NodeConfigPanel node={selectedNode} />}
```

### 3.3 Memoization

Use `React.memo` for node components:

```tsx
import { memo } from 'react';

const CustomNode = memo(({ data }) => (
  <div className="node">
    {data.label}
  </div>
));

export default CustomNode;
```

---

## 4. API Performance Limits

| Operation | Max Response Time | Notes |
|-----------|------------------|-------|
| **GET /v1/runs** (list) | <500ms | Indexed queries |
| **POST /v1/runs** (start) | <1s | Async execution |
| **GET /v1/plans/:id** (detail) | <300ms | Includes graph definition |
| **GET /v1/audit** (search) | <2s | Complex queries |

**Enforcement**: Backend API has p95 SLOs monitored by OpenTelemetry.

---

## 5. Real User Monitoring (RUM)

Use **OpenTelemetry** to track actual user performance:

**Metrics to track**:
- Page load time (per route)
- API call duration (per endpoint)
- Component render time (React DevTools Profiler)

**Example instrumentation**:

```tsx
// src/instrumentation/rum.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('frontend');

export function instrumentPageLoad(pageName: string) {
  const span = tracer.startSpan(`page:${pageName}:load`);
  
  window.addEventListener('load', () => {
    span.end();
  });
}

// Usage in route
useEffect(() => {
  instrumentPageLoad('run-detail');
}, []);
```

**Alerting**:
- P95 page load time >3s → Warning
- P99 page load time >5s → Critical alert

---

## 6. Image & Asset Optimization

| Asset Type | Limit | Format | Notes |
|------------|-------|--------|-------|
| **Icons** | <10 KB each | SVG | Inline small icons (<2 KB) |
| **Logos** | <50 KB | WebP with PNG fallback | Use `<picture>` element |
| **Screenshots** (docs) | <200 KB | WebP | Lazy-load below fold |
| **Fonts** | <100 KB total | WOFF2 | Subset fonts to used glyphs |

**Lazy loading images**:

```tsx
<img
  src="screenshot.webp"
  alt="Run timeline view"
  loading="lazy"
  width="800"
  height="600"
/>
```

---

## 7. Polling Budget

Prevent excessive polling that drains device resources:

| Resource | Polling Interval | Max Concurrent Polls |
|----------|-----------------|---------------------|
| **Run status** (RUNNING) | 2 seconds | 5 runs max |
| **Run status** (PAUSED/COMPLETED) | Stop polling | - |
| **Audit logs** | No polling (load on demand) | - |
| **Cost data** | No polling (cached for 1 hour) | - |

**Implementation**:

```tsx
import { useQuery } from '@tanstack/react-query';

function useRunStatus(runId: string, status: string) {
  return useQuery(
    ['run', runId],
    () => api.getRun(runId),
    {
      // Only poll if run is active
      refetchInterval: ['RUNNING', 'PAUSED'].includes(status) ? 2000 : false,
      // Stop polling when window is hidden
      refetchIntervalInBackground: false,
    }
  );
}
```

---

## 8. Memory Limits

JavaScript heap size limits (Chrome):

| Scenario | Max Heap | Notes |
|----------|----------|-------|
| **Idle page** | <50 MB | No active runs/graphs |
| **Graph editor open** (500 nodes) | <150 MB | React Flow state |
| **Graph editor open** (5k nodes) | <300 MB | Virtualized |
| **Run detail page** (active poll) | <100 MB | Timeline + logs |

**Memory leak prevention**:
- Clean up event listeners in `useEffect` cleanup
- Cancel in-flight API requests on unmount
- Clear Zustand stores when navigating away

**Example cleanup**:

```tsx
useEffect(() => {
  const controller = new AbortController();
  
  fetch('/v1/runs', { signal: controller.signal })
    .then(handleResponse);
  
  // Cleanup
  return () => controller.abort();
}, []);
```

---

## 9. Monitoring & Alerts

### 9.1 Lighthouse CI

Run on every PR:

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      https://staging.example.com/plans
      https://staging.example.com/runs
      https://staging.example.com/audit
    uploadArtifacts: true
    temporaryPublicStorage: true
```

### 9.2 Real User Monitoring (OpenTelemetry)

Track p95/p99 metrics in production:

```ts
// src/instrumentation/otel.ts
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const provider = new WebTracerProvider();
const exporter = new OTLPTraceExporter({
  url: 'https://otel-collector.example.com/v1/traces',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();
```

**Alert rules**:
```yaml
# alerts.yml
- name: Slow page load
  condition: p95(page_load_duration) > 3s for 5m
  severity: warning
  
- name: Bundle size regression
  condition: bundle_size > 250KB
  severity: critical
```

---

## 10. Performance Testing in CI

### 10.1 Synthetic Tests

Run Lighthouse against staging on every deploy:

```yaml
# .github/workflows/perf-test.yml
- name: Deploy to staging
  run: npm run deploy:staging
  
- name: Wait for deployment
  run: sleep 30
  
- name: Run Lighthouse
  run: |
    npm install -g @lhci/cli
    lhci autorun --config=.lighthouserc.json
```

### 10.2 Load Testing (API)

Use **k6** to simulate API load:

```js
// k6/load-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100, // 100 virtual users
  duration: '30s',
};

export default function () {
  const res = http.get('https://api.example.com/v1/runs');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

## 11. Best Practices Checklist

- [ ] **Code splitting**: Lazy-load routes with `React.lazy()`
- [ ] **Tree shaking**: Use ES modules, avoid `import *`
- [ ] **Image optimization**: Use WebP, lazy loading
- [ ] **Font subsetting**: Only include used glyphs
- [ ] **Caching**: Set `Cache-Control` headers (1 year for immutable assets)
- [ ] **Compression**: Serve Gzip or Brotli
- [ ] **CDN**: Use CDN for static assets
- [ ] **Preload critical resources**: `<link rel="preload">`
- [ ] **Avoid Layout Shift**: Set explicit width/height on images
- [ ] **Debounce user input**: Prevent excessive re-renders

---

## 12. References

- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)
- [React Flow Performance](https://reactflow.dev/docs/guides/performance/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/instrumentation/js/)
- [Web Performance Best Practices](https://web.dev/fast/)

---

_Last updated: 2026-02-11_  
_Version: 1.0_  
_Status: Informative - Performance targets and optimization guidelines_
