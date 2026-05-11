---
sidebar_position: 4
title: NameService
---

# NameService (`NameService.sol`)

`NameService` is EVVM's username system. Users register a string handle
that resolves to their address; other contracts (notably `Core.pay()`)
accept either an address or an `@username`.

In the bundled testnet contracts:
`packages/foundry/testnet-contracts/contracts/nameService/NameService.sol`.

All user operations use the **dual signature pattern** with **async
nonces**.

## The lifecycle of a username

### 1. `preRegistrationUsername(...)` — commit phase

```solidity
preRegistrationUsername(
    address user,
    bytes32 hashPreRegisteredUsername,  // hashUsername(name, salt)
    address senderExecutor,
    address originExecutor,
    uint256 nonce,
    bytes   memory signature,
    uint256 priorityFeePay,
    uint256 noncePay,
    bytes   memory signaturePay
)
```

Stores a hash of `(username, salt)` so a frontrunner can't steal the
name in the same block as your reveal. **Valid for 30 seconds** —
register before that window closes or the pre-registration is
considered stale.

The hash is built with `hashUsername(username, randomNumber)` →
`keccak256(username, randomNumber)`. Save the salt; you'll need it
for the reveal step.

### 2. `registrationUsername(...)` — reveal + pay

```solidity
registrationUsername(
    address user,
    string  memory username,
    uint256 lockNumber,         // your salt from step 1
    /* dual sig fields */
)
```

Reveals the username + salt and pays the registration fee.

- **Cost: `100 × EVVM reward amount`** (dynamically priced — see
  `getPriceOfRegistration(username)`).
- **Term: 366 days** (one year + 1 day).

### 3. `renewUsername(...)` — extend the lease

```solidity
renewUsername(address user, string memory username, /* dual sig fields */)
```

Extends ownership by another 366 days. **Max 100 years ahead** — you
can't pre-pay the entire next century in one go.

Pricing (see `seePriceToRenew(identity)`):

- **Free** if renewed *before* the current expiry.
- Variable based on highest active offer (see makeOffer below).
- Capped at **`500,000 × EVVM reward`** if you try to renew more than
  1 year before the current expiry (a deterrent against
  speculative early renewals).

### 4. `flushUsername(...)` — release the username

```solidity
flushUsername(address user, string memory username, /* dual sig fields */)
```

Deletes the username and any custom metadata, making it available for
re-registration. Reverts if the username has already expired (no point
flushing something already free).

After expiration, the name has a **60-day grace period** before it can
be re-registered by anyone else.

## Custom metadata

Each username can carry arbitrary key-value entries. Cost per write
operation: **`10 × EVVM reward`**.

```solidity
addCustomMetadata(address user, string memory identity, string memory value, /* dual sig fields */)
removeCustomMetadata(address user, string memory identity, uint256 key, /* dual sig fields */)
flushCustomMetadata(address user, string memory identity, /* dual sig fields */)
```

`flushCustomMetadata` cost = `10 × EVVM reward × number of slots` (one
per stored entry).

The metadata is intentionally schema-less on-chain — you can store
profile fields, IPFS pointers, social handles, anything. The
recommended frontend convention is `[schema]:[subschema]>[value]` (not
enforced by the contract).

## Marketplace (offers)

A pending offer locks the offerer's principal tokens until withdrawn or
accepted. Marketplace fee on `makeOffer`: **0.5%** (final escrow =
`amount × 995 / 1000`).

```solidity
makeOffer(
    address user,
    string  memory username,
    uint256 amount,
    uint256 expirationDate,
    /* dual sig fields */
) returns (uint256 offerID)
```

Posts an offer and locks the funds.

```solidity
withdrawOffer(address user, string memory username, uint256 offerID, /* dual sig fields */)
```

Withdraws an unaccepted offer; refunds the offerer.

```solidity
acceptOffer(address user, string memory username, uint256 offerID, /* dual sig fields */)
```

Current owner accepts a specific offer. Username transfers to the
offerer; locked principal tokens release to the seller.

## Hash builders for the action signatures

```solidity
keccak256(abi.encode("preRegistrationUsername", hashUsername))
keccak256(abi.encode("registrationUsername",     username, lockNumber))
keccak256(abi.encode("renewUsername",            username))
keccak256(abi.encode("flushUsername",            username))
keccak256(abi.encode("addCustomMetadata",        identity, value))
keccak256(abi.encode("removeCustomMetadata",     identity, key))
keccak256(abi.encode("flushCustomMetadata",      identity))
keccak256(abi.encode("makeOffer",                username, amount, expirationDate))
keccak256(abi.encode("withdrawOffer",            username, offerId))
keccak256(abi.encode("acceptOffer",              username, offerId))
```

## Resolution — used by Core

Core asks NameService to resolve usernames inside its payment
functions:

| View | Behaviour |
|------|-----------|
| `verifyStrictAndGetOwnerOfIdentity(identity)` | Resolve or revert |
| `strictVerifyIfIdentityExist(username)` | Existence check, reverts if missing |
| `verifyIfIdentityExists(identity)` | Existence check (handles pre-reg + active) |
| `getOwnerOfIdentity(username)` | Owner address |
| `getIdentityBasicMetadata(username)` | `(owner, expirationDate)` |
| `getExpireDateOfIdentity(identity)` | Expiration timestamp |

## View surface

| View | Returns |
|------|---------|
| `hashUsername(username, randomNumber)` | `keccak256(username, randomNumber)` — your pre-reg salt builder |
| `isUsernameAvailable(username)` | Whether it can be registered now |
| `getPriceOfRegistration(username)` | `100 × reward` if no active offers, else `seePriceToRenew(...)` |
| `seePriceToRenew(identity)` | Free / variable / capped (see Renewal above) |
| `getPriceToAddCustomMetadata()` | `10 × reward` |
| `getPriceToRemoveCustomMetadata()` | `10 × reward` |
| `getPriceToFlushCustomMetadata(identity)` | `10 × reward × slots` |
| `getPriceToFlushUsername(identity)` | metadata flush + `1 × reward` |
| `getOffersOfUsername(username)` | All `OfferMetadata[]` (active + expired) |
| `getSingleOfferOfUsername(username, offerID)` | Single offer |
| `getLengthOfOffersUsername(username)` | Count |
| `getAmountOfCustomMetadata(username)` | Slot count |
| `getFullCustomMetadataOfIdentity(username)` | All entries as `string[]` |
| `getSingleCustomMetadataOfIdentity(username, key)` | One entry |
| `getCustomMetadataMaxSlotsOfIdentity(username)` | Max allowed slots |

## Governance — 1-day time-locks

- `proposeAdmin(addr)` / `acceptProposeAdmin()` / `cancelProposeAdmin()`
- `proposeChangeEvvmAddress(addr)` / `acceptChangeEvvmAddress()` /
  `cancelChangeEvvmAddress()`
- `proposeWithdrawPrincipalTokens(amount)` /
  `claimWithdrawPrincipalTokens()` / `cancelWithdrawPrincipalTokens()` —
  for the admin to withdraw protocol-collected fees.

## Where it shows up

| Surface | What you do there |
|---------|-------------------|
| `/evvm/nameservice` | Register, renew, flush, manage metadata, run the marketplace |
| `/evvm/payments` | Type `@alice` instead of an address; Core resolves on-chain |
| EVVMScan search bar | Paste `@alice` to jump to her address page |
