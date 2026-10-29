# Code with inline components — Monaco pilot

Owner: [CODECOMP1.1 / #3751](https://github.com/dunay2/dvt/issues/3751).
Prospective scope: [authorized laboratory](https://github.com/dunay2/dvt/issues/3751#issuecomment-6506809339).

This isolated laboratory uses the installed Monaco **0.56.0**, the existing
application editor theme/options and global CSS tokens. It does not change
production workspaces, APIs, dependencies, persistence or authoring authority.

From the repository root:

```sh
pnpm --filter @dvt/web exec vite ../../labs/codecomp1-monaco --config ../../labs/codecomp1-monaco/vite.config.mjs
```

Open <http://127.0.0.1:5188>. The server binds to loopback only.

The same editor and text model display all SQL plus two independently inspectable
cards. Public view zones reserve space; public overlay widgets expose keyboard
controls. Definitions and fields are read-only. Native Monaco typing, selection
and undo/redo remain the only text/history mechanisms.

Any edit immediately removes cards. **Validar ejemplo** only accepts the exact
declared example document and its explicit reference ranges. Use native Undo to
return to that document, then validate again. This demonstrates the agreed dirty
presentation policy; it does not analyze arbitrary SQL, call a simulated server
or claim a production revision is valid. The fixture is labelled in the page.

Production admission still needs the real `AnalyzeSelectedDbtModel` Web consumer,
accepted Canvas/model context, scoped revision verification, guarded definition
navigation and corresponding tests. Native Substrait anchors are not SQL ranges.
The unavailable earlier pilot bundle is not used or purported to be reviewed.

Responsibilities:

- `fixture.mjs`: explicit example document, identities, reference spans and schemas.
- `cards.mjs`: passive public Monaco widgets/zones and their disposal.
- `pilot.mjs`: one editor session, exact example verification and inspection.
- `pilot.css`: layout using existing application tokens.
- `vite.config.mjs`: isolated loopback server/build using installed packages.
- `.lintstagedrc.json`: normal pre-commit formatting/lint for the lab file types.

Build without changing production output:

```sh
pnpm --filter @dvt/web exec vite build ../../labs/codecomp1-monaco --config ../../labs/codecomp1-monaco/vite.config.mjs
```

The output goes to the ignored `.dvt/codecomp1-monaco-build` directory.
