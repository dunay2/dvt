# Decisions (MVP)

## Product loop

Postgres is the **append authority** (deterministic ordering + replay). Kafka is the **distribution bus**. SSE is the **UI transport**.

## Why not logs

Logs are not a stable interface for replay and fan-out. This MVP uses typed events + projection for UI colors.

## References

- SSE: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- EventSource: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- Kafka: https://kafka.apache.org/documentation/
- Outbox: https://microservices.io/patterns/data/transactional-outbox.html
- Postgres UPSERT: https://www.postgresql.org/docs/current/sql-insert.html
