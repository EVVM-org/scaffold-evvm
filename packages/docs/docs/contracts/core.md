---
sidebar_position: 1
title: Core
---

# Core (`Core.sol`)

`Core` is the protocol's settlement layer. It holds every user's
per-token balance, validates EIP-191 signatures, consumes nonces
atomically, and exposes the only on-chain payment functions in EVVM.

In the bundled testnet contracts:
`packages/foundry/testnet-contracts/contracts/core/Core.sol`.

## What it owns

- Per-`(user, token)` balances stored in nested mappings.
- The **sync nonce counter** for every user.
- The set of **claimed async nonces** per user.
- **Async nonce reservations** (so a service can pre-allocate a nonce slot
  for a user without burning it).
- The list of registered **service contracts** (Staking, NameService, …)
  that are allowed to call the contract-authorized `caPay()` family.
- Token allow-list / deny-list governance state.
- The optional **UserValidator** plugin pointer (see below).

## The single sourcing function — `validateAndConsumeNonce`

Every signed operation in EVVM ends up calling:

```solidity
validateAndConsumeNonce(
    address user,
    address senderExecutor,
    bytes32 hashPayload,
    address originExecutor,
    uint256 nonce,
    bool    isAsyncExec,
    bytes   calldata signature
)
```

Inside, Core:

1. Reconstructs the EIP-191 payload as
   `keccak256(abi.encode(evvmId, senderExecutor, hashPayload, originExecutor, nonce, isAsyncExec))`,
2. Recovers the signer from `signature` via
   `library/utils/signature/SignatureRecover`,
3. Asserts the signer == `user`,
4. Consumes the nonce: bumps the sync counter if `isAsyncExec == false`,
   otherwise marks the async nonce slot used.

Every service contract — Staking, NameService, P2PSwap, plus your
custom services — funnels through this exact function. The action's
domain-specific data lives in `hashPayload` (per-operation builders in
`library/utils/signature/`).

## Payment entry points

### `pay(...)` — single sender → single recipient

```solidity
pay(
    address from,
    address to_address,
    string  to_identity,   // "" → use to_address; else resolved via NameService
    address token,
    uint256 amount,
    uint256 priorityFee,   // paid to the executor
    uint256 nonce,
    bool    priorityFlag,  // sync vs async
    address executor,
    bytes   calldata signature
)
```

Moves `amount` of `token` from `from` to `to_address` (or to whoever
NameService resolves `to_identity` to), and credits `priorityFee` to
`executor`. Single signature.

### `batchPay(BatchData[] data)` — many independent pays

Submits an array of independent payments in one transaction, with
**per-payment success tracking** so a single failed entry doesn't
revert the whole batch. Each entry carries its own signature/nonce.

### `dispersePay(...)` — single sender → many recipients

One signature from `from`, fans out to a `DispersePayMetadata[]` of
`(to_address, to_identity, amount)` tuples. Used for payroll, airdrops,
and multi-recipient settlement.

### `caPay(...)` — contract-authorized payment

Called by **registered service contracts**, not EOAs. The calling
contract attests that the upstream EOA authorized the operation; Core
moves balance accordingly. No EIP-191 signature is recovered — the
caller's bytecode is the authorization. Used by Staking, NameService,
P2PSwap, Treasury, and any custom service that extends `EvvmService`.

### `disperseCaPay(...)` — contract → many recipients

`caPay` with a `DisperseCaPayMetadata[]` recipient array.

## Nonce management

| Function | Use |
|----------|-----|
| `getNextCurrentSyncNonce(user)` | Read the next sync nonce for a user |
| `getIfUsedAsyncNonce(user, nonce)` | Check whether a specific async nonce was consumed |
| `asyncNonceStatus(user, nonce)` | Detailed status (free / reserved / used) |
| `getAsyncNonceReservation(user, nonce)` | Which service holds the reservation, if any |
| `reserveAsyncNonce(user, nonce, service)` | Pre-allocate a slot to a specific service |
| `revokeAsyncNonce(user, nonce)` | Release an unused reservation |
| `getNextFisherDepositNonce(user)` | Sequential nonce for cross-chain Fisher Bridge ops |

See **[Nonces](../concepts/nonces.md)** for when to use sync vs async
and how reservations interact with parallel execution.

## UserValidator plugin

Core supports a pluggable, optional `IUserValidator` that can gate any
user's transactions:

```solidity
interface IUserValidator {
    function canExecute(address user) external view returns (bool);
}
```

Functions:

- `proposeUserValidator(address)` / `cancelUserValidatorProposal()` /
  `acceptUserValidatorProposal()` — admin-controlled lifecycle, with a
  1-day time-lock between propose and accept.
- `canExecuteUserTransaction(user)` — public view so other contracts
  can pre-check.

When set, every signed operation also runs `validator.canExecute(user)`
and reverts if it returns `false`. Useful for KYC / sanctions / sybil
gating without modifying Core itself.

## Token & reward management

- **Token abstraction** — Core tracks balances internally via
  signature-authorized transfers; it is *not* an ERC-20.
- `getBalance(address user, address token)` — query a holding.
- `verifyTokenInteractionAllowance(address token)` — whitelist/denylist
  check (governance toggles `allowList` vs `denyList` mode).
- `getRewardAmount()` — current MATE reward per transaction (used by
  staker-as-executor flows).
- `getEraPrincipalToken()` — the threshold at which the reward halves.
- `proposeChangeBaseRewardAmount` / `acceptChangeBaseRewardAmount` —
  governance for the base reward (1-day time-lock).
- `getEvvmMetadata()` — returns the canonical `EvvmMetadata` struct
  (principalToken, reward, totalSupply, eraTokens).

## NameService integration

Core asks NameService to resolve usernames inside payment functions:

- `verifyStrictAndGetOwnerOfIdentity(string identity)` — strict resolve,
  reverts if missing
- `strictVerifyIfIdentityExist(string identity)` — existence check
- `getOwnerOfIdentity(string identity)` — direct lookup

`pay()`, `batchPay()`, and `dispersePay()` all accept an optional
`to_identity` field — empty string falls back to the explicit
`to_address`, otherwise the username is resolved on-chain.

## Staking integration

- `isAddressStaker(address)` — true if the address is a registered
  staker (used to grant reward bonuses).
- `setStakingContractAddress(address)` — admin-only, pins the
  authorized staking contract.

Stakers acting as executors receive bonus rewards in MATE, on top of
the per-tx `priorityFee` from `pay`.

## Governance

- **Admin transfer:** `proposeAdmin` / `acceptAdmin` / `rejectProposalAdmin`
  with a 1-day time-lock.
- **Implementation upgrades** (proxy): `proposeImplementation` /
  `acceptImplementation`, with a 30-day time-lock for safety.
- **Token list mode:** `proposeListStatus()` toggles between
  allowList and denyList; per-token: `setTokenStatusOnAllowList` /
  `setTokenStatusOnDenyList`.
- **Initialization:** `initializeSystemContracts(nameService, treasury)`
  is one-time, gated by an internal breaker flag.

## Important addresses & constants

- The MATE / Principal Token sentinel address:
  `0x0000000000000000000000000000000000000001`. There's no separate
  ERC-20 — the address is just a key in the per-token balance map.
- Core's deployed address is exposed to the frontend as
  `NEXT_PUBLIC_EVVM_ADDRESS` and is labeled "Core" throughout EVVMScan.

## Where it shows up in scaffold-evvm

| Surface | What you do there |
|---------|-------------------|
| `/evvm/payments` | Calls `Core.pay()` and `Core.dispersePay()` |
| `/evvm/register` | Calls `Core.addBalance()` to mint your initial balance |
| `/faucet` | Calls `Core.addBalance()` to top up MATE for local development |
| `/evvm/status` | Reads governance + reward views |
| `/evvmscan/address/<core-address>` | Decodes every interaction with Core, breaks out signature plumbing fields |

> **Naming note:** the `feat/state` branch (the source the wizard
> uses) renamed the previous `EVVM` contract to `Core`. The ABI export
> from `@evvm/evvm-js` is `CoreABI`. Older guides may refer to it as
> `EVVM` / `EvvmABI` — same contract.
