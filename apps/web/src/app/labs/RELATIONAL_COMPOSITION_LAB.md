# Relational Composition Lab

Branch-only experimental surface for REL1. Do not merge as product implementation without a separate integration decision.

Route:

```text
/lab/relational-composition
```

## What this lab is testing

- Keep Source and Transform cards compact.
- Keep Source -> composition branches visually simple.
- Represent relational semantics in one ephemeral composition glyph between inputs and the Transform.
- Allow the glyph/badge to summarize one operation (`INNER JOIN`) or a composition (`4 OPS`).
- Reveal full operation detail only on demand.
- Preserve the architectural rule that the glyph is presentation only; it is not a persisted Workspace Graph node and does not own canonical semantics.

## Scenarios

1. `Pendiente`
   - multiple input relations;
   - no canonical operation selected;
   - badge shows `RELATE`.

2. `JOIN simple`
   - one canonical-looking join presentation;
   - badge shows `INNER JOIN`;
   - detail shows the predicate.

3. `Composición compleja`
   - several operations represented by one glyph;
   - compact badge shows `4 OPS`;
   - opening the glyph reveals JOIN/JOIN/WINDOW/UNION steps.

## Deliberate limitations

- synthetic data only;
- no backend;
- no draft/CAS persistence;
- no Substrait mutation;
- no capability admission;
- no operation chooser yet;
- no attempt to prove final React Flow grouping architecture;
- no product route or PR should be created from this lab without review.

The goal is to decide the interaction and visual grammar first, then map the accepted result onto the existing Canvas read models and canonical Substrait authoring rails.
