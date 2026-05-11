---
slug: /
sidebar_position: 1
title: Introduction
---

# Scaffold-EVVM

**The complete development environment for the EVVM ecosystem.**

Scaffold-EVVM bootstraps a local EVVM stack — six core contracts, a Next.js
frontend with signature constructors for every operation, an in-browser block
explorer, and a "drop-in" custom service workflow — with a single command.

## What you get

- 🧙 **Interactive CLI wizard** — Guided setup for framework, contracts, and configuration
- 📦 **Bundled contracts** — Production-ready EVVM contracts auto-cloned and compiled
- ⛓️ **Local chain** — Anvil or Hardhat Network on port 8545 with funded accounts
- 🎨 **Signature constructor frontend** — 23+ ready-to-use forms for every EVVM operation
- 🔭 **EVVMScan** — Etherscan-style block explorer at `/evvmscan` for the local chain
- 🧩 **Custom services** — Drop a `.sol` file, get an auto-deployed contract with an auto-generated UI
- 🔐 **EIP-191 meta-transactions** — Gasless signing with a dual-executor model

## When to use Scaffold-EVVM

You're a good fit if you want to:

- **Learn EVVM hands-on** — Send pays, register names, stake MATE, swap tokens, all from a UI built specifically to teach the protocol
- **Build a service on top of EVVM** — Write your contract, drop it in `services/`, and ship a working frontend without writing any wagmi/viem code
- **Contribute to EVVM core** — Run the full stack locally, modify any contract, redeploy in seconds

## What this documentation covers

- **[Getting Started](./getting-started/installation.md)** — Install, run the wizard, troubleshoot common issues
- **[Architecture](./architecture/overview.md)** — How the monorepo is organized and how the pieces fit together
- **[Concepts](./concepts/meta-transactions.md)** — EIP-191 signatures, dual signatures, the dual executor model, nonces
- **[Core Contracts](./contracts/core.md)** — Reference for each of the six EVVM contracts
- **[Frontend Pages](./frontend/overview.md)** — Walkthrough of every interaction page
- **[EVVMScan](./explorer/overview.md)** — How to read the in-browser explorer
- **[Custom Services](./custom-services/overview.md)** — Author your own service in minutes
- **[CLI Reference](./cli/commands.md)** — Every command the wizard exposes

## Quick links

- 🌐 [evvm.org](https://evvm.org) · The EVVM website
- 📚 [evvm.info/docs](https://www.evvm.info/docs/intro) · The protocol documentation
- 🛠️ [github.com/EVVM-org/scaffold-evvm](https://github.com/EVVM-org/scaffold-evvm) · This repo
