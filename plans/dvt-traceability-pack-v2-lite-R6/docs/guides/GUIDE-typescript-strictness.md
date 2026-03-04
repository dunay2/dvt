---
title: Guide — TypeScript Strictness (No `any`, contract-first)
status: Guide
tags: [typescript, strict, linting, no-any]
---

# TypeScript Strictness (No `any`, contract-first)

DVT+ uses strict TypeScript. This is a **team norm** and a quality gate.

Use when changes affect:

- TypeScript code
- contract boundary types
- adapters and ports

## 1) Baseline rules

- `any` is forbidden in application/core code
- boundary payloads must be validated (Zod/JSON Schema) at edges
- prefer `unknown` + refinement over `any`

## 2) Recommended tsconfig settings

- `"strict": true`
- `"noImplicitAny": true`
- `"exactOptionalPropertyTypes": true`
- `"noUncheckedIndexedAccess": true`

Reference:

- TSConfig strict: https://www.typescriptlang.org/tsconfig#strict

## 3) ESLint rules

- `@typescript-eslint/no-explicit-any`: error
- prefer explicit return types in public APIs (optional)

Reference:

- typescript-eslint: https://typescript-eslint.io/

## 4) Verification

- `pnpm typecheck` (or equivalent) must pass
- lint must fail on `any`
