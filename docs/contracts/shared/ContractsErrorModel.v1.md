# ContractsErrorModel v1

## Status

- Status: Accepted
- Version: `v1`
- Owners: `packages/@dvt/contracts`
- Effective date: `2026-04-03`

## Purpose

`ContractsErrorModel.v1` is the canonical shared-kernel error contract for
public errors exported from `@dvt/contracts`.

It exists to make semantic error handling explicit and to prevent cross-package
control flow from depending on `Error.message` text.

## Required Fields

Every governed `@dvt/contracts` error instance MUST expose:

- `code`
- `messageKey`
- `messageParams`
- `message`

## Semantic Rules

- `code` is the stable high-level error class.
- `messageKey` is the stable presentation lookup key.
- `messageParams` is the structured metadata needed to render or inspect the
  error.
- `message` is diagnostic text only.

Callers MUST branch on `code`, `messageKey`, `messageParams`, or `instanceof`.
Callers MUST NOT parse or pattern-match `message`.

## Validation Response Contract

`ValidationErrorResponse` must expose:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "code": "CONTRACT_VALIDATION_FAILED",
  "messageKey": "contracts.validation.failed",
  "messageParams": {},
  "message": "Validation failed",
  "details": [
    {
      "path": "selection.selectedNodeIds.0",
      "code": "invalid_type",
      "message": "Expected string, received number"
    }
  ]
}
```

Rules:

- top-level semantics live in `code`, `messageKey`, and `messageParams`
- `details[].message` is diagnostic only
- callers should use `details[].path` and `details[].code` for machine logic

## Current Governed Surfaces

- `packages/@dvt/contracts/src/errors.ts`
- `packages/@dvt/contracts/src/validation.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlannerPolicyVocabulary.v2.ts`
- `packages/@dvt/artifacts/src/runtime/validateArtifactIntegrity.ts`

## Notes

- This contract does not introduce localization infrastructure.
- This contract does not require every nested Zod issue message to be
  internationalized.
- This contract is the shared-kernel counterpart to the structured engine error
  pattern already used in `@dvt/engine`.
