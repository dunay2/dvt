---
title: MIGRATION-PLAN-EXISTING-OUTBOX-WORKER v1
status: Draft
owner: architecture
last_reviewed: 2026-03-08
---

# MIGRATION-PLAN-EXISTING-OUTBOX-WORKER v1

## 1. Problem

A reusable outbox worker core already exists inside engine code. G5 requires
moving to an independent runtime without creating double processing or leaving
permanent compatibility debt.

## 2. Migration strategy

Use **Option A: deprecate + rewrite around extracted contracts**.

That means:

- extract reusable contracts and delivery logic into the new package,
- keep the old in-engine worker only as a temporary wrapper,
- move operational ownership to the standalone worker package,
- remove the inline worker after cutover.

## 3. Transition principles

1. no dual-active ownership for the same topic,
2. topic allowlists define ownership during migration,
3. feature flags are environment-scoped,
4. migration is reversible per topic,
5. the standalone worker becomes the default target.

## 4. Phases

### Phase 0 — prepare the new package

- create `packages/@dvt/outbox-worker`,
- extract contracts and delivery classes,
- keep the old worker untouched functionally.

### Phase 1 — wrap old worker with extracted core

- old `OutboxWorker` delegates to extracted engine/delivery code,
- old runtime remains disabled by default in production,
- behavior parity tests are added.

### Phase 2 — standalone worker canary

- deploy standalone worker,
- configure `allowedTopics = ['lineage.export.requested']` or another canary,
- configure inline worker to exclude that topic,
- observe lag, retries, dead letters, and side effects.

### Phase 3 — expand topic ownership

- move one topic at a time from inline to standalone,
- keep explicit allowlists on both sides,
- verify no topic is active in both places.

### Phase 4 — disable inline runtime

- inline worker runtime defaults to disabled everywhere,
- old code remains as compatibility wrapper only if needed for local tests.

### Phase 5 — remove compatibility wrapper

- delete old inline runtime paths,
- keep only the standalone package.

## 5. Topic ownership controls

Introduce explicit configuration on both old and new runtimes:

```ts
export interface WorkerTopicOwnershipConfig {
  readonly enabled: boolean;
  readonly allowedTopics: readonly OutboxTopic[];
}
```

### Rule

A topic may appear in the `allowedTopics` set of only one production-active
polling runtime in an environment.

## 6. How duplication is avoided

During migration, duplication is prevented by **topic partitioning**, not by
hoping claims sort it out.

Reason:

- if old and new runtimes both claim the same topic, they will compete,
- that is operationally ambiguous even if `SKIP LOCKED` prevents same-row
  simultaneous claim,
- ownership must be explicit rather than emergent.

## 7. Compatibility wrapper requirement

The wrapper must not add new behavior. It exists only to:

- call the new delivery classes,
- preserve old entry points temporarily,
- support incremental repository migration.

## 8. Exit criteria

Migration is complete only when:

- standalone worker owns all intended polling topics,
- inline runtime is disabled in production,
- observability dashboards point to the standalone worker,
- old runtime code has either been removed or frozen outside normal execution.
