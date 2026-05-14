const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  analyzeAdoptionLog,
  calculateRcu,
  isQualifyingCycle,
} = require('./check-ai-efficiency-adoption.cjs');

test('calculateRcu applies the RC-C2 cost model', () => {
  assert.equal(
    calculateRcu({ interactiveRounds: 12, toolCalls: 36, avoidableValidationReruns: 2 }),
    22.5
  );
});

test('isQualifyingCycle requires Lane C, preflight, prepush, clean push, and round reduction', () => {
  const baseline = {
    interactiveRounds: 22,
    toolCalls: 58,
    avoidableValidationReruns: 7,
    rcuTotal: 41.75,
  };
  const targets = { minRoundReductionPct: 20 };

  const qualifying = {
    lane: 'C',
    pr: { number: 1201, url: 'https://github.com/dunay2/dvt/pull/1201' },
    usedHygienePreflight: true,
    verifyPrepushBeforePush: true,
    ciFirstRedTriage: 'not_applicable',
    noPushTimeFormatLintSurprises: true,
    interactiveRounds: 16,
    toolCalls: 34,
    avoidableValidationReruns: 1,
  };

  assert.equal(isQualifyingCycle(qualifying, baseline, targets).qualifies, true);
  assert.equal(
    isQualifyingCycle({ ...qualifying, usedHygienePreflight: false }, baseline, targets).qualifies,
    false
  );
  assert.equal(
    isQualifyingCycle({ ...qualifying, interactiveRounds: 19 }, baseline, targets).qualifies,
    false
  );
});

test('analyzeAdoptionLog only closes after the required consecutive qualifying window', () => {
  const log = {
    initiative_id: 'RC-C2',
    baseline: {
      interactive_rounds: 22,
      tool_calls: 58,
      avoidable_validation_reruns: 7,
      rcu_total: 41.75,
    },
    targets: {
      min_round_reduction_pct: 20,
      required_consecutive_cycles: 3,
    },
    cycles: [
      {
        lane: 'C',
        pr: { number: 1201, url: 'https://github.com/dunay2/dvt/pull/1201' },
        used_hygiene_preflight: true,
        verify_prepush_before_push: true,
        ci_first_red_triage: 'not_applicable',
        no_push_time_format_lint_surprises: true,
        interactive_rounds: 16,
        tool_calls: 34,
        avoidable_validation_reruns: 1,
      },
      {
        lane: 'C',
        pr: { number: 1202, url: 'https://github.com/dunay2/dvt/pull/1202' },
        used_hygiene_preflight: true,
        verify_prepush_before_push: true,
        ci_first_red_triage: 'log_first',
        no_push_time_format_lint_surprises: true,
        interactive_rounds: 15,
        tool_calls: 32,
        avoidable_validation_reruns: 1,
      },
      {
        lane: 'C',
        pr: { number: 1203, url: 'https://github.com/dunay2/dvt/pull/1203' },
        used_hygiene_preflight: true,
        verify_prepush_before_push: true,
        ci_first_red_triage: 'not_applicable',
        no_push_time_format_lint_surprises: true,
        interactive_rounds: 14,
        tool_calls: 30,
        avoidable_validation_reruns: 0,
      },
    ],
  };

  const result = analyzeAdoptionLog(log);

  assert.equal(result.readyToClose, true);
  assert.equal(result.consecutiveQualifyingCycles, 3);
});

test('analyzeAdoptionLog reports open status when cycles are absent', () => {
  const result = analyzeAdoptionLog({
    initiative_id: 'RC-C2',
    baseline: {
      interactive_rounds: 22,
      tool_calls: 58,
      avoidable_validation_reruns: 7,
      rcu_total: 41.75,
    },
    targets: {
      min_round_reduction_pct: 20,
      required_consecutive_cycles: 3,
    },
    cycles: [],
  });

  assert.equal(result.readyToClose, false);
  assert.equal(result.consecutiveQualifyingCycles, 0);
  assert.match(result.summary, /0\/3 qualifying consecutive cycles/);
});
