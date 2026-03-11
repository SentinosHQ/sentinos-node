#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.cwd(), 'packages/sentinos-node');
const clientsDir = path.join(root, 'src/clients');
const outputPath = path.resolve(process.cwd(), 'apps/docs/docs/sdk/reference/node-method-index.md');

const files = (await readdir(clientsDir)).filter((name) => name.endsWith('.ts')).sort();
const rows = [];

for (const file of files) {
  const source = await readFile(path.join(clientsDir, file), 'utf8');
  const classMatch = source.match(/export class\s+(\w+)/);
  if (!classMatch) continue;
  const clientName = classMatch[1];
  const regex = /\n\s+async\s+(\w+)\s*\(/g;
  for (const match of source.matchAll(regex)) {
    rows.push({ clientName, method: match[1] });
  }
}

const body = `---
title: Node Method Index
---

This reference is generated from the TypeScript/Node SDK source.

## Regeneration

\`\`\`bash
node packages/sentinos-node/scripts/generate-method-index.mjs
\`\`\`

## Source of Truth

- SDK source: \`/Users/gtomberlin/Documents/Code/Sentinos/packages/sentinos-node/src\`
- Runtime proof: \`pnpm --filter ./packages/sentinos-node seed:demo\`

## Method Table

| Client | Method | Notes |
|---|---|---|
${rows.map((row) => `| \`${row.clientName}\` | \`${row.method}\` | async |`).join('\n')}
`;

await writeFile(outputPath, body, 'utf8');
process.stdout.write(`wrote ${outputPath}\n`);
