# ADR-0001: RFC 8785 Canonicalization (JCS)

Decision:

- Use `json-canonicalize` to canonicalize JSON according to RFC 8785.
- Compute hashes from canonical JSON only.

Rationale:

- Eliminates runtime-dependent object serialization behavior.
- Provides cross-language stable canonical format.
