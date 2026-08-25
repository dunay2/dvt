---
title: VTX1 visual cast drift closeout
status: Active
owner: web
last_reviewed: 2026-08-25
planning_type: closeout
---

# VTX1 visual cast drift closeout

## Problem

Visual authoring exposed `timestamptz`, while the VTX1 PostgreSQL visual compiler rejected that exact target type.

## Minimal correction

- keep the existing UI choice unchanged;
- admit PostgreSQL `timestamptz` in the existing compiler allow-list;
- add a regression test for the exact visual value;
- do not consolidate the duplicated lists in this compatibility fix.

## Follow-up ownership

SUB1 #2640/#2642 owns structural convergence of semantic discovery and visual projection. This closeout does not create another type registry or claim portable `jsonb`/PostgreSQL spellings as Substrait semantic identities.
