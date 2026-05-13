#!/usr/bin/env node
/** Owned concern: collect AR-C2 operational evidence and enforce immutable dashboard/alert closure evidence. */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import prettier from 'prettier';

const ROOT = process.cwd();
const MAPPING_PATH = path.join(
  ROOT,
  'docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md'
);
const DEFAULT_OUTPUT_PATH = path.join(ROOT, 'docs/runbooks/ar-c2-evidence-generated-latest.md');

function utcNowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  return {
    requireDashboardAlertEvidence: argv.includes('--require-dashboard-alert-evidence'),
  };
}

function cleanCell(value) {
  return value.replaceAll('`', '').trim();
}

function parseMarkdownTableRows(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headerIdx = lines.findIndex(
    (line) => line.includes('| Logical signal') && line.includes('| Target dashboard panel key')
  );
  if (headerIdx < 0) {
    throw new Error(`Cannot find mapping table header in ${MAPPING_PATH}`);
  }

  const rows = [];
  for (let i = headerIdx + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || !line.trim().startsWith('|')) break;
    const parts = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cleanCell(cell));
    if (parts.length < 7) continue;
    const [
      logicalSignal,
      logicalMetricId,
      exportedMetric,
      sloThreshold,
      alertPolicy,
      targetPanelKey,
      signalOwner,
    ] = parts;
    rows.push({
      logicalSignal,
      logicalMetricId,
      exportedMetric,
      sloThreshold,
      alertPolicy,
      targetPanelKey,
      signalOwner,
    });
  }
  return rows;
}

async function readJsonFileMaybe(filePath) {
  if (!filePath) return null;
  const abs = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  const raw = await fs.readFile(abs, 'utf8');
  return JSON.parse(raw);
}

function deriveThresholdRows(mappingRows) {
  const thresholds = [];
  for (const row of mappingRows) {
    const policy = row.alertPolicy.toLowerCase();
    if (policy.includes('no canonical threshold yet') || policy.includes('source metric only')) {
      continue;
    }

    const severities = [];
    if (policy.includes('warning')) severities.push('warning');
    if (policy.includes('critical')) severities.push('critical');
    if (severities.length === 0) {
      // Keep a fallback severity bucket for policies without explicit severity.
      severities.push('policy');
    }

    for (const severity of severities) {
      thresholds.push({
        thresholdKey: `${row.targetPanelKey}.${severity}`,
        panelKey: row.targetPanelKey,
        signalKey: row.logicalMetricId,
        severity,
      });
    }
  }
  return thresholds;
}

function normalizeDashboardSnapshot(snapshot) {
  if (!snapshot) return new Set();
  const panelKeys = Array.isArray(snapshot.panelKeys) ? snapshot.panelKeys : [];
  return new Set(panelKeys.map((x) => String(x).trim()));
}

function normalizeAlertSnapshot(snapshot) {
  if (!snapshot) return new Map();
  const rules = Array.isArray(snapshot.rules) ? snapshot.rules : [];
  const byKey = new Map();
  for (const rule of rules) {
    const thresholdKey = String(rule.thresholdKey ?? '').trim();
    if (!thresholdKey) continue;
    byKey.set(thresholdKey, {
      alertRuleId: String(rule.alertRuleId ?? 'unknown'),
      expression: String(rule.expression ?? 'unknown'),
      window: String(rule.window ?? 'unknown'),
      severity: String(rule.severity ?? 'unknown'),
      routingTarget: String(rule.routingTarget ?? 'unknown'),
      configSource: String(rule.configSource ?? 'unknown'),
    });
  }
  return byKey;
}

function normalizeMetricsSnapshot(snapshot) {
  if (!snapshot) return new Map();
  const windows = Array.isArray(snapshot.windows) ? snapshot.windows : [];
  const bySignal = new Map();
  for (const item of windows) {
    const signalKey = String(item.signalKey ?? '').trim();
    if (!signalKey) continue;
    const existing = bySignal.get(signalKey) ?? [];
    existing.push({
      status: item.status === 'pass' ? 'pass' : 'insufficient_window_data',
      observed: item.observed ?? 'unknown',
      expected: item.expected ?? 'unknown',
      window: item.window ?? 'unknown',
    });
    bySignal.set(signalKey, existing);
  }
  return bySignal;
}

function collectDashboardAlertEvidenceBlockers({
  mappingRows,
  dashboardPanelKeys,
  alertRulesByThreshold,
}) {
  const missingDashboardPanelKeys = mappingRows
    .filter((row) => !dashboardPanelKeys.has(row.targetPanelKey))
    .map((row) => row.targetPanelKey);
  const missingAlertThresholdKeys = deriveThresholdRows(mappingRows)
    .filter((row) => !alertRulesByThreshold.has(row.thresholdKey))
    .map((row) => row.thresholdKey);

  return {
    missingDashboardPanelKeys,
    missingAlertThresholdKeys,
  };
}

function assertImmutableDashboardAlertEvidence(blockers) {
  const dashboardCount = blockers.missingDashboardPanelKeys.length;
  const alertCount = blockers.missingAlertThresholdKeys.length;
  if (dashboardCount === 0 && alertCount === 0) return;

  throw new Error(
    [
      'AR-C2_IMMUTABLE_EVIDENCE_MISSING',
      `missing dashboard panels: ${dashboardCount}`,
      `missing alert rules: ${alertCount}`,
      `dashboard blockers: ${blockers.missingDashboardPanelKeys.join(', ') || 'none'}`,
      `alert blockers: ${blockers.missingAlertThresholdKeys.join(', ') || 'none'}`,
    ].join('\n')
  );
}

function renderArtifact({
  mappingRows,
  dashboardPanelKeys,
  alertRulesByThreshold,
  metricsBySignal,
  generatedAt,
}) {
  const dashboardRows = mappingRows.map((row) => {
    const hasPanel = dashboardPanelKeys.has(row.targetPanelKey);
    return {
      signalKey: row.logicalMetricId,
      panelKey: row.targetPanelKey,
      status: hasPanel ? 'pass' : 'missing_panel',
    };
  });

  const thresholdRows = deriveThresholdRows(mappingRows).map((row) => {
    const rule = alertRulesByThreshold.get(row.thresholdKey);
    if (!rule) {
      return {
        ...row,
        alertRuleId: 'pending',
        expression: 'pending',
        window: 'pending',
        routingTarget: 'pending',
        status: 'missing_alert',
      };
    }
    return {
      ...row,
      alertRuleId: rule.alertRuleId,
      expression: rule.expression,
      window: rule.window,
      routingTarget: rule.routingTarget,
      status: 'pass',
    };
  });

  const consumedMetricIdx = new Map();
  const sustainedRows = mappingRows.map((row) => {
    const candidates = metricsBySignal.get(row.logicalMetricId) ?? [];
    const consumed = consumedMetricIdx.get(row.logicalMetricId) ?? new Set();

    let metricIdx = candidates.findIndex(
      (entry, idx) => !consumed.has(idx) && String(entry.expected) === row.sloThreshold
    );
    if (metricIdx < 0) {
      metricIdx = candidates.findIndex((_, idx) => !consumed.has(idx));
    }

    const metricWindow = metricIdx >= 0 ? candidates[metricIdx] : null;
    if (metricIdx >= 0) {
      consumed.add(metricIdx);
      consumedMetricIdx.set(row.logicalMetricId, consumed);
    }

    if (!metricWindow) {
      return {
        signalKey: row.logicalMetricId,
        window: 'pending',
        observed: 'pending',
        expected: row.sloThreshold,
        status: 'insufficient_window_data',
      };
    }
    return {
      signalKey: row.logicalMetricId,
      window: String(metricWindow.window),
      observed: String(metricWindow.observed),
      expected: String(metricWindow.expected),
      status: metricWindow.status,
    };
  });

  return `---
title: AR-C2 generated operational evidence
status: Active
owner: Runtime / SRE / Docs
last_reviewed: ${generatedAt.slice(0, 10)}
---

# AR-C2 generated operational evidence

Generated at (UTC): \`${generatedAt}\`

Source mapping:
- \`docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md\`

## Dashboard wiring evidence (T2)

| Signal key | Target panel key | Status |
| --- | --- | --- |
${dashboardRows.map((r) => `| \`${r.signalKey}\` | \`${r.panelKey}\` | \`${r.status}\` |`).join('\n')}

## Alert wiring evidence (T3)

| Threshold key | Alert rule id | Expression | Window | Routing target | Status |
| --- | --- | --- | --- | --- | --- |
${thresholdRows
  .map(
    (r) =>
      `| \`${r.thresholdKey}\` | \`${r.alertRuleId}\` | \`${r.expression}\` | \`${r.window}\` | \`${r.routingTarget}\` | \`${r.status}\` |`
  )
  .join('\n')}

## Sustained validation windows (T4)

| Signal key | Window | Observed | Expected | Status |
| --- | --- | --- | --- | --- |
${sustainedRows
  .map(
    (r) =>
      `| \`${r.signalKey}\` | \`${r.window}\` | \`${r.observed}\` | \`${r.expected}\` | \`${r.status}\` |`
  )
  .join('\n')}

## Notes

- Status values are generated by the collector: \`pass\`, \`missing_panel\`, \`missing_alert\`, \`insufficient_window_data\`.
- This artifact is machine-generated and should be referenced by AR-C2 closeout tasks.
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outputPath = process.env.AR_C2_EVIDENCE_OUTPUT_PATH
    ? path.resolve(ROOT, process.env.AR_C2_EVIDENCE_OUTPUT_PATH)
    : DEFAULT_OUTPUT_PATH;

  const dashboardSnapshot = await readJsonFileMaybe(process.env.AR_C2_DASHBOARD_SNAPSHOT_FILE);
  const alertSnapshot = await readJsonFileMaybe(process.env.AR_C2_ALERT_SNAPSHOT_FILE);
  const metricsSnapshot = await readJsonFileMaybe(process.env.AR_C2_METRICS_SNAPSHOT_FILE);

  const mappingRaw = await fs.readFile(MAPPING_PATH, 'utf8');
  const mappingRows = parseMarkdownTableRows(mappingRaw);
  const dashboardPanelKeys = normalizeDashboardSnapshot(dashboardSnapshot);
  const alertRulesByThreshold = normalizeAlertSnapshot(alertSnapshot);

  const markdown = renderArtifact({
    mappingRows,
    dashboardPanelKeys,
    alertRulesByThreshold,
    metricsBySignal: normalizeMetricsSnapshot(metricsSnapshot),
    generatedAt: utcNowIso(),
  });
  const prettierConfig = (await prettier.resolveConfig(outputPath)) ?? {};
  const formattedMarkdown = await prettier.format(markdown, {
    ...prettierConfig,
    parser: 'markdown',
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, formattedMarkdown, 'utf8');
  process.stdout.write(`[ar-c2:evidence] Generated ${path.relative(ROOT, outputPath)}\n`);

  if (options.requireDashboardAlertEvidence) {
    assertImmutableDashboardAlertEvidence(
      collectDashboardAlertEvidenceBlockers({
        mappingRows,
        dashboardPanelKeys,
        alertRulesByThreshold,
      })
    );
  }
}

main().catch((error) => {
  process.stderr.write(
    `[ar-c2:evidence] FAIL ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
