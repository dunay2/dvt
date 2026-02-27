    # ADR-0001: SSE as the MVP UI transport

    - **Status**: Accepted
    - **Date**: 2026-02-23

    ## Context
    We need browser-native streaming to render per-node status (colors) with low complexity.

    ## Decision
    Use SSE. Use monotonic per-run `seq` as SSE `id` to support `Last-Event-ID` catch-up.

    ## Consequences
    One-way only; sufficient for run status feed. WebSocket can be added later if required.

    ## References
    - https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

- https://developer.mozilla.org/en-US/docs/Web/API/EventSource
