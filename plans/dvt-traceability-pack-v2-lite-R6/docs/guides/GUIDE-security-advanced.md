---
title: Guide — Advanced Security & Privacy (ASVS, GDPR basics)
status: Guide
tags: [security, asvs, privacy, gdpr]
---

# Advanced Security & Privacy (ASVS, GDPR basics)

Use this guide when changes affect:

- authentication/authorization
- tenant isolation / row-level security
- audit logging
- sensitive data handling

## 1) OWASP ASVS (choose a target level)

ASVS provides detailed verification requirements.

Reference:

- https://owasp.org/www-project-application-security-verification-standard/

Pragmatic recommendation:

- ARC-1/2: align to ASVS L1-L2 for relevant sections
- ARC-3: require an explicit ASVS delta note in ED

## 2) Privacy basics (GDPR-style principles)

If applicable:

- data minimization
- retention limits
- deletion/erasure workflows
- access logging

EU overview:

- https://commission.europa.eu/law/law-topic/data-protection/eu-data-protection-rules_en

## 3) Verification (recommended)

- Dependency scanning (OSV, pnpm audit)
- Authz tests for critical routes
- Threat model delta note for ARC-3 (short)

OSV Scanner:

- https://google.github.io/osv-scanner/
