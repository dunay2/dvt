#!/usr/bin/env node
/** Owned concern: collect AR-C2 operational evidence and enforce dashboard, alert, and sustained-window closure evidence. */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import prettier from 'prettier';

const ROOT = process.cwd();
const DEFAULT_MAPPING_PATH = path.join(
  ROOT,
  'docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md'
);
const DEFAULT_OUTPUT_PATH = path.join(ROOT, 'docs/runbooks/ar-c2-evidence-generated-latest.md');

function mappingPath() {
  return process.env.AR_C2_MAPPING_PATH
    ? path.resolve(ROOT, process.env.AR_C2_MAPPING_PATH)
    : DEFAULT_MAPPING_PATH;
}

function utcNowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  return {
    requireDashboardAlertEvidence: argv.includes('--require-dashboard-alert-evidence'),
    requireSustainedValidationWindows: argv.includes('--require-sustained-validation-windows'),
  };
}

function cleanCell(value) {
  return value.replaceAll('`', '').trim();
}

function parseMarkdownTableRows(markdown, sourcePath) {
  const lines = markdown.split(/\r?\n/);
  const headerIdx = lines.findIndex(
    (line) => line.includes('| Logical signal') && line.includes('| Target dashboard panel key')
  );
  if (headerIdx < 0) {
    throw new Error(`Cannot find mapping table header in ${sourcePath}`);
  }

  const rows = [];
  for (let i = headerIdx + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || !line.trim().startsWith('|')) break;
    const parts = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cleanCell(cell));
    if (parts.length < 9) {
      throw new Error(
        `AR-C2_THRESHOLD_TRACEABILITY_COLUMNS_MISSING in ${sourcePath}: expected mapping rows to include alert threshold key(s) and alert threshold source.`
      );
    }
    const [
      logicalSignal,
      logicalMetricId,
      exportedMetric,
      sloThreshold,
      alertPolicy,
      targetPanelKey,
      alertThresholdKeys,
      alertThresholdSource,
      signalOwner,
    ] = parts;
    rows.push({
      logicalSignal,
      logicalMetricId,
      exportedMetric,
      sloThreshold,
      alertPolicy,
      targetPanelKey,
      alertThresholdKeys: parseThresholdKeyList(alertThresholdKeys),
      alertThresholdSource,
      signalOwner,
    });
  }
  return rows;
}

function isThresholdBackedPolicy(alertPolicy) {
  const policy = alertPolicy.toLowerCase();
  return !(policy.includes('no canonical threshold yet') || policy.includes('source metric only'));
}

function parseThresholdKeyList(value) {
  const raw = value.trim();
  if (!raw || ['none', 'n/a', 'not threshold-backed'].includes(raw.toLowerCase())) {
    return [];
  }

  return raw
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
}

function hasPlaceholderToken(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes('<') ||
    normalized.includes('>') ||
    normalized === 'pending' ||
    normalized === 'unknown' ||
    normalized.includes('example.com') ||
    normalized.includes('template')
  );
}

function assertThresholdTraceability(mappingRows) {
  const missingKeys = [];
  const missingSources = [];
  const invalidSources = [];

  for (const row of mappingRows) {
    if (!isThresholdBackedPolicy(row.alertPolicy)) {
      continue;
    }

    if (row.alertThresholdKeys.length === 0) {
      missingKeys.push(row.targetPanelKey);
    }

    if (!row.alertThresholdSource) {
      missingSources.push(row.targetPanelKey);
      continue;
    }

    if (!row.alertThresholdSource.startsWith('docs/runbooks/')) {
      invalidSources.push(`${row.targetPanelKey} -> ${row.alertThresholdSource}`);
    }
  }

  if (missingKeys.length > 0) {
    throw new Error(
      `AR-C2_THRESHOLD_KEY_MISSING\nthreshold-backed rows without keys: ${missingKeys.join(', ')}`
    );
  }

  if (missingSources.length > 0) {
    throw new Error(
      `AR-C2_THRESHOLD_SOURCE_MISSING\nthreshold-backed rows without SLA/runbook source: ${missingSources.join(
        ', '
      )}`
    );
  }

  if (invalidSources.length > 0) {
    throw new Error(
      `AR-C2_THRESHOLD_SOURCE_INVALID\nthreshold sources must point at docs/runbooks: ${invalidSources.join(
        ', '
      )}`
    );
  }
}

async function readJsonFileMaybe(filePath) {
  if (!filePath) return null;
  const abs = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  const raw = await fs.readFile(abs, 'utf8');
  return JSON.parse(raw);
}

function deriveThresholdRows(mappingRows) {
  assertThresholdTraceability(mappingRows);

  const thresholds = [];
  for (const row of mappingRows) {
    if (!isThresholdBackedPolicy(row.alertPolicy)) {
      continue;
    }

    for (const thresholdKey of row.alertThresholdKeys) {
      thresholds.push({
        thresholdKey,
        panelKey: row.targetPanelKey,
        signalKey: row.logicalMetricId,
        severity: thresholdKey.endsWith('.critical')
          ? 'critical'
          : thresholdKey.endsWith('.warning')
            ? 'warning'
            : 'policy',
        sourceReference: row.alertThresholdSource,
      });
    }
  }
  return thresholds;
}

function normalizeDashboardSnapshot(snapshot) {
  const panelsByKey = new Map();
  if (!snapshot) return panelsByKey;

  const panelKeys = Array.isArray(snapshot.panelKeys) ? snapshot.panelKeys : [];
  for (const panelKey of panelKeys) {
    const key = String(panelKey).trim();
    if (!key) continue;
    panelsByKey.set(key, { panelKey: key, complete: false });
  }

  const panels = Array.isArray(snapshot.panels) ? snapshot.panels : [];
  for (const panel of panels) {
    const panelKey = String(panel.panelKey ?? '').trim();
    if (!panelKey) continue;
    const requiredFields = [
      'dashboardSystem',
      'environment',
      'immutableDashboardReference',
      'queryExpression',
      'capturedAt',
      'reviewer',
    ];
    panelsByKey.set(panelKey, {
      panelKey,
      dashboardSystem: String(panel.dashboardSystem ?? 'unknown'),
      environment: String(panel.environment ?? 'unknown'),
      immutableDashboardReference: String(panel.immutableDashboardReference ?? 'unknown'),
      queryExpression: String(panel.queryExpression ?? 'unknown'),
      capturedAt: String(panel.capturedAt ?? 'unknown'),
      reviewer: String(panel.reviewer ?? 'unknown'),
      complete: requiredFields.every((field) => !hasPlaceholderToken(panel[field])),
    });
  }
  return panelsByKey;
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
      capturedAt: String(rule.capturedAt ?? 'unknown'),
      reviewer: String(rule.reviewer ?? 'unknown'),
      complete: [
        'alertRuleId',
        'expression',
        'window',
        'severity',
        'routingTarget',
        'configSource',
        'capturedAt',
        'reviewer',
      ].every((field) => !hasPlaceholderToken(rule[field])),
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
  const incompleteDashboardPanelKeys = mappingRows
    .filter((row) => {
      const panel = dashboardPanelKeys.get(row.targetPanelKey);
      return panel && !panel.complete;
    })
    .map((row) => row.targetPanelKey);
  const missingAlertThresholdKeys = deriveThresholdRows(mappingRows)
    .filter((row) => !alertRulesByThreshold.has(row.thresholdKey))
    .map((row) => row.thresholdKey);
  const incompleteAlertThresholdKeys = deriveThresholdRows(mappingRows)
    .filter((row) => {
      const rule = alertRulesByThreshold.get(row.thresholdKey);
      return rule && !rule.complete;
    })
    .map((row) => row.thresholdKey);

  return {
    missingDashboardPanelKeys,
    incompleteDashboardPanelKeys,
    missingAlertThresholdKeys,
    incompleteAlertThresholdKeys,
  };
}

function assertImmutableDashboardAlertEvidence(blockers) {
  const dashboardCount = blockers.missingDashboardPanelKeys.length;
  const incompleteDashboardCount = blockers.incompleteDashboardPanelKeys.length;
  const alertCount = blockers.missingAlertThresholdKeys.length;
  const incompleteAlertCount = blockers.incompleteAlertThresholdKeys.length;
  if (
    dashboardCount === 0 &&
    incompleteDashboardCount === 0 &&
    alertCount === 0 &&
    incompleteAlertCount === 0
  ) {
    return;
  }

  throw new Error(
    [
      'AR-C2_IMMUTABLE_EVIDENCE_MISSING',
      `missing dashboard panels: ${dashboardCount}`,
      `incomplete dashboard evidence: ${incompleteDashboardCount}`,
      `missing alert rules: ${alertCount}`,
      `incomplete alert evidence: ${incompleteAlertCount}`,
      `dashboard blockers: ${blockers.missingDashboardPanelKeys.join(', ') || 'none'}`,
      `dashboard incomplete: ${blockers.incompleteDashboardPanelKeys.join(', ') || 'none'}`,
      `alert blockers: ${blockers.missingAlertThresholdKeys.join(', ') || 'none'}`,
      `alert incomplete: ${blockers.incompleteAlertThresholdKeys.join(', ') || 'none'}`,
    ].join('\n')
  );
}

function buildSustainedRows({ mappingRows, metricsBySignal }) {
  const consumedMetricIdx = new Map();
  return mappingRows.map((row) => {
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
}

function collectSustainedValidationWindowBlockers(sustainedRows) {
  return sustainedRows.filter((row) => row.status !== 'pass').map((row) => row.signalKey);
}

function assertSustainedValidationWindows(blockers) {
  if (blockers.length === 0) {
    return;
  }

  throw new Error(
    [
      'AR-C2_SUSTAINED_VALIDATION_WINDOWS_MISSING',
      `missing sustained windows: ${blockers.length}`,
      `sustained blockers: ${blockers.join(', ')}`,
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
    const panel = dashboardPanelKeys.get(row.targetPanelKey);
    return {
      signalKey: row.logicalMetricId,
      panelKey: row.targetPanelKey,
      status: panel?.complete ? 'pass' : 'missing_panel',
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
      status: rule.complete ? 'pass' : 'missing_alert',
    };
  });

  const sustainedRows = buildSustainedRows({ mappingRows, metricsBySignal });

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

| Threshold key | Source reference | Alert rule id | Expression | Window | Routing target | Status |
| --- | --- | --- | --- | --- | --- | --- |
${thresholdRows
  .map(
    (r) =>
      `| \`${r.thresholdKey}\` | \`${r.sourceReference}\` | \`${r.alertRuleId}\` | \`${r.expression}\` | \`${r.window}\` | \`${r.routingTarget}\` | \`${r.status}\` |`
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

  const currentMappingPath = mappingPath();
  const mappingRaw = await fs.readFile(currentMappingPath, 'utf8');
  const mappingRows = parseMarkdownTableRows(mappingRaw, currentMappingPath);
  assertThresholdTraceability(mappingRows);
  const dashboardPanelKeys = normalizeDashboardSnapshot(dashboardSnapshot);
  const alertRulesByThreshold = normalizeAlertSnapshot(alertSnapshot);
  const metricsBySignal = normalizeMetricsSnapshot(metricsSnapshot);

  const markdown = renderArtifact({
    mappingRows,
    dashboardPanelKeys,
    alertRulesByThreshold,
    metricsBySignal,
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
  if (options.requireSustainedValidationWindows) {
    assertSustainedValidationWindows(
      collectSustainedValidationWindowBlockers(
        buildSustainedRows({
          mappingRows,
          metricsBySignal,
        })
      )
    );
  }
}

main().catch((error) => {
  process.stderr.write(
    `[ar-c2:evidence] FAIL ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
