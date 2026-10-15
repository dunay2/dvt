---
id: R-20261015-LAYER-RESULT-EVIDENCE
title: Temporal layer outcome ordering requires a drained rollout
status: Mitigating
date: 2026-10-15
owners:
  - adapter-temporal
severity: High
probability: Medium
---

# Temporal Layer Outcome Ordering Requires A Drained Rollout

## Risk

Recording confirmed sibling outcomes before RunFailed changes Temporal command
ordering for layers containing a failure before their final step. A worker with
the new code must not silently take ownership of old histories under an
assumption of replay compatibility. New-history replay is narrower evidence.

## Mitigation And Activation Boundary

- Follow the existing
  [drained cutover runbook](../runbooks/temporal-planref-drained-cutover-20260427.md).
  Preserve the current worker for its old executions until the canonical drain
  and activation conditions are satisfied. Integrating code is not activation.
- Do not delete history, reset Runs or restart shared workers as an automatic
  consequence of this change. If old-history compatibility is required instead,
  admit and verify that design before activation.
- Keep one deterministic global failure diagnostic, while recording all known
  step outcomes through the existing canonical event activity. An append failure
  must not fabricate an acknowledgement or completion counter.
- Verify mixed outcomes at every failure position and replay the resulting real
  Temporal histories. Preserve existing cancellation and recovery coverage.

## Evidence And Residual Scope

[ED-20261015-layer-result-evidence](../evidence/ED-20261015-layer-result-evidence.md)
records the actual checks and their limits. The slice fixes outcome loss in the
existing runtime; it does not enable multi-publication, a global output list,
explicit Sinks or a concurrency scheduler. Those existing capability gaps remain
on their governing issues, not as newly accepted debt.

The risk stays open until the operator records the real deployment's drain and
activation evidence. No deployment or destructive recovery is authorized by this
document alone.
