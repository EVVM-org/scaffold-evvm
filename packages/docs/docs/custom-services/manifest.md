---
sidebar_position: 3
title: Manifest
---

# manifest.json

The ABI alone tells the auto-UI *what* functions exist, but not *how to
treat them*. Should `withdrawRewards` be in the Admin section? Should
`buyTicket` be wrapped in the EVVM dual-signature flow? `manifest.json`
is where you say so.

It is **strictly optional** — without it the auto-UI still works,
classifying everything by Solidity mutability (view/pure → Read,
non-payable/payable → Write).

## Minimum shape

```json
{
  "name": "Your Service",
  "description": "What it does",
  "tags": {
    "admin":   ["pause", "unpause", "withdrawRewards"],
    "hidden":  []
  }
}
```

- **`name`** — display name on `/services` and in EVVMScan
- **`description`** — shown under the title on the service page
- **`tags.admin`** — function names that should appear under "Admin
  actions" instead of "Write"
- **`tags.hidden`** — function names that should never render in the UI
  (handy for internal helpers exposed as `external`)

## Full shape

```json
{
  "name": "Ticket Machine",
  "description": "Buy and redeem event tickets paid for in MATE.",
  "tags": {
    "admin": ["createEvent", "closeEvent", "setPrice", "transferOwnership"],
    "publicPay": ["buyTicket"],
    "publicAction": ["redeemTicket", "transferTicket"],
    "hidden": ["_internalHelper"]
  },
  "actions": {
    "buyTicket": {
      "actionPayload": ["uint256 eventId"]
    },
    "redeemTicket": {
      "actionPayload": ["uint256 ticketId"]
    },
    "transferTicket": {
      "actionPayload": ["uint256 ticketId", "address to"]
    }
  }
}
```

### `tags.publicPay` vs `tags.publicAction`

Both presume the contract inherits from `EvvmService`. The difference is
whether the call also moves money:

- **`publicPay`** — the function takes a fee in EVVM tokens. The auto-UI
  signs both the **action** and the **EVVM pay** (dual signature).
- **`publicAction`** — the function only requires the action signature
  (no fee transfer). The auto-UI signs only the action.

For both, the function must accept the canonical EVVM plumbing
parameters (`senderExecutor, originExecutor, nonce, isAsyncExec,
signature` for action; plus `noncePay, isAsyncExecPay, priorityFee,
signaturePay` for the pay). The auto-UI fills these in; you only enter
the business arguments.

### `actions.<methodName>.actionPayload`

The list of types the contract uses inside its
`keccak256(abi.encode("methodName", ...))` action hash. The auto-UI
needs this to reconstruct the exact same hash on the client before
signing.

For example, if your contract does:

```solidity
bytes32 actionHash = keccak256(abi.encode("buyTicket", eventId));
```

then your manifest declares:

```json
"actions": {
  "buyTicket": { "actionPayload": ["uint256 eventId"] }
}
```

The canonical plumbing fields (`senderExecutor`, `originExecutor`,
`nonce`, `isAsyncExec`, `evvmId`) are *not* part of `actionHash`.
They live in the unified envelope that wraps the hash before it's
EIP-191-signed and recovered by `Core.validateAndConsumeNonce`.
You only encode the operation name + the action's business arguments
inside the inner hash. See **[EIP-191
signatures](../concepts/eip-191-signatures.md)** for the full envelope
shape.

## Where the auto-UI uses each annotation

| Annotation | Effect on the page |
|------------|--------------------|
| `tags.admin` | Function moves to the "Admin" section, gated behind a "you must be the admin" hint |
| `tags.publicPay` | Function gets a dual-signature form with both nonces |
| `tags.publicAction` | Function gets a single-signature form |
| `tags.hidden` | Function isn't rendered |
| `actions.X.actionPayload` | Drives the action-signature payload reconstruction |
| `name` / `description` | Shown in the page header |
