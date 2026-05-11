---
sidebar_position: 5
title: Troubleshooting
---

# Troubleshooting

The single most useful command:

```bash
npm run cli flush
```

It clears every cache, kills any process holding port 8545 or 3000, and
removes deployment artifacts. After running `flush` you can safely re-run
`npm run wizard` from a clean slate.

---

## Common errors

### "Nonce too high" / "Nonce too low" in your wallet

You restarted the local chain but your wallet still remembers the old
nonce. Two things to do:

1. `npm run cli flush` to clear server-side state
2. In your wallet, clear activity:
   - **MetaMask** → Settings → Advanced → *Clear activity tab data*
   - **Rabby** → Settings → *Clear pending transactions*

### "Port 8545 already in use"

Another anvil/hardhat process is still alive. `npm run cli flush` kills it.
If that doesn't work:

```bash
lsof -t -i:8545 | xargs kill -9
```

### Frontend shows old contract addresses after redeploy

Next.js bakes `NEXT_PUBLIC_*` into the bundle at start time. Restart the
frontend process (`Ctrl+C` then `npm run frontend`).

### "Transaction reverted" with no useful message

Open the EVVMScan transaction page (`/evvmscan/tx/<hash>`). It decodes the
function call and shows you the resolved arguments — which is usually
enough to spot what's wrong (zero address, wrong nonce, identity vs
address mismatch, etc.).

For deeper debugging, run `npm run monitor` in a separate terminal to see
the live revert reasons as transactions land.

### Service contract didn't deploy

Two prerequisites:

1. Your `.sol` file lives at `services/<Name>/<Name>.sol` (folder name
   matching contract name)
2. The `services/` symlink exists at `packages/foundry/contracts/services/`
   (it's created automatically the first time you run the wizard, but
   `npm run cli flush` does not remove it)

If the file is there but no UI appears at `/services/<Name>`, check
`packages/nextjs/public/customservices.json` — if your service is missing
from that registry, the deploy step didn't finish. Re-run with
`npm run wizard` and watch the "Deploying custom services…" stage.

### MetaMask can't connect

Localhost does **not** work with WalletConnect. Import the test private
key directly into MetaMask/Rabby:

```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Or click "Use Test Account" in the wallet button on the home page.

### Forge build fails after editing a service

The custom service compile step runs `forge build --via-ir`. If your
contract is invalid Solidity, the wizard surfaces forge's error directly.
Fix the Solidity, then re-run the wizard — there's no need to flush.
