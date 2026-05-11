---
sidebar_position: 1
title: Overview
---

# Frontend overview

The Next.js frontend (`packages/nextjs/`) is the surface you'll spend
most of your time in. It's organized around two ideas:

1. **One page per EVVM operation.** Every signature builder gets a
   dedicated page so you can see the exact inputs and outputs.
2. **A self-hosted block explorer.** EVVMScan lives at `/evvmscan` and
   indexes the local chain entirely in the browser.

## Top-level routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page with deployed addresses and quick links |
| `/evvm/register` | Mint your initial EVVM balance (calls `Core.addBalance`) |
| `/evvm/payments` | EVVM `pay` and `dispersePay` |
| `/evvm/staking` | Golden / presale / public staking |
| `/evvm/nameservice` | Register, renew, manage username metadata |
| `/evvm/p2pswap` | Make and dispatch P2P orders |
| `/evvm/treasury` | Cross-chain deposit/withdraw flows |
| `/evvm/status` | System status (admin/proposal queue, contract addresses) |
| `/evvmscan` | Block explorer for the local chain |
| `/services` | Index of your custom-deployed services |
| `/services/<slug>` | Auto-generated UI for a single custom service |
| `/faucet` | Top up your MATE balance |
| `/config` | Frontend configuration (RPC URL override, project ID) |
| `/docs` | This documentation site |

## The shell

The shell is rendered by `packages/nextjs/src/components/shell/`:

- **`TopBar`** — the horizontal nav at the top, with a mobile drawer
  fallback on narrow screens
- **`navItems.ts`** — single source of truth for the menu structure
- **`icons.tsx`** — inline SVG icon set used by the nav and the design
  system

The active nav item is highlighted automatically based on the URL
pathname.

## Wallet integration

Connections go through [`@reown/appkit`](https://reown.com/appkit) (the
new name for WalletConnect). On localhost, **WalletConnect doesn't
work** — import the test private key directly into MetaMask/Rabby
instead. The home page also has a one-click "Use Test Account" button.

## Design system

Every page uses the **UI Pro Max** primitives in
`packages/nextjs/src/components/ui/`:

- `Button`, `Input`, `Select`, `Card`, `Badge`, `Code`, `EmptyState`,
  `Skeleton`, `Stat`
- Token scale defined in `src/styles/globals.css`
- Fonts: Fira Sans + Fira Code, dark-by-default with a manual toggle

If you're building a custom service UI by hand (rather than using the
auto-UI), import these primitives so your pages match.
