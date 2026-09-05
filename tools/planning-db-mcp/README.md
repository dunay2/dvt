# Planning DB MCP Adapter

This local adapter exposes the existing read-only Planning DB query command as
one MCP tool. It does not accept SQL, modify Planning DB, refresh/import its
projections, or expose PostgreSQL.

## Install and run

From the repository root, install the repository dependencies and build the
runtime dependency used by `scripts/planning-db-query.cjs`:

```bash
pnpm install --frozen-lockfile
pnpm --filter @dvt/crypto build
```

Then install and run the isolated MCP package:

```bash
cd tools/planning-db-mcp
pnpm --ignore-workspace install --frozen-lockfile
pnpm --ignore-workspace test
pnpm --ignore-workspace start
```

The endpoint is `http://127.0.0.1:3333/mcp`. If that port is already occupied,
set `DVT_PLANNING_DB_MCP_PORT` before starting. In PowerShell:

```powershell
$env:DVT_PLANNING_DB_MCP_PORT = '3334'
pnpm --ignore-workspace start
```

The process inherits the same database environment as the canonical Planning
DB CLI. Credentials must remain in the operator environment.

## Inspect locally

With the server running, the official MCP Inspector CLI can list the single
tool:

```bash
pnpm dlx @modelcontextprotocol/inspector --cli http://127.0.0.1:3333/mcp --transport http --method tools/list
```

Call a bounded query through Inspector:

```bash
pnpm dlx @modelcontextprotocol/inspector --cli http://127.0.0.1:3333/mcp --transport http --method tools/call --tool-name planning_db_query --tool-arg query=architecture-designs --tool-arg limit=2
```

The adapter admits only the seven queries listed by the tool schema. Unknown
queries, invalid component identifiers, unsupported arguments, and limits over
200 fail before the Planning DB process is started.

## Remote connection posture

Keep the server bound to `127.0.0.1`. A remote MCP client must reach this local
HTTP endpoint through an operator-controlled secure tunnel. Point the tunnel at
the MCP port, never the PostgreSQL port. This package deliberately does not add
public binding, authentication, deployment, or credential storage.
