---
sidebar_position: 4
title: Two-terminal workflow
---

# Two-terminal workflow

Sometimes you want more control than the wizard gives you — for instance,
when you're iterating on contracts and want to redeploy without restarting
the frontend. Use the two-terminal workflow:

## Terminal 1 — Deploy contracts

```bash
npm run cli deploy
```

This:

- Spawns the local chain (anvil or hardhat) if one isn't already running
- Generates the deployment input file from your answers
- Runs the deploy script
- Updates the frontend `.env`

You can re-run this any time you change a contract; it will redeploy and
update the addresses without touching the frontend process.

## Terminal 2 — Frontend

```bash
npm run frontend
```

Starts `next dev` on port 3000. Hot-module reloads on every save. Picks
up `.env` changes from the deploy step automatically (Next.js does need to
restart for this — see *redeploy gotcha* below).

## Terminal 3 — (optional) Live block monitor

```bash
npm run monitor
```

A pretty-printed, ABI-decoded stream of every block, transaction, and
contract event on the local chain. Useful when you're debugging something
that doesn't surface in the frontend yet.

## Terminal 4 — (optional) Docs HMR for authors

```bash
npm run docs
```

Runs Docusaurus on port 3001 with `baseUrl: /docs/` and HMR. Open
`http://localhost:3001/docs/` directly to edit MDX content with live
reload. The static bundle at `localhost:3000/docs/` is unaffected
until you run `npm run docs:build` to refresh it.

## Redeploy gotcha

Next.js bakes `NEXT_PUBLIC_*` env vars into the bundle at server start.
If you redeploy contracts and the frontend keeps pointing at the old
addresses, restart the frontend process (`Ctrl+C`, then
`npm run frontend` again).

The wizard handles this automatically by clearing `.next/` and restarting
on each run.
