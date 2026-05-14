# AR-A7 Fowler Analysis: Delivery Domain Runtime Split

Date: 2026-05-14  
Author: Codex  
Task: AR-A7

## Architectural Reading

The active delivery package already has a good hexagonal shape for worker
orchestration: `OutboxWorkerRuntime` depends on `IOutboxStorage` and `IEventBus`,
and delivery owns outbox sharding policy. The remaining drift was below the
port: the in-memory outbox state machine existed twice, once in Delivery and
once in Engine.

## Fowler Comparison

Mature systems centralize policy and state-transition rules in the owning
bounded context. Other contexts may expose compatibility facades, but they do
not copy retry, dead-letter, replay, stream-ordering, and claim eligibility
logic.

AR-A7 moves the in-memory outbox state machine into
`InMemoryOutboxStorageCore`, owned by Delivery, and leaves Engine with an
adapter facade.

## Improved Patterns

- **Duplicate Semantics Removed**: Delivery and Engine no longer carry separate
  in-memory outbox state machines.
- **Ports and Adapters**: Engine retains `InMemoryOutboxState` as an adapter
  name while delegating to the Delivery-owned core.
- **Semantic Architecture Guard**: the guard checks ownership and forbidden
  local state-machine internals, not only barrel thinness.
- **Component Documentation**: the public API, invariants, transitions, and
  consumers now live in a component guide.

## Anti-Patterns Detected

- **Boundary drift**: Engine had local delivery retry and dead-letter rules.
- **Documentation drift**: Delivery docs said the package owns runtime concerns,
  but did not name the in-memory outbox state machine as a component.
- **Test-only confidence**: prior tests proved behavior in both packages but did
  not prevent the two implementations from diverging later.

## Components Grouped

- `InMemoryOutboxStorageCore`: Delivery-owned state machine.
- `InMemoryOutboxStorage`: Delivery testing/local facade.
- `InMemoryOutboxState`: Engine adapter facade.
- `OutboxWorkerRuntime` / `OutboxWorker`: application orchestration that stays
  dependent on `IOutboxStorage`.

## Repetitions Fixed

- pending record arrays;
- dead-letter arrays;
- retry backoff calculation;
- stream head selection;
- dead-letter replay selection;
- tenant-scoped dead-letter listing.

## Opportunities Left

- durable adapter parity can be strengthened later with property tests that run
  the same behavior suite against PostgreSQL and the in-memory core;
- worker runtime loop reuse can be addressed separately if another runtime
  repeats lifecycle orchestration.

## Drift Fixed

- Code drift: Engine now delegates to Delivery for local/test outbox behavior.
- Documentation drift: Delivery docs now name the component, API, invariants,
  transitions, and consumers.
- Architecture-test drift: a semantic guard prevents reintroducing a local
  Engine state machine.

## Teaching For Future Work

When two bounded contexts need the same test/local adapter behavior, do not copy
the state machine. Put the reusable behavior behind the bounded context that
owns the domain semantics and let the other context keep only a named facade.
