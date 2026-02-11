# TEST_STRATEGY_FRONT.md - Frontend Testing Strategy

**Version**: 1.0  
**Date**: 2026-02-11  
**Status**: Informative (Best Practices)  
**Location**: docs/architecture/frontend/quality/TEST_STRATEGY_FRONT.md

---

## Executive Summary

The frontend testing strategy follows the **Testing Pyramid**:

```
         /\
        /  \       10%  E2E Tests (Playwright)
       /────\
      /      \     30%  Integration Tests (React Testing Library + MSW)
     /────────\
    /          \   60%  Unit Tests (Vitest)
   /────────────\
```

**Goals**:
- **Fast feedback**: Unit tests run in <10 seconds
- **High confidence**: E2E tests cover golden paths
- **Maintainability**: Tests are readable and resilient to UI changes

**Test Runner Strategy**:
- **Vitest** is the standard test runner across all packages (core, domain, planner, ui)
- Only use Jest if a package truly requires it (e.g., specific Jest-only plugins)
- If Jest is required, isolate it in a separate workspace to avoid config duplication and tooling drift

---

## 1. Monorepo Testing Strategy

DVT+ uses a **monorepo structure** with multiple packages (core, domain, planner, ui). To maintain consistency and avoid tooling drift:

### 1.1 Test Runner Standard: Vitest

**Decision**: Use **Vitest** as the standard test runner across all packages.

**Rationale**:
- **Performance**: Vitest is significantly faster than Jest (native ESM, Vite-powered)
- **Modern tooling**: Better TypeScript and ESM support out of the box
- **API compatibility**: Drop-in replacement for Jest API (minimal migration effort)
- **Consistency**: All packages use the same test runner and configuration

### 1.2 Exception Handling: Jest Isolation

If a package **truly requires Jest** (e.g., specific Jest-only plugins or legacy dependencies):

1. **Isolate the package** in a separate workspace
2. **Document the reason** for using Jest in the package's README
3. **Maintain separate configs** (`jest.config.js` only in that workspace)
4. **Prevent config drift** by restricting Jest to that workspace only

**Example workspace structure**:

```
packages/
├── core/              (Vitest)
├── domain/            (Vitest)
├── planner/           (Vitest)
├── ui/                (Vitest)
└── legacy-adapter/    (Jest - isolated, documented reason)
    ├── jest.config.js
    └── README.md      ("Uses Jest due to jest-only-plugin dependency")
```

### 1.3 Shared Test Configuration

Use a **shared Vitest config** to avoid duplication:

```ts
// packages/test-config/vitest.config.base.ts
import { defineConfig } from 'vitest/config';

export const baseConfig = defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

**Per-package config** (extends base):

```ts
// packages/ui/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../test-config/vitest.config.base';

export default mergeConfig(
  baseConfig,
  defineConfig({
    // UI-specific overrides
    test: {
      environment: 'jsdom',
    },
  })
);
```

---

## 2. Test Levels

### 1.1 Unit Tests (60% of tests)

**Scope**: Pure functions, hooks, view model transformations

**Tools**:
- **Vitest** (standard test runner for all packages)
- **@testing-library/react** (React component testing)

**Why Vitest?**
- Faster than Jest (native ESM support, Vite-powered)
- Compatible with Jest API (easy migration)
- Better TypeScript support out of the box
- Consistent with Vite build tooling

**Examples**:

#### 1.1.1 View Model Transformation

Test file: `src/models/runSummary.test.ts`

```ts
import { transformRunSummary } from './runSummary';

describe('transformRunSummary', () => {
  it('converts engine Run to RunSummary view model', () => {
    const engineRun = {
      runId: 'run-123',
      planId: 'plan-abc',
      status: 'COMPLETED',
      startedAt: '2026-02-11T10:00:00Z',
      completedAt: '2026-02-11T10:30:00Z',
      steps: [
        { stepId: 's1', status: 'SUCCESS' },
        { stepId: 's2', status: 'SUCCESS' },
      ],
    };
    
    const result = transformRunSummary(engineRun);
    
    expect(result).toEqual({
      runId: 'run-123',
      planId: 'plan-abc',
      status: 'COMPLETED',
      startedAt: '2026-02-11T10:00:00Z',
      completedAt: '2026-02-11T10:30:00Z',
      progress: {
        completed: 2,
        total: 2,
        percentage: 100,
      },
      duration: 1800, // 30 minutes in seconds
    });
  });
  
  it('calculates progress percentage correctly', () => {
    const engineRun = {
      runId: 'run-123',
      steps: [
        { stepId: 's1', status: 'SUCCESS' },
        { stepId: 's2', status: 'RUNNING' },
        { stepId: 's3', status: 'PENDING' },
      ],
    };
    
    const result = transformRunSummary(engineRun);
    
    expect(result.progress).toEqual({
      completed: 1,
      total: 3,
      percentage: 33.33,
    });
  });
});
```

**Coverage target**: 90% for pure functions

---

#### 1.1.2 React Hooks

Test file: `src/hooks/usePermissions.test.ts`

```ts
import { renderHook } from '@testing-library/react';
import { usePermissions } from './usePermissions';
import { PermissionsProvider } from '@/contexts/PermissionsContext';

describe('usePermissions', () => {
  it('returns true if user has exact permission', () => {
    const wrapper = ({ children }) => (
      <PermissionsProvider value={{ permissions: ['plan:edit:team-123'] }}>
        {children}
      </PermissionsProvider>
    );
    
    const { result } = renderHook(() => usePermissions(), { wrapper });
    
    expect(result.current.can('plan:edit', 'team-123')).toBe(true);
  });
  
  it('returns true if user has wildcard permission', () => {
    const wrapper = ({ children }) => (
      <PermissionsProvider value={{ permissions: ['plan:edit:*'] }}>
        {children}
      </PermissionsProvider>
    );
    
    const { result } = renderHook(() => usePermissions(), { wrapper });
    
    expect(result.current.can('plan:edit', 'team-999')).toBe(true);
  });
  
  it('returns false if user lacks permission', () => {
    const wrapper = ({ children }) => (
      <PermissionsProvider value={{ permissions: [] }}>
        {children}
      </PermissionsProvider>
    );
    
    const { result } = renderHook(() => usePermissions(), { wrapper });
    
    expect(result.current.can('plan:delete', 'team-123')).toBe(false);
  });
});
```

---

#### 1.1.3 React Components (Button States)

Test file: `src/components/RunControls.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { RunControls } from './RunControls';
import { PermissionsProvider } from '@/contexts/PermissionsContext';

describe('RunControls', () => {
  it('hides Cancel button if user lacks run:cancel permission', () => {
    const mockRun = { runId: 'run-123', status: 'RUNNING', teamId: 'team-123' };
    
    render(
      <PermissionsProvider value={{ permissions: [] }}>
        <RunControls run={mockRun} />
      </PermissionsProvider>
    );
    
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });
  
  it('disables Cancel button if run is COMPLETED', () => {
    const mockRun = { runId: 'run-123', status: 'COMPLETED', teamId: 'team-123' };
    
    render(
      <PermissionsProvider value={{ permissions: ['run:cancel:*'] }}>
        <RunControls run={mockRun} />
      </PermissionsProvider>
    );
    
    const button = screen.getByText('Cancel');
    expect(button).toBeDisabled();
  });
  
  it('enables Cancel button if run is RUNNING and user has permission', () => {
    const mockRun = { runId: 'run-123', status: 'RUNNING', teamId: 'team-123' };
    
    render(
      <PermissionsProvider value={{ permissions: ['run:cancel:*'] }}>
        <RunControls run={mockRun} />
      </PermissionsProvider>
    );
    
    const button = screen.getByText('Cancel');
    expect(button).not.toBeDisabled();
  });
});
```

---

### 1.2 Integration Tests (30% of tests)

**Scope**: Component + API interactions, Zustand stores, TanStack Query

**Tools**:
- **MSW** (Mock Service Worker) - Mock API responses
- **React Testing Library** - Render components
- **@testing-library/user-event** - Simulate user interactions

**Examples**:

#### 1.2.1 TanStack Query + API

Test file: `src/features/runs/RunListPage.test.tsx`

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RunListPage } from './RunListPage';

const server = setupServer(
  rest.get('/v1/runs', (req, res, ctx) => {
    return res(ctx.json({
      runs: [
        { runId: 'run-123', status: 'RUNNING', planName: 'Daily ETL' },
        { runId: 'run-456', status: 'COMPLETED', planName: 'Weekly Report' },
      ],
      cursor: { next: null, hasMore: false },
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('RunListPage', () => {
  it('fetches and displays runs from API', async () => {
    const queryClient = new QueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <RunListPage />
      </QueryClientProvider>
    );
    
    // Wait for API call to complete
    await waitFor(() => {
      expect(screen.getByText('Daily ETL')).toBeInTheDocument();
      expect(screen.getByText('Weekly Report')).toBeInTheDocument();
    });
  });
  
  it('shows error message if API call fails', async () => {
    server.use(
      rest.get('/v1/runs', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
      })
    );
    
    const queryClient = new QueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <RunListPage />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

---

#### 1.2.2 Zustand Store

Test file: `src/stores/graphStore.test.ts`

```ts
import { renderHook, act } from '@testing-library/react';
import { useGraphStore } from './graphStore';

describe('graphStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useGraphStore.setState({ nodes: [], edges: [] });
  });
  
  it('adds a node to the graph', () => {
    const { result } = renderHook(() => useGraphStore());
    
    act(() => {
      result.current.addNode({
        id: 'node-1',
        type: 'python-task',
        position: { x: 100, y: 100 },
        data: { label: 'Fetch Data' },
      });
    });
    
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0].id).toBe('node-1');
  });
  
  it('removes a node and connected edges', () => {
    const { result } = renderHook(() => useGraphStore());
    
    // Setup: Add node and edge
    act(() => {
      result.current.addNode({ id: 'node-1', type: 'python-task', position: { x: 0, y: 0 } });
      result.current.addNode({ id: 'node-2', type: 'python-task', position: { x: 200, y: 0 } });
      result.current.addEdge({ id: 'edge-1', source: 'node-1', target: 'node-2' });
    });
    
    // Remove node
    act(() => {
      result.current.removeNode('node-1');
    });
    
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.edges).toHaveLength(0); // Connected edge also removed
  });
});
```

---

### 1.3 E2E Tests (10% of tests)

**Scope**: Critical user journeys (golden paths)

**Tools**:
- **Playwright** (preferred) or **Cypress**

**Test location**: `e2e/golden-paths/`

**Examples**:

See [GOLDEN_PATHS_UI.v1.md](../golden-paths/GOLDEN_PATHS_UI.v1.md) for full test examples.

**Summary**:
- GP-01: Import dbt → Validate → Execute
- GP-02: Create plan → Add nodes → Execute
- GP-03: Audit trail review
- GP-04: Pause → Resume → Complete
- GP-05: View cost breakdown

**Run frequency**:
- **On every PR**: Run E2E tests in CI (headless)
- **On deploy to staging**: Run full E2E suite
- **Synthetic canaries**: Run subset every 15 minutes in production

---

## 2. Contract Tests (API Boundary)

**Purpose**: Ensure frontend and backend agree on API contract

**Tool**: **Pact** (consumer-driven contract testing)

**Example**:

Test file: `src/api/runs.contract.test.ts`

```ts
import { pactWith } from '@pact-foundation/pact';
import { getRuns } from './runs';

pactWith({ consumer: 'frontend', provider: 'backend' }, (provider) => {
  describe('GET /v1/runs', () => {
    beforeEach(() => {
      provider.addInteraction({
        state: 'runs exist',
        uponReceiving: 'a request for runs',
        withRequest: {
          method: 'GET',
          path: '/v1/runs',
          query: { limit: '50' },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            runs: [
              {
                runId: somethingLike('run-123'),
                status: somethingLike('RUNNING'),
                planName: somethingLike('Daily ETL'),
              },
            ],
            cursor: {
              next: nullable(string()),
              hasMore: boolean(),
            },
          },
        },
      });
    });
    
    it('fetches runs from backend', async () => {
      const result = await getRuns({ limit: 50 });
      
      expect(result.runs).toHaveLength(1);
      expect(result.runs[0].runId).toBe('run-123');
    });
  });
});
```

**CI Integration**:
- Frontend publishes contract (Pact file) to Pact Broker
- Backend verifies contract in its CI pipeline
- Breaking changes fail backend CI → prevents deploy

---

## 3. Visual Regression Tests

**Purpose**: Catch unintended UI changes (CSS, layout)

**Tool**: **Percy** or **Chromatic** (Storybook + visual diffing)

**Workflow**:
1. Developer adds Storybook stories for components
2. Percy captures screenshots on every PR
3. Reviewer approves or rejects visual changes

**Example story**:

File: `src/components/RunStatus.stories.tsx`

```tsx
import { RunStatus } from './RunStatus';

export default {
  title: 'Components/RunStatus',
  component: RunStatus,
};

export const Running = {
  args: { status: 'RUNNING' },
};

export const Completed = {
  args: { status: 'COMPLETED' },
};

export const Failed = {
  args: { status: 'FAILED' },
};
```

**CI Integration**:
```yaml
# .github/workflows/visual-tests.yml
- name: Run Percy
  run: npx percy storybook:build
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

---

## 4. Accessibility (A11y) Tests

**Purpose**: Ensure UI is usable by screen readers, keyboard-only users

**Tools**:
- **vitest-axe** (unit tests - Jest-axe compatible API)
- **axe-core** (E2E tests via Playwright)

**Example unit test**:

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';
import { RunList } from './RunList';

expect.extend(toHaveNoViolations);

describe('RunList A11y', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<RunList runs={mockRuns} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Example E2E test**:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Audit viewer has no accessibility violations', async ({ page }) => {
  await page.goto('/audit');
  
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

---

## 5. Performance Tests

**Purpose**: Ensure UI meets performance budgets

**Tool**: **Lighthouse CI** (run Lighthouse in CI)

**Metrics** (see [PERF_BUDGET.md](PERF_BUDGET.md)):
- **First Contentful Paint (FCP)**: <1.5s
- **Largest Contentful Paint (LCP)**: <2.5s
- **Time to Interactive (TTI)**: <3.5s

**CI Integration**:
```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  run: lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_TOKEN }}
```

---

## 6. Test Coverage Targets

| Test Level | Target | Rationale |
|------------|--------|-----------|
| Unit tests | 80% | Pure functions, hooks, view models |
| Integration tests | 70% | API interactions, stores |
| E2E tests | 100% of golden paths | Critical user journeys |
| Contract tests | 100% of API endpoints | Prevent breaking changes |
| A11y tests | 100% of pages | WCAG 2.1 AA compliance |

**Coverage enforcement**:
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

---

## 7. CI/CD Pipeline

### 7.1 On Every PR

```yaml
# .github/workflows/test.yml
name: Test

on: [pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:unit -- --coverage
      
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:contract
      - run: npx pact-broker publish ./pacts --consumer-app-version=${{ github.sha }}
      
  a11y-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:a11y
```

### 7.2 On Merge to Main

- Run full test suite
- Deploy to staging
- Run synthetic canaries (golden paths)
- Lighthouse CI checks
- If all pass → auto-deploy to production

---

## 8. Test Data Management

### 8.1 Factories

Use **Test Data Builders** to create realistic test data:

```ts
// src/test-utils/factories/runFactory.ts
import { faker } from '@faker-js/faker';

export function createRun(overrides = {}) {
  return {
    runId: faker.string.uuid(),
    planId: faker.string.uuid(),
    status: 'RUNNING',
    startedAt: faker.date.recent().toISOString(),
    completedAt: null,
    steps: [
      { stepId: faker.string.uuid(), status: 'SUCCESS' },
      { stepId: faker.string.uuid(), status: 'RUNNING' },
    ],
    ...overrides,
  };
}

// Usage in tests
const mockRun = createRun({ status: 'COMPLETED' });
```

### 8.2 Fixtures

Store reusable fixtures in `src/test-utils/fixtures/`:

```ts
// src/test-utils/fixtures/runs.json
[
  {
    "runId": "run-123",
    "planId": "plan-abc",
    "status": "COMPLETED",
    "startedAt": "2026-02-11T10:00:00Z",
    "completedAt": "2026-02-11T10:30:00Z"
  }
]
```

---

## 9. Test Utilities

### 9.1 Custom Render

Wrap components with common providers:

```tsx
// src/test-utils/render.tsx
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionsProvider } from '@/contexts/PermissionsContext';

export function render(ui, { permissions = [], ...options } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider value={{ permissions }}>
          {children}
        </PermissionsProvider>
      </QueryClientProvider>
    );
  }
  
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

// Usage
import { render } from '@/test-utils/render';

test('shows edit button', () => {
  render(<PlanDetailPage />, { permissions: ['plan:edit:*'] });
  expect(screen.getByText('Edit Plan')).toBeInTheDocument();
});
```

---

## 10. References

- [GOLDEN_PATHS_UI.v1.md](../golden-paths/GOLDEN_PATHS_UI.v1.md) - E2E test examples
- [PERF_BUDGET.md](PERF_BUDGET.md) - Performance targets
- [A11Y_GUIDELINES.md](A11Y_GUIDELINES.md) - Accessibility standards
- [Playwright Docs](https://playwright.dev)
- [React Testing Library](https://testing-library.com/react)
- [MSW Docs](https://mswjs.io)

---

_Last updated: 2026-02-11_  
_Version: 1.0_  
_Status: Informative - Best practices for testing_
