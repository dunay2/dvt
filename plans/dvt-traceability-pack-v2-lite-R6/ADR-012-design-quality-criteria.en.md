---
title: ADR-012 — Architecture & Design Validation Criteria (Quality Checklist)
status: Accepted
date: 2026-03-04
owners: Architecture / Engineering
---

# ADR-012 — Architecture & Design Validation Criteria

This ADR defines the **quality criteria** used during architecture and design reviews.

**Usage:** referenced by ADR-0000c and enforced via:

- PR checklist declarations (manual attestations),
- automated tools where possible,
- reviewer sign-off where automation cannot prove compliance.

## Criteria (grouped)

1. **Proven patterns and conventions**  
   Use well-known patterns appropriately (Factory/Strategy/Repository/etc.). Avoid forced patterns.

2. **DRY (avoid duplication)**  
   Duplication increases maintenance cost and defect probability. Controlled duplication may be acceptable across bounded contexts.

3. **Decoupling and modularity**  
   Prefer ports/adapters, DI, event-driven boundaries. Avoid cross-module imports that violate layering.

4. **Open/Closed (extensibility)**  
   Extend behavior by composition/configuration rather than editing stable core.

5. **DDD alignment (when applicable)**  
   Bounded contexts, aggregates, entities/value objects, domain events, no business logic leakage into infrastructure.

6. **Hexagonal architecture (ports/adapters)**  
   Domain/application layers must not depend on frameworks; depend on abstractions.

7. **CQRS (when justified)**  
   Separate command and query models/flows; avoid write paths returning read-model payloads unless justified.

8. **SOLID principles**  
   SRP/OCP/LSP/ISP/DIP as applicable. Prefer small interfaces and stable contracts.

9. **Testability**  
   Inject dependencies, enable mocks/stubs, maintain unit/integration/acceptance coverage.

10. **Security**  
    Validate inputs, authn/authz, OWASP, safe handling of sensitive data, tenant isolation, audit requirements.

11. **Performance and scalability**  
    Identify bottlenecks, caching/pagination/index strategy, concurrency design.

12. **Error handling and logging**  
    Deterministic error shapes, safe logs (no secrets/PII), actionable telemetry.

13. **Documentation and readability**  
    Clear naming, minimal but useful comments, external docs where needed.

14. **Externalized configuration**  
    Env/config separated from code; multi-environment deploys without code edits.

15. **Code style and conventions**  
    Lint/format, consistent naming, project-wide rules.

16. **Versioning and change control**  
    Clean commits, branching policy, contract versioning, release notes when applicable.

17. **Dependencies and package management**  
    Minimal, updated, vulnerability scanning, avoid lock-in where feasible.

18. **Maintainability**  
    Complexity control (cyclomatic), small files/classes, cohesive modules.

19. **Compliance (if applicable)**  
    GDPR/HIPAA/PCI etc. controls, auditability, retention/erasures, access logging.

20. **Deployability and CI/CD**  
    Incremental deploys, feature flags, API versioning, rollback strategies.

21. **Avoid reinventing the wheel**  
    Prefer mature OSS/standards unless you have explicit reasons.

## Domain-specific standards

For APIs, event-driven messaging, cloud-native operations, observability, advanced security/privacy, and supply-chain/SBOM standards, follow the guides under `docs/guides/`.

## References

- SOLID: https://en.wikipedia.org/wiki/SOLID
- DDD: https://domainlanguage.com/ddd/
- Hexagonal architecture: https://alistair.cockburn.us/hexagonal-architecture/
- CQRS: https://martinfowler.com/bliki/CQRS.html
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- DRY: https://en.wikipedia.org/wiki/Don%27t_repeat_yourself
