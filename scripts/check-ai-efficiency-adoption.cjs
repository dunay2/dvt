/**
 * @file scripts/check-ai-efficiency-adoption.cjs
 * @ownedConcern Validate the RC-C2 AI-efficiency adoption log before the task can be closed.
 */
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const defaultLogPath = path.join(
  process.cwd(),
  'docs',
  'planning',
  'status',
  'ai-efficiency-adoption-log.yaml'
);

function numberFrom(value, name) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for ${name}.`);
  }
  return parsed;
}

function calculateRcu({ interactiveRounds, toolCalls, avoidableValidationReruns }) {
  const rcu =
    numberFrom(interactiveRounds, 'interactiveRounds') +
    numberFrom(toolCalls, 'toolCalls') * 0.25 +
    numberFrom(avoidableValidationReruns, 'avoidableValidationReruns') * 0.75;
  return Math.round(rcu * 100) / 100;
}

function readMetric(source, snakeName, camelName) {
  return source[camelName] ?? source[snakeName];
}

function normalizeBaseline(rawBaseline = {}) {
  return {
    interactiveRounds: readMetric(rawBaseline, 'interactive_rounds', 'interactiveRounds'),
    toolCalls: readMetric(rawBaseline, 'tool_calls', 'toolCalls'),
    avoidableValidationReruns: readMetric(
      rawBaseline,
      'avoidable_validation_reruns',
      'avoidableValidationReruns'
    ),
    rcuTotal: readMetric(rawBaseline, 'rcu_total', 'rcuTotal'),
  };
}

function normalizeTargets(rawTargets = {}) {
  return {
    minRoundReductionPct: readMetric(rawTargets, 'min_round_reduction_pct', 'minRoundReductionPct'),
    requiredConsecutiveCycles: readMetric(
      rawTargets,
      'required_consecutive_cycles',
      'requiredConsecutiveCycles'
    ),
  };
}

function normalizeCycle(rawCycle = {}) {
  return {
    lane: rawCycle.lane,
    pr: rawCycle.pr,
    usedHygienePreflight: readMetric(rawCycle, 'used_hygiene_preflight', 'usedHygienePreflight'),
    verifyPrepushBeforePush: readMetric(
      rawCycle,
      'verify_prepush_before_push',
      'verifyPrepushBeforePush'
    ),
    ciFirstRedTriage: readMetric(rawCycle, 'ci_first_red_triage', 'ciFirstRedTriage'),
    noPushTimeFormatLintSurprises: readMetric(
      rawCycle,
      'no_push_time_format_lint_surprises',
      'noPushTimeFormatLintSurprises'
    ),
    interactiveRounds: readMetric(rawCycle, 'interactive_rounds', 'interactiveRounds'),
    toolCalls: readMetric(rawCycle, 'tool_calls', 'toolCalls'),
    avoidableValidationReruns: readMetric(
      rawCycle,
      'avoidable_validation_reruns',
      'avoidableValidationReruns'
    ),
  };
}

function isAcceptedTriageValue(value) {
  return value === 'log_first' || value === 'not_applicable';
}

function isQualifyingCycle(rawCycle, rawBaseline, rawTargets) {
  const cycle = normalizeCycle(rawCycle);
  const baseline = normalizeBaseline(rawBaseline);
  const targets = normalizeTargets(rawTargets);
  const reasons = [];

  if (cycle.lane !== 'C') {
    reasons.push('cycle is not Lane C');
  }
  if (!cycle.pr || !cycle.pr.number || !cycle.pr.url) {
    reasons.push('cycle is missing PR number or URL');
  }
  if (cycle.usedHygienePreflight !== true) {
    reasons.push('hygiene preflight was not used');
  }
  if (cycle.verifyPrepushBeforePush !== true) {
    reasons.push('verify:prepush did not run before push');
  }
  if (!isAcceptedTriageValue(cycle.ciFirstRedTriage)) {
    reasons.push('first-red CI triage is not log_first or not_applicable');
  }
  if (cycle.noPushTimeFormatLintSurprises !== true) {
    reasons.push('push-time format/lint surprise was recorded');
  }

  const rcuTotal = calculateRcu(cycle);
  const roundReductionPct =
    ((numberFrom(baseline.interactiveRounds, 'baseline.interactiveRounds') -
      numberFrom(cycle.interactiveRounds, 'cycle.interactiveRounds')) /
      numberFrom(baseline.interactiveRounds, 'baseline.interactiveRounds')) *
    100;

  if (
    roundReductionPct < numberFrom(targets.minRoundReductionPct, 'targets.minRoundReductionPct')
  ) {
    reasons.push('round reduction target was not met');
  }

  return {
    qualifies: reasons.length === 0,
    reasons,
    rcuTotal,
    roundReductionPct: Math.round(roundReductionPct * 10) / 10,
  };
}

function analyzeAdoptionLog(rawLog) {
  const baseline = normalizeBaseline(rawLog.baseline);
  const targets = normalizeTargets(rawLog.targets);
  const requiredConsecutiveCycles = numberFrom(
    targets.requiredConsecutiveCycles,
    'targets.requiredConsecutiveCycles'
  );
  const cycles = Array.isArray(rawLog.cycles) ? rawLog.cycles : [];
  const analyzedCycles = cycles.map((cycle) => ({
    cycle,
    result: isQualifyingCycle(cycle, baseline, targets),
  }));

  let consecutiveQualifyingCycles = 0;
  for (let index = analyzedCycles.length - 1; index >= 0; index -= 1) {
    if (!analyzedCycles[index].result.qualifies) {
      break;
    }
    consecutiveQualifyingCycles += 1;
  }

  const readyToClose = consecutiveQualifyingCycles >= requiredConsecutiveCycles;
  const summary = `${consecutiveQualifyingCycles}/${requiredConsecutiveCycles} qualifying consecutive cycles; RC-C2 ${
    readyToClose ? 'is ready to close' : 'must remain open'
  }.`;

  return {
    initiativeId: rawLog.initiative_id ?? rawLog.initiativeId,
    readyToClose,
    requiredConsecutiveCycles,
    consecutiveQualifyingCycles,
    analyzedCycles,
    summary,
  };
}

function loadAdoptionLog(logPath = defaultLogPath) {
  return yaml.load(fs.readFileSync(logPath, 'utf8'));
}

function runCli(argv = process.argv.slice(2)) {
  const requireReady = argv.includes('--require-ready');
  const logPathIndex = argv.indexOf('--log');
  const logPath = logPathIndex === -1 ? defaultLogPath : path.resolve(argv[logPathIndex + 1]);
  const result = analyzeAdoptionLog(loadAdoptionLog(logPath));

  console.log(result.summary);
  for (const [index, cycle] of result.analyzedCycles.entries()) {
    const pr = cycle.cycle.pr?.number ?? `cycle-${index + 1}`;
    const state = cycle.result.qualifies
      ? 'qualifies'
      : `does not qualify: ${cycle.result.reasons.join('; ')}`;
    console.log(`- ${pr}: ${state}`);
  }

  if (requireReady && !result.readyToClose) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  analyzeAdoptionLog,
  calculateRcu,
  isQualifyingCycle,
  loadAdoptionLog,
  runCli,
};
