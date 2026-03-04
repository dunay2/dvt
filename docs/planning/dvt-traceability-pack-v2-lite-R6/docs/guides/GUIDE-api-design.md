---
title: Guide — API & Contract Design (OpenAPI, SemVer, Compatibility)
status: Guide
tags: [api, contracts, openapi, semver]
---

# API & Contract Design (OpenAPI, SemVer, Compatibility)

Use this guide when changes affect:

- public REST endpoints (OpenAPI)
- public contract payloads / schemas
- compatibility guarantees

## 1) OpenAPI baseline (REST)

If you expose REST APIs, define OpenAPI specs under `specs/openapi/`.

**Rules**

- Keep schemas reusable (`components/schemas`)
- Use consistent error shapes
- Prefer explicit pagination patterns
- Document auth (bearer/OAuth) and scopes

**References**

- OpenAPI spec: https://spec.openapis.org/oas/latest.html
- Microsoft API Guidelines: https://github.com/microsoft/api-guidelines
- Google API Design Guide: https://cloud.google.com/apis/design

## 2) Contract SemVer

Treat contracts as SemVer:

- **PATCH**: doc fixes / non-functional metadata
- **MINOR**: backward compatible additions (optional fields)
- **MAJOR**: breaking changes (rename/remove required fields)

**ARC mapping**

- MINOR additions usually ARC-2
- MAJOR breaking is ARC-3

## 3) Compatibility rules for JSON contracts

- Additive changes: add optional fields with defaults (compatible)
- Do not change meaning of existing fields without version bump
- Avoid making optional → required without MAJOR bump

## 4) Verification (recommended)

- Schema validation: Ajv (JSON Schema)
  - https://ajv.js.org/
- Golden vectors: example payloads validated in CI
- Diff tooling:
  - For OpenAPI: explore openapi-diff options at https://openapi.tools/
  - For schemas: deterministic golden vectors are usually more reliable than “semantic diffs”

## 5) ED notes for API/contract changes

In the ED:

- list contract IDs and versions touched
- include at least one example payload path
- describe compatibility impact in one sentence
