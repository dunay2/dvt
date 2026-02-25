#!/usr/bin/env bash
set -euo pipefail

# Cross-runtime deterministic check using the same inline vector.
# Node runs compiled JS; Bun/Deno run TS directly.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[1/4] build"
cd "$ROOT_DIR"
pnpm build

echo "[2/4] node"
NODE_OUT="$(node dist/test/cross-runtime-print-planid.js)"

echo "[3/4] bun"
BUN_OUT="$(bun test/cross-runtime-print-planid.ts)"

echo "[4/4] deno"
DENO_OUT="$(deno run --allow-env test/cross-runtime-print-planid.ts)"

echo "node=$NODE_OUT"
echo "bun=$BUN_OUT"
echo "deno=$DENO_OUT"

if [[ "$NODE_OUT" != "$BUN_OUT" ]]; then
  echo "Mismatch: node != bun"
  exit 1
fi
if [[ "$NODE_OUT" != "$DENO_OUT" ]]; then
  echo "Mismatch: node != deno"
  exit 1
fi

echo "OK: identical planId across runtimes"
