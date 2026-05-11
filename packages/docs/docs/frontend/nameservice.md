---
sidebar_position: 4
title: NameService
---

# NameService — `/evvm/nameservice`

The page is split into tabs that mirror the lifecycle of a username:

## Tabs

### Pre-register

Computes a hash of `(username, salt)` and stores it on-chain. This
commits you to the username without revealing it, so a frontrunner
can't steal the name in the same block as your reveal. **Valid for
30 seconds** — register before that window closes.

The UI suggests a random salt; save it — you'll need it for the
reveal step.

### Register

Reveals the username + salt and pays the registration fee
(**`100 × EVVM reward`**). Grants ownership for **366 days**.

### Renew

Extends the lease by another 366 days (max 100 years ahead).

- **Free** if renewed before the current expiry.
- Variable based on the highest active offer otherwise.
- Capped at **`500,000 × EVVM reward`** if you try to renew more
  than 1 year early (deterrent against speculative early renewals).

### Flush username

Releases the username and any custom metadata back to the pool. Use
this to free a name you no longer need. After flushing or expiry the
name has a **60-day grace period** before anyone else can register
it.

### Custom metadata

Arbitrary string entries attached to your username. Three operations:

- **Add** — `addCustomMetadata(identity, value)` (cost: `10 × EVVM reward`)
- **Remove** — `removeCustomMetadata(identity, key)` (cost: `10 × EVVM reward`)
- **Flush** — `flushCustomMetadata(identity)` wipes all entries at once
  (cost: `10 × EVVM reward × number of entries`)

The on-chain storage is schema-less. The recommended frontend
convention for structured metadata is `[schema]:[subschema]>[value]`
(e.g. `social:twitter>@alice`).

### Marketplace (offers)

Three operations. A **0.5% marketplace fee** is deducted on
`makeOffer` (escrow = `amount × 995 / 1000`).

- **Make offer** — escrow MATE and post an intent to buy a name you
  don't own. Returns an `offerID`.
- **Withdraw offer** — pull your escrow back if your offer hasn't
  been accepted.
- **Accept offer** — current owner accepts a specific buyer's offer;
  the username transfers and the locked MATE pays out to the seller.

## Username lookup

The home of the page has a free-form lookup — type any username and the
UI shows the resolved owner address, expiration timestamp, and any
custom metadata they've published. Useful for confirming that a name is
free before pre-registering.
