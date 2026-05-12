---
sidebar_position: 1
title: Overview
---

# Custom services overview

Scaffold-EVVM is **the iteration loop for anyone shipping an EVVM
service**. Author a Solidity contract, drop it in `services/<YourService>/`,
run `npm run wizard`, and get:

- An **auto-deployed contract** on the local chain, with constructor
  arguments resolved automatically.
- An **auto-generated UI** at `/services/<your-service>` with read /
  write / events panels — and the right form per function role
  (admin / publicAction / publicPay).
- **First-class explorer integration** — EVVMScan decodes your
  service's calls and event logs with your ABI.
- **Dual-signature wiring for free** — if your contract extends
  `EvvmService`, the auto-UI signs both the action and the EVVM-pay
  for you.

Zero wagmi/viem code required to ship a working frontend for a new
service. Zero testnet gas to fail fast.

> Looking for the canonical contract-author's reference? See
> [**How to make an EVVM service**](https://www.evvm.info/docs/HowToMakeAEVVMService)
> on evvm.info. This section is the scaffold-evvm shorthand for that
> workflow.

## When to use it

Custom services are the right tool when you want to:

- **Iterate on a new EVVM service** without burning testnet faucet
  rounds. Drop the file, hit the UI, see what breaks. Edit, rerun
  wizard, repeat.
- **Demo a contract** to a non-technical audience — the auto-UI is
  legible enough that they can drive it.
- **Test a contract end-to-end** through a real UI before investing
  in a bespoke frontend.
- **Build internal admin tooling** for a service whose users you
  don't need to design for.

## The two service shapes

| Kind | Inherits | Use when |
|------|----------|----------|
| **Plain contract** | Nothing | One-off demos / tooling that doesn't need gasless UX (the bundled `Counter` is this) |
| **EVVM service** | `EvvmService` | Real services — gasless dual-signature flows where users sign, fishers execute |

For a plain contract the auto-UI just calls functions via
`client.writeContract` (your wallet pays gas). For an `EvvmService`
contract the auto-UI builds both signatures (action + EVVM-pay) and
submits them together — your wallet only ever signs, never spends
ETH on gas.

## When *not* to use it

The auto-UI is intentionally generic. If you need:

- Custom layouts beyond "list of read calls + list of write forms"
- A user flow that spans multiple contracts (e.g. an order-book UI)
- Real visual design polish for end users

…you'll outgrow the auto-UI. At that point write a regular Next.js
page under `packages/nextjs/src/app/your-service/` using the same
`packages/nextjs/src/components/ui/` primitives. The auto-UI is still
useful for development; just don't ship it as the final user
experience.

## What's next

- **[Folder convention](./folder-convention.md)** — directory layout
  the wizard expects
- **[Manifest](./manifest.md)** — how to annotate functions as admin
  / publicPay / publicAction so the auto-UI groups them correctly
- **[Auto-UI](./auto-ui.md)** — what the generated page actually
  renders for each function shape
- **[Examples](./examples.md)** — the bundled Counter, plus a full
  `EvvmService`-extending example (Tipjar) with the dual-signature
  pattern
