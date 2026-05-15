# 🏗️ Scaffold-EVVM 🧉

**Battle-test EVVM services locally before you spend a wei of testnet or mainnet gas.**

#### 📚 [Documentation](https://www.evvm.info/docs/LibrariesAndTools/ScaffoldEvvm/) | 🌐 [Website](https://evvm.org) | 📖 [How to make an EVVM service](https://www.evvm.info/docs/HowToMakeAEVVMService)

Scaffold-EVVM is the iteration loop for anyone shipping an EVVM service. Drop your `.sol` file, run one command, and you get:

- A **local EVVM stack** (all 6 protocol contracts deployed on Anvil/Hardhat).
- Your service **auto-deployed and wired in** — addresses written to the frontend `.env`, ABI persisted, no manual plumbing.
- A **fully generated UI** at `/services/<your-service>` — read panel, write panel with the right form per function role (admin / publicAction / publicPay), live event tail, EVVM dual-signature signing handled for you.
- A **block explorer** (`/evvmscan`) that decodes your service's calls and events as first-class citizens alongside Core / Staking / NameService / etc.
- **23+ signature constructors** for every EVVM operation so you can stress-test how your service interacts with payments, staking, names, and P2P swaps in the same UI.

> 🛡️ **Why this matters:** every signature you generate against a service ABI you wrote yesterday is one fewer testnet deploy, one fewer testnet faucet round-trip, one fewer "wait, did I send the right struct?" thirty minutes after pushing. Failing fast locally is the whole point.

---

## ⚡ The 60-second loop

```bash
git clone https://github.com/EVVM-org/scaffold-evvm.git
cd scaffold-evvm
npm install
# 1. Drop services/<YourService>/<YourService>.sol
npm run wizard
# 2. Open http://localhost:3000/services/<YourService>
# 3. Hit functions, watch events tail, iterate.
```

That's it. Edit the contract, re-run the wizard, the UI rebuilds itself from your new ABI.

---

## 🧩 Building a service — the real walkthrough

Scaffold-EVVM understands two kinds of services:

| Kind | Inherits | Use when |
|------|----------|----------|
| **Plain contract** | Nothing | One-off demos / tooling that doesn't need gasless UX (the bundled `Counter` example) |
| **EVVM service** | `EvvmService` | Real services — gasless dual-signature flows where users sign, fishers execute |

The protocol's canonical guide is **[How to make an EVVM service](https://www.evvm.info/docs/HowToMakeAEVVMService)**. The rest of this section is the scaffold-evvm shorthand for it.

### 1. Drop the file

```
services/
└── Tipjar/
    ├── Tipjar.sol            ← required: one main contract
    ├── manifest.json         ← optional: classifies functions for the auto-UI
    └── Deploy.s.sol          ← optional: custom Foundry deploy script
```

The folder name becomes the slug (`/services/Tipjar`) and the env var (`NEXT_PUBLIC_CUSTOM_TIPJAR_ADDRESS`).

### 2. Write the contract

For a real gasless service, extend `EvvmService`. The constructor takes the deployed **Core** and **Staking** addresses — scaffold-evvm fills them in automatically when it sees those types.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@scaffold-evvm/testnet-contracts/library/EvvmService.sol";

contract Tipjar is EvvmService {
    error Unauthorized();

    address public immutable owner;
    mapping(address => uint256) public received;

    event Tipped(address indexed from, address indexed to, uint256 amount);

    constructor(address _core, address _staking, address _owner)
        EvvmService(_core, _staking)
    {
        owner = _owner;
    }

    function tip(
        // ── action params ───────────────────────────────────
        address user,
        address to,
        uint256 amount,

        // ── canonical EVVM action plumbing ──────────────────
        address senderExecutor,    // the contract delivering this call to Core (usually address(this))
        address originExecutor,    // address(0) = anyone can execute; else restricts
        uint256 nonce,             // service nonce (sync or async)
        bool    isAsyncExec,       // matches the nonce mode
        bytes   memory signature,  // user-signed action authorization

        // ── canonical EVVM payment plumbing ─────────────────
        uint256 priorityFeePay,    // fisher reward (in the chosen token)
        uint256 noncePay,          // payment nonce (independent of action nonce)
        bool    isAsyncExecPay,
        bytes   memory signaturePay
    ) external {
        // (1) Verify the user signed the action + consume the nonce atomically.
        //
        //     Action hash = keccak256(abi.encode("opName", ...domain args only)).
        //     The plumbing (executor pair, nonce, isAsyncExec, evvmId) is added
        //     by the unified envelope inside Core.validateAndConsumeNonce — it
        //     does NOT belong in this inner hash.
        core.validateAndConsumeNonce(
            user,
            senderExecutor,
            keccak256(abi.encode("tip", to, amount)),
            originExecutor,
            nonce,
            isAsyncExec,
            signature
        );

        // (2) Pull the user's payment via Core.pay — separate signature, separate nonce.
        requestPay(
            user,
            getPrincipalTokenAddress(),    // or core.getChainHostCoinAddress() for native
            amount,
            priorityFeePay,
            originExecutor,
            noncePay,
            isAsyncExecPay,
            signaturePay
        );

        // (3) Reward the fisher (only meaningful if this contract is a registered staker).
        if (core.isAddressStaker(address(this))) {
            makeCaPay(msg.sender, getPrincipalTokenAddress(), priorityFeePay);
        }

        // (4) Domain logic + events.
        received[to] += amount;
        emit Tipped(user, to, amount);
    }
}
```

**The four invariants every EVVM service must honor:**

1. **Validate before side effects.** `core.validateAndConsumeNonce(...)` is the *first* line of the function. Skip it and the same signature can be replayed.
2. **Action hash holds the action, nothing else.** Only the function name + domain arguments go inside `keccak256(abi.encode(...))`. The executor pair, nonce, `isAsyncExec`, and `evvmId` are added by Core's unified envelope automatically.
3. **The pay signature is separate.** `requestPay` takes its own nonce and signature — a compromised pay nonce doesn't invalidate the action.
4. **Use `originExecutor` deliberately.** Pass `address(0)` to let any fisher execute. Pass a specific address only if you want to lock execution to one EOA.

### 3. (Optional) Add a manifest

`manifest.json` next to your `.sol` file tells the auto-UI how to classify each function. **It's optional** — without it everything works, the UI just classifies by Solidity mutability.

```json
{
  "name": "Tipjar",
  "description": "Send a gasless tip to any EVVM user, paid in MATE.",
  "tags": {
    "admin": ["transferOwnership"],
    "publicPay": ["tip"],
    "publicAction": [],
    "hidden": []
  },
  "actions": {
    "tip": { "actionPayload": ["address to", "uint256 amount"] }
  }
}
```

| Tag | What the auto-UI does |
|-----|------------------------|
| `admin` | Renders under "Admin actions", behind a "connected wallet must hold the admin role" hint |
| `publicPay` | Renders a **dual-signature** form (action + EVVM-pay). Both nonces + signatures handled by the UI |
| `publicAction` | Renders a **single-signature** form (action only, no fee transfer) |
| `hidden` | Doesn't render |

`actions.<name>.actionPayload` tells the UI which types to encode inside the action hash. The shape matches what your contract's `keccak256(abi.encode(...))` expects — operation name plus domain args.

### 4. Run the wizard

```bash
npm run wizard
```

The wizard:

1. Re-compiles via `forge build --via-ir`.
2. Reads your service's ABI from `packages/foundry/out/<File>.sol/<Contract>.json`.
3. Resolves constructor arguments — `address` parameters whose name matches a known role (Core, Staking, owner) auto-fill; anything else prompts you.
4. Deploys, writes the address to `deployments/customcontracts.json` and `NEXT_PUBLIC_CUSTOM_<NAME>_ADDRESS` in the frontend `.env`.
5. Persists the ABI to `packages/nextjs/public/customservices.json` so the frontend + EVVMScan pick it up.

### 5. Iterate

- Open `http://localhost:3000/services/Tipjar` → read panel shows live reads, write panel shows your `tip` form, events panel tails `Tipped`.
- Open `http://localhost:3000/evvmscan` → every call and log against Tipjar is decoded with your ABI.
- Edit `Tipjar.sol`, re-run `npm run wizard` → UI rebuilds itself.

---

## 🎛️ How the auto-UI works

When you visit `/services/<your-service>`, scaffold-evvm walks your ABI + manifest and produces three panels:

### Read panel

Every `view` / `pure` function is invoked on mount. Return types render with the right widget:

| Solidity return | Rendered as |
|-----------------|-------------|
| `address` | Monospace address + copy button |
| `uint256` (large) | Both raw wei and a human-formatted MATE-style value |
| `bool` | Yes/No badge |
| `bytes` | Hex with collapse toggle |
| `string` | Plain text |
| Tuple / struct | Two-column key-value table |
| Array | Bullet list (or table if elements are tuples) |

Functions that take arguments live in the read panel too, with an inline form so you can call them on demand.

### Write panel

Every state-changing function gets a form. The form type depends on the manifest tag:

| Tag | What the form does |
|-----|---------------------|
| (none) — plain | One input per argument, "Submit" calls `client.writeContract` directly via wagmi/viem |
| `publicAction` | Same fields, but the canonical action plumbing (`senderExecutor`, `originExecutor`, `nonce`, `isAsyncExec`, `signature`) is pre-filled and the action signature is built before submission |
| `publicPay` | Action *plus* EVVM-pay fields (`priorityFeePay`, `noncePay`, `isAsyncExecPay`, `signaturePay`, `tokenAddress`, `amount`). Both signatures are produced and submitted together |
| `admin` | Same as plain, grouped under "Admin actions" with a yellow header reminding you the call needs the admin role |

`address` inputs accept either a hex address or `@username` and resolve via NameService on submit. Numeric inputs accept human-readable decimals (`10.5`) and convert to wei.

### Events panel

Every event declared in your ABI is tailed live using the same decoder EVVMScan uses. Each entry shows the event name, decoded arguments with the same per-type widgets, the emitting block + relative timestamp, and a link to the emitting transaction.

### What the auto-UI does *not* do

- It doesn't sequence multi-step flows (no "init → lockNumber → finalize" wizard). Each function is one form.
- It doesn't handle ERC-20 approvals before writes — if you need them, instruct the user manually or write a custom page.
- It doesn't poll reads on a tight interval — reads refresh on mount and after a successful write.

When you outgrow the auto-UI, drop a regular Next.js page under `packages/nextjs/src/app/your-service/` using the same `components/ui/` primitives. The ABI, address, and EVVMScan hookup still work; only the page is custom.

---

## 🔭 What else you get

These ship turned on — you don't configure them.

| Feature | What it does |
|---------|--------------|
| **EVVMScan Explorer** (`/evvmscan`) | Etherscan-style live feed. Decodes Core, Staking, Estimator, NameService, Treasury, P2PSwap, **and your custom services**. Transaction page breaks out `senderExecutor` / `originExecutor` / signatures. Address page tags contracts vs EOAs with EVVM-aware direction (`Core.addBalance` reads as IN even when you're `tx.from`). |
| **23+ signature constructors** | Pre-built forms for `pay`, `dispersePay`, all three staking modes, NameService lifecycle, P2PSwap order book, treasury bridge. Use them to stress-test how your service composes with the rest of the protocol. |
| **ABI-decoded monitor** | `npm run monitor` streams every block + tx in a separate terminal, ABI-decoded against Foundry build output and the evvm-js SDK. |
| **UI Pro Max design system** | Fira Sans + Fira Code, dark/light token scale, shared `components/ui/` primitives, a11y-ready (skip link, focus rings, reduced-motion). See `design-system/scaffold-evvm/MASTER.md`. |
| **Sandbox-tuned contracts** | All protocol timelocks patched to 30 seconds so you can test governance flows in real time. |

---

## 🚀 Quickstart

**Requirements:** [Node.js](https://nodejs.org/) v18+, [Foundry](https://book.getfoundry.sh/getting-started/installation), [Git](https://git-scm.com/).

```bash
git clone https://github.com/EVVM-org/scaffold-evvm.git
cd scaffold-evvm
npm install
npm run wizard
```

The wizard checks prerequisites, auto-clones Testnet-Contracts if missing, prompts for framework (Foundry / Hardhat) + admin addresses, compiles, deploys all 6 protocol contracts plus any services in `services/`, writes the frontend `.env`, and launches `http://localhost:3000`.

> 💡 **Tip:** Keep the terminal open to maintain the local chain. `Ctrl+C` shuts everything down cleanly.

### Two-terminal workflow

For iterating on a service without restarting the frontend every time:

```bash
# Terminal 1
npm run cli deploy      # spawns chain + deploys contracts + services

# Terminal 2
npm run frontend        # next dev on :3000

# Terminal 3 (optional)
npm run monitor         # ABI-decoded live block/tx feed
```

> ⚠️ **Local deployment only.** Testnet deployment is on the roadmap.

---

## 🔧 Troubleshooting

```bash
npm run cli flush       # clear all caches, kill servers
npm run wizard          # fresh start
```

Common issues solved by `flush`:
- Nonce errors ("Nonce too high/low")
- Port 8545 already in use
- Transaction reverted / deployment failed

**Stuck transactions after redeploying:** when the local chain resets, your wallet still remembers the old nonce.

1. `npm run cli flush`
2. In your wallet, clear activity:
   - **MetaMask:** Settings → Advanced → *Clear activity tab data*
   - **Rabby:** Settings → *Clear pending transactions*
3. `npm run wizard`

WalletConnect doesn't work with `localhost` — import the test private key directly into MetaMask/Rabby (see "Local network" below).

---

## 📦 Protocol contracts

Scaffold-EVVM deploys 6 protocol contracts. Your services compose with these.

| Contract | What it does |
|----------|--------------|
| **Core** | Holds per-user balances. Verifies signatures + consumes nonces via `validateAndConsumeNonce`. Single entry point for `pay`, `dispersePay`, `batchPay`, `caPay`, `disperseCaPay`. |
| **Staking** | Era-based reward system for MATE token holders. Three flows (golden / presale / public). `EvvmService` provides `_makeStakeService` helpers for contracts that want to stake themselves. |
| **Estimator** | Pure reward-calculation engine, called by Staking. Stateless. |
| **NameService** | Username registration, renewal, marketplace offers, custom metadata. Core resolves `@username` → address inside `pay()` etc. |
| **Treasury** | ETH / ERC-20 vault. **No signatures** — direct caller balance ops. |
| **P2PSwap** | Peer-to-peer order book. Two fill models (proportional / fixed fee). |

Full per-contract reference: [evvm.info/docs/Contracts](https://www.evvm.info/docs/Contracts/EVVM/EVVMContract).

---

## 🔐 Local network

Both Anvil and Hardhat Network use the same defaults:

| | |
|---|---|
| Port | `8545` |
| Chain ID | `31337` |
| Test address | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| Test private key | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |

> ⚠️ **Publicly known test keys.** Never use on networks with real value.

---

## 📁 Project structure

```
scaffold-evvm/
├── cli/                    # Interactive CLI wizard (this is where the wizard lives)
├── services/               # ← YOU DROP YOUR .sol FILES HERE
│   └── Counter/            # Bundled minimal example
├── packages/
│   ├── foundry/            # Foundry package
│   │   ├── testnet-contracts/   # Bundled snapshot of all protocol contracts
│   │   └── contracts/services/  # Symlinked target for services/
│   ├── hardhat/            # Hardhat package (delegates compilation to forge)
│   └── nextjs/             # Frontend + EVVMScan + auto-UI for custom services
├── Testnet-Contracts/      # Auto-cloned at deploy time (git ignored)
├── input/                  # Generated deployment inputs (Inputs.*.sol, address.json)
└── deployments/            # Deployment summaries + customcontracts.json
```

---

## 📚 Documentation

All scaffold-evvm documentation lives at **[evvm.info/docs/LibrariesAndTools/ScaffoldEvvm](https://www.evvm.info/docs/LibrariesAndTools/ScaffoldEvvm/)** alongside the rest of the EVVM protocol docs — one canonical home, no second site to maintain.

**Start here:**

- [Scaffold-EVVM overview](https://www.evvm.info/docs/LibrariesAndTools/ScaffoldEvvm/) — what it is, the iteration loop, when to use it
- [Custom services walkthrough](https://www.evvm.info/docs/LibrariesAndTools/ScaffoldEvvm/custom-services/overview) — folder convention, manifest, examples
- [Auto-UI reference](https://www.evvm.info/docs/LibrariesAndTools/ScaffoldEvvm/custom-services/auto-ui) — what the generated page renders for each function shape
- [Getting started](https://www.evvm.info/docs/LibrariesAndTools/ScaffoldEvvm/getting-started/quickstart) — install, wizard, troubleshooting

**Protocol references:**

- [How to make an EVVM service](https://www.evvm.info/docs/HowToMakeAEVVMService) — the protocol's canonical service-authoring guide (this README mirrors it for the scaffold-evvm workflow)
- [EVVM Documentation](https://www.evvm.info/docs/intro) — full protocol docs
- [Signature Structures](https://www.evvm.info/docs/SignatureStructures/Overview) — EIP-191 payload formats
- [EVVM Website](https://evvm.org)
- [Foundry Book](https://book.getfoundry.sh/) · [Hardhat Docs](https://hardhat.org/docs)

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit using the [joelparkerhenderson git-commit-message convention](https://github.com/joelparkerhenderson/git-commit-message) (imperative subject, body explains *why*).
4. Push: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

---

## 📄 License

EVVM Noncommercial License v1.0 — see [LICENSE](LICENSE) for details. For commercial use, contact: g@evvm.org.

---

<p align="center">
  Made with 🧉 for the EVVM ecosystem
  <br/>
  Inspired by <a href="https://github.com/scaffold-eth/scaffold-eth-2">🏗️ Scaffold-ETH</a>
</p>
