# @dvt/dsl

Deterministic gateway-expression package for DVT runtimes.

Current reality:

- supports only `IDENT = LITERAL` expressions in DSL v1;
- rejects `AND`, `OR`, function calls, and side effects;
- is small on purpose and should not be described as a general policy engine.

Canonical docs:

- [`docs/architecture/shared/dsl.md`](../../../docs/architecture/shared/dsl.md)
