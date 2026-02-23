    # ADR-0002: Postgres authority, Kafka distribution

    - **Status**: Accepted
    - **Date**: 2026-02-23

    ## Context
    We need deterministic replay and fan-out to multiple consumers.

    ## Decision
    Persist events in Postgres (authority). Publish persisted events to Kafka (bus).

    ## Consequences
    Avoids dual-write; supports replay from Postgres and distribution via Kafka.

    ## References
    - https://kafka.apache.org/documentation/

- https://microservices.io/patterns/data/transactional-outbox.html
