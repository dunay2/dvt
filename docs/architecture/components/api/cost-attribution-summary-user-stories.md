---
title: Cost Attribution Summary User Stories
status: Active
owner: API / Runtime
last_reviewed: 2026-05-24
planning_type: architecture
---

# Cost Attribution Summary User Stories

1. As a finance operator, I want tenant-scoped run usage facts so that billing
   analysis starts from backend-owned evidence instead of UI mock data.
2. As a platform operator, I want cost money fields to be explicitly unavailable
   until provider credits are captured so that the system does not report fake
   dollars.
3. As an API consumer, I want project and environment filters to use the same
   protected runtime authorization scope as run listing so that attribution data
   cannot leak across tenants.
4. As a future billing integrator, I want per-step duration facts and per-run
   rollups so that invoice logic can attach monetary data later without
   reinterpreting raw event streams.
