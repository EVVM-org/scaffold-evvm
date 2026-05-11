---
sidebar_position: 1
title: Installation
---

# Installation

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org) | `>= 18` | Wizard, CLI, and frontend |
| npm | `>= 9` | Bundled with Node.js |
| [Git](https://git-scm.com/) | any | Cloning sources |
| [Foundry](https://book.getfoundry.sh/getting-started/installation) | latest | Compiling Solidity (required even when you choose the Hardhat framework, because Hardhat delegates compilation to forge) |

> **Why Foundry is always required:** scaffold-evvm uses a hybrid approach where
> Foundry is the source of truth for compilation. The Hardhat package wraps
> `forge build --via-ir` for tasks that need Hardhat's runtime semantics.

## Install scaffold-evvm

```bash
git clone https://github.com/EVVM-org/scaffold-evvm.git
cd scaffold-evvm
npm install
```

The first `npm install` installs every workspace under `packages/*`.
The docs site is pre-built into `packages/nextjs/public/docs/` so it
works as soon as the frontend is up — no extra setup is required for
reading. See [About the docs](#about-the-docs) below if you want to
edit the docs.

## Verify the install

```bash
node --version  # >= v18
forge --version
npm run cli help
```

`npm run cli help` should print the list of CLI commands without errors.

## About the docs

The docs site you're reading is pre-built and bundled into the Next.js
frontend at `packages/nextjs/public/docs/`. It loads instantly with no
extra setup — just visit `http://localhost:3000/docs/` once the frontend
is up.

**You only need the docs workspace if you want to edit the docs.** The
authoring workflow is:

```bash
npm run docs:install          # one-time install of @scaffold-evvm/docs
npm run docs                  # HMR dev server on http://localhost:3001
# edit MDX files under packages/docs/docs/, see live updates
npm run docs:build            # rebuild + refresh public/docs/ for everyone
```

## Next: run the wizard

You're done. Head to **[Quickstart](./quickstart.md)** to spin up the full
stack in one command.
