# Contract Template (v1)

[← Back to Contracts Registry](./README.md)

Use this template to author new contracts in a normalized, discoverable format.

---

## 0) Header

```md
# <Contract Name> (Normative v1)

[← Back to Contracts Registry](../README.md)

**Status**: DRAFT
**Version**: v1
**Stability**: <short policy>
**Scope**:
**Consumers**: <component list>
**References**: <links>
**Related Contracts**:
**Supersedes**: None  
**Phase**:
**Parent Contract**:
```

> If the file is directly under `contracts/`, use `./README.md`.
> If it is inside a subfolder (`engine/`, `security/`, etc.), use `../README.md`.

---

## 1) Purpose

- What this contract governs.
- Explicit in-scope behavior.
- Explicit out-of-scope behavior.

---

## 2) Normative Rules (MUST / MUST NOT)

### MUST

- Rule 1
- Rule 2

### MUST NOT

- Rule A
- Rule B

---

## 3) Contract Surface

Include interface/type/schema definitions that are authoritative for this contract.

```ts
// Example
interface ExampleContract {
  execute(input: unknown): Promise<unknown>;
}
```

---

## 4) Invariants

- Invariant 1
- Invariant 2
- Invariant 3

---

## 5) Validation / Error Model

- Required validation checks.
- Canonical error codes.
- Idempotency / ordering constraints if applicable.

---

## 6) Compatibility

- Backward-compatibility expectations.
- Breaking-change rules.
- Migration notes when relevant.

---

## 7) Cross-References

- Related contracts
- Schemas / adapters
- Operational guides

---

## 8) Change Log

- **v1 (YYYY-MM-DD)**: Initial draft.
