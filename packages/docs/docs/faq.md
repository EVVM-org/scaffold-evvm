---
sidebar_position: 99
title: FAQ
---

# Frequently asked questions

### Do I need both Foundry and Hardhat?

You need **Foundry**. Hardhat is optional and is wired to compile via
forge anyway. Pick Hardhat in the wizard only if you want to use
Hardhat's plugin ecosystem for tasks beyond compile/deploy.

### Can I deploy to a real testnet?

Not from the wizard yet — local deployment only at the moment. Real
testnet support is on the roadmap.

You *can* take the artifacts that `forge build` produces and deploy
them with your own script (or via Hardhat) to any chain. The frontend
will work against any chain that has the same contracts deployed; just
update `packages/nextjs/.env` with the new addresses and the chain ID.

### Why does WalletConnect not work on localhost?

WalletConnect's relayers can't reach `localhost` — it's not a routable
address. For local development, import the test private key directly
into MetaMask or Rabby:

```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### What's the MATE token address?

`0x0000000000000000000000000000000000000001` everywhere. MATE doesn't
exist as a separate ERC-20 contract — it's the native EVVM accounting
token, tracked inside `Core.getBalance(user, MATE)`.

### My signature works in tests but reverts on-chain. What gives?

Almost always one of:

1. **Wrong nonce** — refetch via `getNextCurrentSyncNonce` or
   `getNextFreeAsyncNonce`
2. **Wrong executor binding** — `senderExecutor` should be the
   `msg.sender` of the Core call (the service contract for service
   ops, the EOA for direct pays); `originExecutor` should be the EOA
3. **Wrong action hash** — your `keccak256(abi.encode(...))` is
   missing or reordering a field. Compare your client-side build to
   the contract's reconstruction line-by-line.

EVVMScan's transaction-details page shows you the decoded fields the
contract saw — comparing those to what you signed pinpoints the
mismatch fast.

### Can I commit `services/<MyService>/` to git?

Yes. The `.gitignore` only excludes the auto-generated symlink target
(`packages/foundry/contracts/services`), not the source folder. Your
custom services are first-class code.

### Why are some contract files in two places?

`packages/foundry/testnet-contracts/` is a bundled snapshot; the
`Testnet-Contracts/` folder at the repo root (gitignored) is what the
wizard auto-clones from upstream when you run `cli sources`. Both
point at the same source repository — the bundled snapshot exists so
you can deploy entirely offline.

### Does scaffold-evvm work without internet?

Yes, as long as the bundled snapshot is in place (it ships with the
repo). The wizard only reaches out for upstream contract updates if
you explicitly run `cli sources`.

### How do I report a bug?

Open an issue at
[github.com/EVVM-org/scaffold-evvm/issues](https://github.com/EVVM-org/scaffold-evvm/issues).
Include the failing wizard output (or browser console error), and
mention which framework you chose.
