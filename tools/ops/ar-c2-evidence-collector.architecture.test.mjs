import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

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
      ].map((thresholdKey) => ({
        thresholdKey,
        alertRuleId: `rule-${thresholdKey}`,
        expression: `expr-${thresholdKey}`,
        window: '15m',
        severity: thresholdKey.endsWith('.critical') ? 'critical' : 'warning',
        routingTarget: 'runtime-sre',
        configSource: 'immutable://grafana-alert-export',
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
    /Owned concern: collect AR-C2 operational evidence and enforce immutable dashboard\/alert closure evidence/
  );
  assert.match(collector, /--require-dashboard-alert-evidence/);

  for (const section of ['## Public API', '## Invariants', '## Transitions', '## Consumers']) {
    assert.match(component, new RegExp(`^${section}$`, 'm'));
  }
  assert.match(component, /AR-C2OperationalEvidenceCommand/);
  assert.match(stories, /US-AR-C2-INV-1-001/);
  assert.match(stories, /US-AR-C2-INV-1-002/);
  assert.match(mailbox, /Hidden authority/);
  assert.match(mailbox, /Mature-system comparison/);
  assert.match(runbook, /--require-dashboard-alert-evidence/);
});
