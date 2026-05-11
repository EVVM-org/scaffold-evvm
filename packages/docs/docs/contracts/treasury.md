---
sidebar_position: 5
title: Treasury
---

# Treasury (`Treasury.sol`)

`Treasury` is the deposit/withdraw vault for the EVVM ecosystem. It
holds escrowed assets (ETH or ERC-20s) and syncs balances with `Core`.

In the bundled testnet contracts:
`packages/foundry/testnet-contracts/contracts/treasury/Treasury.sol`.

> **Important difference from other services:** Treasury operations
> require **no signatures**. They're direct caller-balance operations
> — `msg.sender` is the user, and the caller's wallet pays gas
> directly.

## Functions

### `deposit(token, amount)`

```solidity
deposit(address token, uint256 amount) external payable
```

- For **ETH**: pass `token = address(0)` and `amount = msg.value`.
- For **ERC-20**: pass the token contract address, the amount, and
  `msg.value = 0`. The user must have already `approve`d Treasury for
  `amount`.

The deposited balance is then credited to the user's Core balance for
the same token.

### `withdraw(token, amount)`

```solidity
withdraw(address token, uint256 amount) external
```

Reverse of deposit: debits the user's Core balance and transfers the
asset back to `msg.sender`.

> **Hard rule:** the **principal token** (MATE,
> `0x0000000000000000000000000000000000000001`) cannot be withdrawn.
> Treasury reverts on any attempt. MATE only enters circulation
> through Core's reward flow.

## Views

```solidity
getCoreAddress() returns (address)
```

That's the entire view surface.

## Notable details

- Uses [Solady-style `SafeTransferLib`](https://github.com/Vectorized/solady)
  internally for ETH transfers (handles `transfer()`-gas-stipend
  weirdness on receive-only contracts).
- No fees, no governance, no time-locks — pure vault.
- `address(0)` as the ETH sentinel mirrors the convention used by
  several other DeFi protocols.

## Local development note

In a real EVVM deployment, Treasury sits on each external chain and
the EVVM ledger lives on its host chain (with the **Fisher Bridge**
relaying between them — see Core's
`getNextFisherDepositNonce(user)`). With scaffold-evvm everything
lives on the same local anvil instance, so the deposit/withdraw
round-trip looks like a no-op bridge — it just moves balance between
the two ledgers (the EVVM-side balance and the ERC-20 balance) on the
same chain.

## Where it shows up

`/evvm/treasury` renders deposit/withdraw forms with the ERC-20
approve flow built in. The page also shows your current ERC-20
allowance and surfaces an "Approve" button when allowance is
insufficient.
