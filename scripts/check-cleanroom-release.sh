#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cd "$ROOT_DIR"

npm run build
npm test
npm run provenance:check

PACK_JSON="$(npm pack --json)"
TARBALL="$(node -e "const pack = JSON.parse(process.argv[1]); process.stdout.write(pack[0].filename);" "$PACK_JSON")"

cd "$TMP_DIR"
npm init -y >/dev/null 2>&1
npm install "$ROOT_DIR/$TARBALL" >/dev/null
node --input-type=module <<'EOF'
import { SentinosClient } from "@sentinos/node";

if (typeof SentinosClient !== "function") {
  throw new Error("SentinosClient export missing from clean-room install.");
}

console.log("node sdk clean-room install smoke passed");
EOF
