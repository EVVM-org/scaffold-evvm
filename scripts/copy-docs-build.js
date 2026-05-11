#!/usr/bin/env node
/**
 * Mirror the Docusaurus production build into the Next.js public folder
 * so the frontend serves /docs/* directly from disk — no proxy, no
 * second process, no install required for end users. The build at
 * `public/docs/` is committed to the repo so cloning + `npm install` is
 * enough to make the docs work.
 *
 * Source:  packages/docs/build/
 * Target:  packages/nextjs/public/docs/
 *
 * The target directory is wiped first so removed pages don't linger.
 */

import { existsSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

const src = join(root, 'packages', 'docs', 'build');
const dst = join(root, 'packages', 'nextjs', 'public', 'docs');

if (!existsSync(src)) {
  console.error(
    `[copy-docs-build] Docusaurus build not found at ${src}.\n` +
      `Run \`npm run docs:build\` from the project root (this script is ` +
      `chained from there) or \`npm run -w @scaffold-evvm/docs build\` first.`,
  );
  process.exit(1);
}

if (existsSync(dst)) {
  rmSync(dst, { recursive: true, force: true });
}
mkdirSync(dst, { recursive: true });
cpSync(src, dst, { recursive: true });

console.log(`[copy-docs-build] Copied ${src} → ${dst}`);
