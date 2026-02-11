# GOLDEN_PATHS_UI.v1.md - UI Golden Paths

**Version**: 1.0  
**Date**: 2026-02-11  
**Status**: Testable (E2E Tests)  
**Location**: docs/architecture/frontend/golden-paths/GOLDEN_PATHS_UI.v1.md

---

## Executive Summary

**Golden paths** are critical user journeys that MUST work end-to-end. Each golden path has:

- **Acceptance criteria** (what "works" means)  
- **E2E test** (Playwright/Cypress)  
- **Monitoring** (synthetic canary)  

**Philosophy**: If a golden path breaks, the product is broken.

---

## GP-01: Import dbt Project → Validate → Execute

**User persona**: Data engineer importing existing dbt project

**Steps**:

1. **Create new project**
   - Click "New Project" button
   - Enter project name: "Analytics ETL"
   - Select "Import from dbt"
   - Provide Git URL: `https://github.com/org/dbt-project`
   - Click "Import"

2. **View DAG**
   - System parses `dbt_project.yml` + SQL models
   - Displays graph in React Flow editor (nodes = models, edges = refs)
   - Nodes colored by status (idle = gray)

3. **Validate plan**
   - Click "Validate" button
   - System checks:
     - No cycles
     - All refs resolve
     - Valid SQL syntax (if supported)
   - Validation panel shows ✅ or ❌ with errors

4. **Execute plan**
   - Click "Run" button
   - Modal shows: Environment dropdown (dev/prod), input params
   - Click "Start Run"
   - Run detail page opens

5. **Monitor execution**
   - Timeline view shows steps (models) running in order
   - Status updates every 2 seconds (polling or SSE)
   - Nodes highlight green (success) / red (fail) as they complete
   - Progress bar: "5 / 10 models completed (50%)"

6. **View logs**
   - Click failing node
   - Panel shows:
     - Step status: FAILED
     - Error message: "Syntax error in SQL: line 42"
     - Logs snippet (last 100 lines)
     - Button: "Full Logs" → opens log viewer

7. **Retry failed step**
   - Click "Retry" button on failed node
   - System sends RETRY signal
   - Step reruns from beginning
   - Timeline updates

**Acceptance Criteria**:
- ✅ DAG renders with >100 nodes in <2 seconds
- ✅ Validation completes in <5 seconds
- ✅ Run starts within 1 second of "Start Run" click
- ✅ Status updates visible within 3 seconds of backend state change
- ✅ Logs panel loads in <1 second
- ✅ Retry button disabled if run is COMPLETED or CANCELLED

**E2E Test** (Playwright):
```typescript
test('GP-01: Import dbt project → validate → execute', async ({ page }) => {
  // 1. Import
  await page.goto('/projects');
  await page.click('button:has-text("New Project")');
  await page.fill('input[name="name"]', 'Analytics ETL');
  await page.selectOption('select[name="source"]', 'dbt');
  await page.fill('input[name="gitUrl"]', 'https://github.com/org/dbt-project');
  await page.click('button:has-text("Import")');
  
  // 2. View DAG
  await page.waitForSelector('.react-flow__node', { timeout: 5000 });
  const nodeCount = await page.locator('.react-flow__node').count();
  expect(nodeCount).toBeGreaterThan(0);
  
  // 3. Validate
  await page.click('button:has-text("Validate")');
  await page.waitForSelector('.validation-result:has-text("✅")', { timeout: 5000 });
  
  // 4. Execute
  await page.click('button:has-text("Run")');
  await page.selectOption('select[name="environment"]', 'dev');
  await page.click('button:has-text("Start Run")');
  
  // 5. Monitor
  await page.waitForURL(/\/runs\/.+/, { timeout: 2000 });
  await page.waitForSelector('.progress-bar', { timeout: 3000 });
  
  // 6-7. Skipped in test (requires actual failure)
});
```

---

## GP-02: Create Plan from Scratch → Add Nodes → Execute

**User persona**: Workflow author creating custom plan

**Steps**:

1. **Create blank plan**
   - Click "New Plan" → "Blank Plan"
   - Enter name: "Daily Reports"

2. **Add nodes**
   - Drag "Python Task" from palette → canvas
   - Double-click node → config panel opens
   - Fill:
     - Name: "Fetch Data"
     - Script: `print("Hello")`
   - Click "Save"
   - Add 2 more nodes: "Transform", "Load"

3. **Connect nodes**
   - Drag edge from "Fetch Data" output → "Transform" input
   - Drag edge from "Transform" → "Load"
   - Graph validates: no cycles ✅

4. **Save & Publish**
   - Click "Save Draft"
   - Notification: "Plan saved (version 1)"
   - Click "Publish"
   - Confirmation modal: "Publish plan? Runs will use this version."
   - Click "Confirm"
   - Status badge changes: DRAFT → PUBLISHED

5. **Execute**
   - Click "Run" → "Start Run"
   - Timeline shows 3 steps running sequentially
   - All complete successfully

**Acceptance Criteria**:
- ✅ Node drag-and-drop performance: <100ms lag
- ✅ Config panel opens in <500ms
- ✅ Autosave triggers 2 seconds after last edit
- ✅ Publish completes in <1 second
- ✅ Cannot edit published plan (button disabled)

**E2E Test**:
```typescript
test('GP-02: Create plan → add nodes → execute', async ({ page }) => {
  await page.goto('/plans');
  await page.click('button:has-text("New Plan")');
  await page.click('button:has-text("Blank Plan")');
  
  // Add node
  await page.dragAndDrop('.palette-item[data-type="python-task"]', '.react-flow__pane', {
    targetPosition: { x: 200, y: 200 }
  });
  
  // Configure node
  await page.dblclick('.react-flow__node');
  await page.fill('input[name="nodeName"]', 'Fetch Data');
  await page.fill('textarea[name="script"]', 'print("Hello")');
  await page.click('button:has-text("Save")');
  
  // Publish
  await page.click('button:has-text("Publish")');
  await page.click('button:has-text("Confirm")');
  
  await page.waitForSelector('.status-badge:has-text("PUBLISHED")');
});
```

---

## GP-03: Audit Trail Review

**User persona**: Auditor investigating security incident

**Steps**:

1. **Open audit viewer**
   - Navigate to `/audit`
   - Page requires `auditor` role (403 if unauthorized)

2. **Search by actor**
   - Enter user email: "alice@example.com"
   - Click "Search"
   - Results show all actions by Alice in last 30 days

3. **Filter by action**
   - Select "RUN_CANCEL" from action dropdown
   - Results narrow to only CANCEL actions

4. **View decision record**
   - Click audit entry
   - Panel shows:
     - Timestamp: 2026-02-11 10:30 AM
     - Actor: Alice (user-123)
     - Action: RUN_CANCEL
     - Resource: run-xyz (plan: dbt_daily_build)
     - Decision: GRANTED
     - Justification: "Deploy in progress"
     - IP: 1.2.3.4 (redacted if PII protection)

5. **Export to CSV**
   - Click "Export" button
   - Modal: "Export 250 results to CSV?"
   - Click "Download"
   - CSV includes audit ID, timestamp, actor, action, resource

**Acceptance Criteria**:
- ✅ Search returns results in <2 seconds (indexed queries)
- ✅ PII (IP, email) redacted unless user has `view-pii` permission
- ✅ Export limited to 10,000 rows (prevent DoS)
- ✅ Decision records include mandatory justification field

**E2E Test**:
```typescript
test('GP-03: Audit trail review', async ({ page }) => {
  await page.goto('/audit');
  
  // Search
  await page.fill('input[name="actor"]', 'alice@example.com');
  await page.click('button:has-text("Search")');
  
  await page.waitForSelector('.audit-entry', { timeout: 2000 });
  
  // Filter
  await page.selectOption('select[name="action"]', 'RUN_CANCEL');
  const filteredCount = await page.locator('.audit-entry').count();
  expect(filteredCount).toBeGreaterThan(0);
  
  // View details
  await page.click('.audit-entry:first-child');
  await page.waitForSelector('.audit-detail-panel');
  expect(await page.textContent('.audit-detail-panel')).toContain('Justification');
});
```

---

## GP-04: Pause Run → Resume → Complete

**User persona**: Operator controlling running workflow

**Steps**:

1. **Start run**
   - Open plan → click "Run"
   - Run starts, status: RUNNING

2. **Pause run**
   - Click "Pause" button in toolbar
   - Modal: "Pause run? Provide reason:"
   - Enter: "Deploy in progress"
   - Click "Confirm"
   - Status changes: RUNNING → PAUSED
   - Timeline shows pause marker with timestamp

3. **Resume run**
   - Click "Resume" button
   - Status changes: PAUSED → RUNNING
   - Execution continues from where it paused

4. **Complete**
   - All steps finish
   - Status: COMPLETED
   - Timeline shows full history: start → pause → resume → complete

**Acceptance Criteria**:
- ✅ Pause completes within 5 seconds (graceful stop)
- ✅ Resume button disabled if run is COMPLETED
- ✅ Pause reason captured in Decision Record (audit log)
- ✅ Timeline visually distinguishes pause markers

**E2E Test**:
```typescript
test('GP-04: Pause → resume → complete', async ({ page }) => {
  // Assume run already started
  await page.goto('/runs/run-xyz');
  
  // Pause
  await page.click('button:has-text("Pause")');
  await page.fill('textarea[name="reason"]', 'Deploy in progress');
  await page.click('button:has-text("Confirm")');
  
  await page.waitForSelector('.status-badge:has-text("PAUSED")', { timeout: 5000 });
  
  // Resume
  await page.click('button:has-text("Resume")');
  await page.waitForSelector('.status-badge:has-text("RUNNING")', { timeout: 2000 });
  
  // Verify timeline
  const markers = await page.locator('.timeline-marker[data-type="pause"]').count();
  expect(markers).toBeGreaterThan(0);
});
```

---

## GP-05: View Cost Breakdown

**User persona**: Finance team reviewing cloud costs

**Steps**:

1. **Open run detail**
   - Navigate to completed run
   - Cost panel visible: "$1.23 USD"

2. **View breakdown**
   - Click "View Breakdown"
   - Modal shows:
     - Compute: $0.80
     - Storage: $0.30
     - Network: $0.13
   - Table lists per-node costs

3. **Filter by node**
   - Click "Show nodes >$0.50"
   - Table filters to expensive nodes only

4. **Export for billing**
   - Click "Export to CSV"
   - CSV includes: nodeId, cost, duration, resources

**Acceptance Criteria**:
- ✅ Cost estimates available within 10 seconds of run completion
- ✅ Breakdown sums to total (no rounding errors)
- ✅ Export includes all cost line items

**E2E Test**:
```typescript
test('GP-05: View cost breakdown', async ({ page }) => {
  await page.goto('/runs/run-xyz');
  
  // Verify cost visible
  await page.waitForSelector('.cost-panel');
  const totalCost = await page.textContent('.cost-panel .total');
  expect(totalCost).toMatch(/\$[\d.]+/);
  
  // View breakdown
  await page.click('button:has-text("View Breakdown")');
  await page.waitForSelector('.cost-breakdown-modal');
  
  // Check categories
  expect(await page.isVisible('text=Compute')).toBeTruthy();
  expect(await page.isVisible('text=Storage')).toBeTruthy();
});
```

---

## Monitoring: Synthetic Canaries

Each golden path should have a **synthetic canary** running every 15 minutes:

```typescript
// Example: Playwright synthetic test
import { test } from '@playwright/test';

test('Canary: GP-01 smoke test', async ({ page }) => {
  await page.goto(process.env.APP_URL);
  
  // Minimal smoke test (not full golden path)
  await page.click('button:has-text("New Project")');
  await page.waitForSelector('input[name="name"]', { timeout: 2000 });
  
  // Report to monitoring
  console.log('✅ GP-01 smoke test passed');
});
```

**Monitoring alerts**:
- Golden path failure → PagerDuty critical alert
- 2 consecutive failures → Page oncall engineer
- SLO: 99.9% golden path success rate

---

## References

- [UI_API_CONTRACT.v1.md](../contracts/UI_API_CONTRACT.v1.md) - API endpoints
- [TEST_STRATEGY_FRONT.md](../quality/TEST_STRATEGY_FRONT.md) - Testing approach
- [Playwright Docs](https://playwright.dev) - E2E testing

---

_Last updated: 2026-02-11_  
_Version: 1.0_  
_Status: Testable - Each golden path MUST have passing E2E test_
