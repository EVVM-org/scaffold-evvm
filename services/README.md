# Custom Services

Drop a Solidity contract here and scaffold-evvm will compile it, deploy it, and
auto-generate a page at `/services/<name>` for interacting with it.

## Folder convention

```
services/
├── README.md                     ← this file
└── <YourService>/
    ├── <YourService>.sol         ← required: one main contract
    ├── Deploy.s.sol              ← optional: custom Foundry deploy script
    ├── manifest.json             ← optional: annotations (see below)
    └── README.md                 ← optional: docs for your service
```

One folder per service. The folder name is the service's slug (lower-case
recommended, URL-safe) and drives both the route (`/services/<name>`) and the
generated `NEXT_PUBLIC_CUSTOM_<NAME>_ADDRESS` env variable.

## How compilation works

`services/` is symlinked into `packages/foundry/contracts/services/`, so any
`.sol` you add is picked up by the normal `forge build --via-ir` pipeline. You
can import from the bundled testnet contracts via:

```solidity
import "@scaffold-evvm/testnet-contracts/library/EvvmService.sol";
import "@scaffold-evvm/testnet-contracts/interfaces/ICore.sol";
```

## How the wizard discovers your service

`npm run wizard` scans `services/*/` for any directory containing a `.sol`
file and lists them. You choose which to deploy; the CLI resolves constructor
arguments (auto-detecting common EVVM addresses) and writes each deployed
address to `deployments/customcontracts.json` plus an entry in the frontend
`.env`.

## What the frontend does

At `/services` you get an index of deployed services. Each entry links to
`/services/<name>` where scaffold-evvm renders:

- **Read panel** — every `view`/`pure` function is called on mount and its
  result displayed.
- **Write panel** — every state-changing function gets a form with input
  widgets chosen from its argument types (address, uint, bool, bytes, etc.).
- **Events panel** — any events the contract emits are tailed live.

The entire page is driven by the deployed ABI alone, so a contract you write
today works tomorrow without any UI changes.

## Optional: manifest.json

The ABI tells us what functions exist, but not things like "this function is
admin-only" or "the action signature hashes these three args". A
`manifest.json` next to the `.sol` file supplements the ABI with those
annotations. It is **strictly optional** — without it, the UI still works.

Minimum shape:

```json
{
  "name": "Your Service",
  "description": "What it does",
  "tags": {
    "admin":  ["stake", "unstake", "withdrawRewards"],
    "hidden": []
  }
}
```

Richer cases (EVVM dual-signature flows, post-deploy actions, argument type
hints) are documented separately in `docs/services-manifest.md`.

## Included example

`services/Counter/Counter.sol` — a zero-dependency counter contract. After
running the wizard, open `/services/Counter` to see the auto-generated UI.
