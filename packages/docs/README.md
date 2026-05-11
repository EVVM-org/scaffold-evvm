# @scaffold-evvm/docs

The MDX source for the docs site that ships at
`http://localhost:3000/docs/` inside scaffold-evvm.

The static build is committed to the repo at
`packages/nextjs/public/docs/`, so end users see real content
immediately after `npm install` — they never need to install or run
this workspace. **You only need to install this workspace when editing
the docs.**

## Authoring workflow

```bash
# From the repo root (one-time):
npm run docs:install

# HMR dev server on http://localhost:3001/docs/
npm run docs

# Edit MDX files under packages/docs/docs/, see live updates.
# When you're happy, rebuild the static bundle that everyone sees:
npm run docs:build
```

`docs:build` runs `docusaurus build` and copies the output into
`packages/nextjs/public/docs/`. Commit that directory along with your
MDX changes so other contributors see the new content without
rebuilding.

## Standalone hosting

For a standalone docs deployment (no Next.js):

```bash
npm run docs:build
npm run docs:serve   # serves the build on port 3001
```

Or upload `packages/docs/build/` to any static host (Netlify, Vercel,
GitHub Pages, evvm.info/docs, …).

## Source layout

- **`docs/`** — all MDX content, organized by the categories in
  [`sidebars.ts`](./sidebars.ts).
- **`src/css/custom.css`** — theme overrides matching scaffold-evvm's UI
  Pro Max design tokens (Fira Sans + Fira Code, dark by default).
- **`docusaurus.config.ts`** — `baseUrl: '/docs/'` so the site is
  always served at the same subpath.

For Docusaurus syntax see [docusaurus.io/docs](https://docusaurus.io/docs).
