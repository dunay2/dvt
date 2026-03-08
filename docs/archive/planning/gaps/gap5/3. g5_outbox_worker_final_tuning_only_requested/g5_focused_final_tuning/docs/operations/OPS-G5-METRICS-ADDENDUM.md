---
title: OPS G5 — Metrics Addendum
status: Draft
owner: docs
last_reviewed: 2026-03-08
---

# OPS G5 — Metrics Addendum

## New metric

`outbox_records_exhausted_retries_total{topic, subscriber, side_effect_kind}`

## Meaning

Number of outbox records that would otherwise qualify for another retry but were moved to terminal handling because retry budget was exhausted.

## Operational use

This metric is meant to answer:

- Are transient failures actually recovering?
- Are we sending records to DLQ because the backoff envelope is too small?
- Is a subscriber drifting into a failure mode that looks transient but never heals?

## Suggested dashboard panels

- exhausted retries by topic,
- exhausted retries by subscriber,
- exhausted retries vs dead-lettered total,
- exhausted retries vs successful deliveries after retry.

## Suggested alert

Page or ticket when the metric is non-zero beyond the service baseline and coincides with growth in record age or DLQ volume.
