import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('fails closed when immutable dashboard and alert evidence are missing', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const outputPath = path.join(mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')), 'evidence.md');

  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'tools/ops/ar-c2-evidence-collector.mjs'),
      '--require-dashboard-alert-evidence',
    ],
    {
      cwd: root,
      env: { ...process.env, AR_C2_EVIDENCE_OUTPUT_PATH: outputPath },
      encoding: 'utf8',
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AR-C2_IMMUTABLE_EVIDENCE_MISSING/);
  assert.match(result.stderr, /missing dashboard panels: 9/);
  assert.match(result.stderr, /missing alert rules: 11/);

  const artifact = readFileSync(outputPath, 'utf8');
  assert.match(artifact, /`missing_panel`/);
  assert.match(artifact, /`missing_alert`/);
});

test('allows AR-C2 INV-1 when dashboard and alert snapshots cover every mapped row', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const outputPath = path.join(mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')), 'evidence.md');
  const dashboardPath = path.join(
    mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')),
    'dashboard.json'
  );
  const alertPath = path.join(mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')), 'alerts.json');

  writeFileSync(
    dashboardPath,
    JSON.stringify({
      panels: [
        'ar-c2.start-run-latency',
        'ar-c2.plan-compile-latency',
        'ar-c2.snapshot-staleness-counts',
        'ar-c2.snapshot-unknown-fallback',
        'ar-c2.outbox-claimed-lag',
        'ar-c2.outbox-drain-lag',
        'ar-c2.event-delivery-latency',
        'ar-c2.run-status-stale-ratio',
        'ar-c2.run-status-unknown-ratio',
      ].map((panelKey) => ({
        panelKey,
        dashboardSystem: 'grafana',
        environment: 'production',
        immutableDashboardReference: `immutable://grafana-dashboard/${panelKey}`,
        queryExpression: `query-${panelKey}`,
        capturedAt: '2026-05-13T00:00:00.000Z',
        reviewer: 'runtime-sre',
      })),
    }),
    'utf8'
  );
  writeFileSync(
    alertPath,
    JSON.stringify({
      rules: [
        'ar-c2.start-run-latency.warning',
        'ar-c2.start-run-latency.critical',
        'ar-c2.plan-compile-latency.warning',
        'ar-c2.plan-compile-latency.critical',
        'ar-c2.outbox-drain-lag.warning',
        'ar-c2.outbox-drain-lag.critical',
        'ar-c2.event-delivery-latency.warning',
        'ar-c2.event-delivery-latency.critical',
        'ar-c2.run-status-stale-ratio.warning',
        'ar-c2.run-status-stale-ratio.critical',
        'ar-c2.run-status-unknown-ratio.critical',
      ].map((thresholdKey) => ({
        thresholdKey,
        alertRuleId: `rule-${thresholdKey}`,
        expression: `expr-${thresholdKey}`,
        window: '15m',
        severity: thresholdKey.endsWith('.critical') ? 'critical' : 'warning',
        routingTarget: 'runtime-sre',
        configSource: 'immutable://grafana-alert-export',
        capturedAt: '2026-05-13T00:00:00.000Z',
        reviewer: 'runtime-sre',
      })),
    }),
    'utf8'
  );

  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'tools/ops/ar-c2-evidence-collector.mjs'),
      '--require-dashboard-alert-evidence',
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        AR_C2_EVIDENCE_OUTPUT_PATH: outputPath,
        AR_C2_DASHBOARD_SNAPSHOT_FILE: dashboardPath,
        AR_C2_ALERT_SNAPSHOT_FILE: alertPath,
      },
      encoding: 'utf8',
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const artifact = readFileSync(outputPath, 'utf8');
  assert.doesNotMatch(artifact, /\|[^|\n]*\|[^|\n]*\| `missing_panel` \|/);
  assert.doesNotMatch(
    artifact,
    /\|[^|\n]*\|[^|\n]*\|[^|\n]*\|[^|\n]*\|[^|\n]*\| `missing_alert` \|/
  );
  assert.match(artifact, /`insufficient_window_data`/);
});

test('fails closed when sustained validation window evidence is missing', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const outputPath = path.join(mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')), 'evidence.md');

  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'tools/ops/ar-c2-evidence-collector.mjs'),
      '--require-sustained-validation-windows',
    ],
    {
      cwd: root,
      env: { ...process.env, AR_C2_EVIDENCE_OUTPUT_PATH: outputPath },
      encoding: 'utf8',
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AR-C2_SUSTAINED_VALIDATION_WINDOWS_MISSING/);
  assert.match(result.stderr, /missing sustained windows: 9/);

  const artifact = readFileSync(outputPath, 'utf8');
  assert.match(artifact, /`insufficient_window_data`/);
});

test('allows AR-C2 INV-4 when metrics snapshots cover every sustained window', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const outputPath = path.join(mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')), 'evidence.md');
  const metricsPath = path.join(
    mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')),
    'metrics.json'
  );

  writeFileSync(
    metricsPath,
    JSON.stringify({
      windows: [
        {
          signalKey: 'dvt.api.run_start.latency_ms',
          window: '2026-05-13T12:00:00Z/2026-05-13T12:15:00Z',
          observed: 'p50=410ms, p99=1900ms',
          expected: 'p50 <= 500ms, p99 <= 2500ms (15m)',
          status: 'pass',
        },
        {
          signalKey: 'dvt.api.plan_compile.latency_ms',
          window: '2026-05-13T12:00:00Z/2026-05-13T12:15:00Z',
          observed: 'p50=900ms, p99=5200ms',
          expected: 'p50 <= 1200ms, p99 <= 6000ms (15m)',
          status: 'pass',
        },
        {
          signalKey: 'dvt.api.run_status.snapshot_staleness_result_total',
          window: '2026-05-13T12:00:00Z/2026-05-13T12:15:00Z',
          observed: 'source counters present',
          expected: 'source for stale/unknown ratios',
          status: 'pass',
        },
        {
          signalKey: 'dvt.api.run_status.snapshot_staleness_fallback_unknown_total',
          window: '2026-05-13T12:00:00Z/2026-05-13T12:15:00Z',
          observed: 'diagnostic counter present',
          expected: 'source for unknown diagnostics',
          status: 'pass',
        },
        {
          signalKey: 'dvt_outbox_oldest_claimed_lag_seconds',
          window: '2026-05-13T12:00:00Z/2026-05-13T12:15:00Z',
          observed: 'observed baseline captured',
          expected: 'observational baseline only',
          status: 'pass',
        },
        {
          signalKey: 'dvt_delivery_outbox_drain_lag_seconds',
          window: '2026-05-13T12:00:00Z/2026-05-13T12:15:00Z',
          observed: 'p95=18s',
          expected: 'p95 <= 30s (15m)',
          status: 'pass',
        },
        {
          signalKey: 'dvt_delivery_event_delivery_latency_ms',
          window: '2026-05-13T12:00:00Z/2026-05-13T12:15:00Z',
          observed: 'p95=900ms, p99=3400ms',
          expected: 'p95 <= 1500ms, p99 <= 5000ms (15m)',
          status: 'pass',
        },
        {
          signalKey: 'derived from staleness counts',
          window: '2026-05-13T12:00:00Z/2026-05-13T12:15:00Z',
          observed: 'stale=2.2%',
          expected: 'stale <= 5% (15m)',
          status: 'pass',
        },
        {
          signalKey: 'derived from staleness counts',
          window: '2026-05-13T00:00:00Z/2026-05-14T00:00:00Z',
          observed: 'unknown=0.02%',
          expected: 'unknown <= 0.1% (24h)',
          status: 'pass',
        },
      ],
    }),
    'utf8'
  );

  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'tools/ops/ar-c2-evidence-collector.mjs'),
      '--require-sustained-validation-windows',
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        AR_C2_EVIDENCE_OUTPUT_PATH: outputPath,
        AR_C2_METRICS_SNAPSHOT_FILE: metricsPath,
      },
      encoding: 'utf8',
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const artifact = readFileSync(outputPath, 'utf8');
  assert.doesNotMatch(
    artifact,
    /\|[^|\n]*\|[^|\n]*\|[^|\n]*\|[^|\n]*\| `insufficient_window_data` \|/
  );
  assert.match(artifact, /`pass`/);
});

test('rejects key-only dashboard and alert snapshots without immutable metadata', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const outputPath = path.join(mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')), 'evidence.md');
  const dashboardPath = path.join(
    mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')),
    'dashboard.json'
  );
  const alertPath = path.join(mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')), 'alerts.json');

  writeFileSync(
    dashboardPath,
    JSON.stringify({
      panelKeys: [
        'ar-c2.start-run-latency',
        'ar-c2.plan-compile-latency',
        'ar-c2.snapshot-staleness-counts',
        'ar-c2.snapshot-unknown-fallback',
        'ar-c2.outbox-claimed-lag',
        'ar-c2.outbox-drain-lag',
        'ar-c2.event-delivery-latency',
        'ar-c2.run-status-stale-ratio',
        'ar-c2.run-status-unknown-ratio',
      ],
    }),
    'utf8'
  );
  writeFileSync(
    alertPath,
    JSON.stringify({
      rules: [
        'ar-c2.start-run-latency.warning',
        'ar-c2.start-run-latency.critical',
        'ar-c2.plan-compile-latency.warning',
        'ar-c2.plan-compile-latency.critical',
        'ar-c2.outbox-drain-lag.warning',
        'ar-c2.outbox-drain-lag.critical',
        'ar-c2.event-delivery-latency.warning',
        'ar-c2.event-delivery-latency.critical',
        'ar-c2.run-status-stale-ratio.warning',
        'ar-c2.run-status-stale-ratio.critical',
        'ar-c2.run-status-unknown-ratio.critical',
      ].map((thresholdKey) => ({ thresholdKey })),
    }),
    'utf8'
  );

  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'tools/ops/ar-c2-evidence-collector.mjs'),
      '--require-dashboard-alert-evidence',
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        AR_C2_EVIDENCE_OUTPUT_PATH: outputPath,
        AR_C2_DASHBOARD_SNAPSHOT_FILE: dashboardPath,
        AR_C2_ALERT_SNAPSHOT_FILE: alertPath,
      },
      encoding: 'utf8',
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AR-C2_IMMUTABLE_EVIDENCE_MISSING/);
  assert.match(result.stderr, /incomplete dashboard evidence: 9/);
  assert.match(result.stderr, /incomplete alert evidence: 11/);
});

test('renders canonical SLA source reference for every AR-C2 alert threshold', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const outputPath = path.join(mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')), 'evidence.md');

  const result = spawnSync(
    process.execPath,
    [path.join(root, 'tools/ops/ar-c2-evidence-collector.mjs')],
    {
      cwd: root,
      env: { ...process.env, AR_C2_EVIDENCE_OUTPUT_PATH: outputPath },
      encoding: 'utf8',
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const artifact = readFileSync(outputPath, 'utf8');
  assert.match(artifact, /\| Threshold key\s+\| Source reference\s+\| Alert rule id \|/);

  for (const thresholdKey of [
    'ar-c2.start-run-latency.warning',
    'ar-c2.start-run-latency.critical',
    'ar-c2.plan-compile-latency.warning',
    'ar-c2.plan-compile-latency.critical',
    'ar-c2.outbox-drain-lag.warning',
    'ar-c2.outbox-drain-lag.critical',
    'ar-c2.event-delivery-latency.warning',
    'ar-c2.event-delivery-latency.critical',
    'ar-c2.run-status-stale-ratio.warning',
    'ar-c2.run-status-stale-ratio.critical',
    'ar-c2.run-status-unknown-ratio.critical',
  ]) {
    assert.match(
      artifact,
      new RegExp('\\| `' + escapeRegExp(thresholdKey) + '`\\s+\\| `docs/runbooks/[^\\n|]+`\\s+\\|')
    );
  }
});

test('fails closed when a threshold-backed AR-C2 mapping row omits its SLA source reference', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const outputPath = path.join(mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')), 'evidence.md');
  const mappingPath = path.join(mkdtempSync(path.join(tmpdir(), 'ar-c2-evidence-')), 'mapping.md');

  writeFileSync(
    mappingPath,
    `# Test AR-C2 mapping

| Logical signal | Logical metric ID | Exported metric / derived expression | SLO threshold | Alert policy | Target dashboard panel key | Alert threshold key(s) | Alert threshold source | Signal owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Start-run latency p50/p99 | dvt.api.run_start.latency_ms | dvt_api_run_start_latency_ms_bucket | p50 <= 500ms, p99 <= 2500ms (15m) | warning p99 > 2000ms (10m), critical p99 > 2500ms (15m) | ar-c2.start-run-latency | ar-c2.start-run-latency.warning, ar-c2.start-run-latency.critical |  | API runtime |
`,
    'utf8'
  );

  const result = spawnSync(
    process.execPath,
    [path.join(root, 'tools/ops/ar-c2-evidence-collector.mjs')],
    {
      cwd: root,
      env: {
        ...process.env,
        AR_C2_EVIDENCE_OUTPUT_PATH: outputPath,
        AR_C2_MAPPING_PATH: mappingPath,
      },
      encoding: 'utf8',
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AR-C2_THRESHOLD_SOURCE_MISSING/);
  assert.match(result.stderr, /ar-c2.start-run-latency/);
});

test('keeps AR-C2 immutable evidence gate semantics documented with the collector', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const collector = readFileSync(path.join(root, 'tools/ops/ar-c2-evidence-collector.mjs'), 'utf8');
  const component = readFileSync(
    path.join(
      root,
      'docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-component.md'
    ),
    'utf8'
  );
  const stories = readFileSync(
    path.join(
      root,
      'docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-user-stories.md'
    ),
    'utf8'
  );
  const mailbox = readFileSync(
    path.join(root, 'buzon/20260513-codex-fowler-ar-c2-inv-1-immutable-evidence-gate-analysis.md'),
    'utf8'
  );
  const runbook = readFileSync(
    path.join(root, 'docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md'),
    'utf8'
  );

  assert.match(
    collector,
    /Owned concern: collect AR-C2 operational evidence and enforce dashboard, alert, and sustained-window closure evidence/
  );
  assert.match(collector, /--require-dashboard-alert-evidence/);
  assert.match(collector, /--require-sustained-validation-windows/);

  for (const section of ['## Public API', '## Invariants', '## Transitions', '## Consumers']) {
    assert.match(component, new RegExp(`^${section}$`, 'm'));
  }
  assert.match(component, /AR-C2OperationalEvidenceCommand/);
  assert.match(stories, /US-AR-C2-INV-1-001/);
  assert.match(stories, /US-AR-C2-INV-1-002/);
  assert.match(stories, /US-AR-C2-INV-4-001/);
  assert.match(mailbox, /Hidden authority/);
  assert.match(mailbox, /Mature-system comparison/);
  assert.match(runbook, /--require-dashboard-alert-evidence/);
  assert.match(runbook, /--require-sustained-validation-windows/);
});
