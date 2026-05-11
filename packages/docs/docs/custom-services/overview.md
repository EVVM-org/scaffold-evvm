---
sidebar_position: 1
title: Overview
---

# Custom services overview

Scaffold-EVVM lets you author a Solidity service contract, drop it in
`services/<YourService>/`, run the wizard, and get:

- An **auto-deployed** contract on the local chain, with constructor
  arguments resolved automatically
- An **auto-generated UI** at `/services/<your-service>` with read/write
  forms and live event tailing
- **First-class explorer integration** — the contract's calls and logs
  are decoded on EVVMScan with your ABI
- **Optional dual-signature wiring** — if your contract extends
  `EvvmService`, the auto-UI signs both the action and the EVVM-pay for
  you

Zero wagmi/viem code required to ship a working frontend for a new
service.

## When to use it

Custom services are the right tool when you want to:

- **Prototype a new EVVM service** without building a frontend
- **Demo a contract** to a non-technical audience (the auto-UI is
  legible enough that they can drive it)
- **Test a contract end-to-end** through a real UI before investing in a
  bespoke frontend
- **Build internal admin tooling** for a service whose users you don't
  need to design for

## When *not* to use it

The auto-UI is intentionally generic. If you need:

- Custom layouts beyond "list of read calls + list of write forms"
- A user flow that spans multiple contracts (e.g. an order-book UI)
- Real visual design polish for end users

…you'll outgrow the auto-UI. At that point write a regular Next.js page
under `packages/nextjs/src/app/your-service/` and use the same
`packages/nextjs/src/components/ui/` primitives the rest of the app
uses. The auto-UI is still useful for development; just don't ship it
as the final user experience.

## What's next

- **[Folder convention](./folder-convention.md)** — the directory layout
  the wizard expects
- **[Manifest](./manifest.md)** — how to annotate functions as admin /
  publicPay / publicAction so the auto-UI groups them correctly
- **[Auto-UI](./auto-ui.md)** — what the auto-generated page actually
  renders
- **[Examples](./examples.md)** — the bundled Counter example, plus
  patterns for services that extend EvvmService
