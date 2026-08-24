# Substrait semantic IR spike

This directory is an isolated, removable architecture spike for VTX2.

It may contain fixtures, scripts, machine-readable reports and benchmarks used
to decide whether Substrait can be DVT's semantic transformation authority. It
must not be imported by product packages, applications, planner, runtime or
existing contracts.

The governing plan is
`docs/planning/reviews/20260824-substrait-semantic-ir-spike-plan.md`.

No result in this directory authorizes production adoption until the final gate
is recorded in the study report.
