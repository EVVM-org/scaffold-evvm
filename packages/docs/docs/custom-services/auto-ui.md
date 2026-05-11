---
sidebar_position: 4
title: Auto-UI
---

# The auto-generated UI

When you visit `/services/<your-service>`, scaffold-evvm reads the
deployed ABI + manifest and renders three panels:

## 1. Read panel

Every `view` and `pure` function is invoked on mount. The result is
displayed using a widget appropriate for its return type:

| Solidity return | Widget |
|-----------------|--------|
| `address` | Mono-spaced address with copy button |
| `uint256` (≥ 18 digits) | Both raw wei and human-formatted (assumes 18 decimals) |
| `bool` | Yes/No badge |
| `bytes` | Hex with collapse toggle |
| `string` | Plain text |
| Tuple | Two-column key-value table |
| Array | Bullet list (or table if the elements are tuples) |

Functions that take arguments still live in the read panel, but they
get an inline form so you can call them on demand.

## 2. Write panel

Every state-changing function (`nonpayable` / `payable` / dual-sig) gets
a form:

- **Plain functions** — one input per argument, plus a "Submit" button.
  The frontend calls `client.writeContract` with viem.
- **`tags.publicAction` functions** — same form, but the canonical EVVM
  plumbing parameters (`senderExecutor`, `originExecutor`, `nonce`,
  `isAsyncExec`, `signature`) are pre-filled and the action signature
  is built before submission.
- **`tags.publicPay` functions** — same form *plus* the EVVM-pay fields
  (`noncePay`, `isAsyncExecPay`, `priorityFee`, `signaturePay`,
  `tokenAddress`, `amount`). Both signatures are produced and submitted
  together.

The widget set matches the read panel — `address` inputs accept either
a hex address or `@username` and resolve via NameService.

## 3. Events panel

Every event the contract declares is tailed live with the same
ABI-driven decoder EVVMScan uses. Each entry shows:

- Event name
- Decoded arguments (with the same per-type widgets)
- Block number + relative timestamp
- A link to the emitting transaction

## Admin gating

Functions tagged `admin` in the manifest are grouped at the bottom of
the Write panel, behind a yellow "Admin actions" header and a tip that
the connected wallet must hold the admin role for the call to succeed.
The UI doesn't actually check the admin address — it just nudges; the
contract is the authority.

## What the UI does *not* do

- It doesn't sequence multi-step flows. If your service requires
  `init` → `lockNumber` → `finalize`, the UI surfaces all three as
  separate forms — you click them in order yourself.
- It doesn't handle ERC-20 approvals. If your write needs an `approve`
  beforehand, write a custom page or instruct the user manually.
- It doesn't poll reads on a tight interval. Reads refresh on mount and
  after a successful write.
