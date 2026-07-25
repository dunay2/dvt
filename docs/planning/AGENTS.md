# Planning Agent Instructions

Read `/DELIVERY_CONTROL.md` before changing any file under `docs/planning/**`.

Planning and design documentation are mandatory. They must describe the single
current active design and delivery state.

- Update the existing canonical document in place when the design changes.
- Create a new canonical document only for a genuinely new architectural subject,
  not for a draft, review pass, correction, control cycle, or closeout stage.
- Do not preserve superseded intermediate states as additional active documents.
  Git preserves their history.
- A control cycle with no material implementation delta returns
  `NO MATERIAL DELTA` and creates no branch, commit, PR, review, or closeout file.
- Corrections are issued against the active implementation path and incorporated
  into the same current design.
- Implementation handoffs belong on the active PR or control channel and contain
  what changed, how, why, proof, remaining work, and deviations. They are not new
  canonical planning documents.

If another procedural guide appears to require a separate artifact merely to
preserve an intermediate stage, `/DELIVERY_CONTROL.md` governs: consolidate the
truth into the active canonical surface.