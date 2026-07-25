# DVT Coding Agent Instructions

Before analysis, planning, implementation, review, or Git actions:

1. Read `/AGENTS.md`.
2. Read `/DELIVERY_CONTROL.md`.
3. Read the nearest scoped `AGENTS.md` for the files being changed.
4. Query the active Planning DB and repository before naming new product elements.

Architecture and documentation are mandatory and precede implementation. Keep one
current active design: update the same canonical documents and Planning DB records
in place when the design changes. Git preserves superseded intermediate states.

Do not create feature/design/status/evidence migrations. Planning DB migrations
are only for physical schema or indispensable bootstrap-seed changes.

Do not create review-only or red-only branches for a result owned by an active
implementation branch. Corrections and tests stay with that implementation.

A control cycle with no material implementation delta returns
`NO MATERIAL DELTA` and creates no branch, commit, PR, migration, review, or
closeout artifact.

After each material implementation iteration, report what changed, how, why,
exact proof, remaining work, and deviations on the active PR or control channel.