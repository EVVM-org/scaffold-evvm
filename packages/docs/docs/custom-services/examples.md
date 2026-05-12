---
sidebar_position: 5
title: Examples
---

# Examples

## Counter — the bundled minimal example

```solidity
// services/Counter/Counter.sol
pragma solidity 0.8.30;

contract Counter {
    uint256 public count;
    address public immutable deployer;

    event Bumped(uint256 newCount, address indexed by);

    constructor() {
        deployer = msg.sender;
    }

    function bump() external {
        count += 1;
        emit Bumped(count, msg.sender);
    }

    function reset() external {
        require(msg.sender == deployer, "only deployer");
        count = 0;
    }
}
```

No imports, no manifest needed. After `npm run wizard` you'll find a
working page at `/services/Counter` with:

- **Read**: `count`, `deployer`
- **Write**: `bump` (no args, single click), `reset` (no args, single
  click — admin-gated by the contract itself)
- **Events**: live `Bumped` tail

## Service that extends EvvmService — full dual-signature flow

This is the canonical shape. The constructor takes **both** Core and
Staking (`EvvmService` requires both), and the function carries the
canonical EVVM plumbing for action + payment.

```solidity
// services/Tipjar/Tipjar.sol
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
        // action params
        address user,
        address to,
        uint256 amount,

        // canonical action plumbing
        address senderExecutor,    // usually address(this)
        address originExecutor,    // address(0) = any fisher may execute
        uint256 nonce,
        bool    isAsyncExec,
        bytes   calldata signature,

        // canonical payment plumbing (independent of action plumbing)
        uint256 priorityFeePay,
        uint256 noncePay,
        bool    isAsyncExecPay,
        bytes   calldata signaturePay
    ) external {
        // (1) Verify the user signed the action + consume nonce atomically.
        //     The action hash holds ONLY the operation name + business args.
        //     The unified envelope (executor pair, nonce, isAsyncExec, evvmId)
        //     is added by Core.validateAndConsumeNonce — not by this hash.
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
            getPrincipalTokenAddress(),
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

Add a `manifest.json` to wire the auto-UI for the dual-signature flow:

```json
{
  "name": "Tipjar",
  "description": "Send a gasless tip to any EVVM user, paid in MATE.",
  "tags": {
    "publicPay": ["tip"],
    "admin": []
  },
  "actions": {
    "tip": {
      "actionPayload": ["address to", "uint256 amount"]
    }
  }
}
```

After deploying, `/services/Tipjar` shows a `tip` form with two
business inputs (`to`, `amount`) — the auto-UI handles both
signatures and submits them together.

### The four invariants

Every EVVM service must honor these four — they are the contract you
sign with the protocol:

1. **Validate before side effects.** `core.validateAndConsumeNonce(...)`
   is the first line of the function. Skip it and the same signature
   can be replayed.
2. **Action hash holds the action, nothing else.** Only the function
   name + domain arguments go inside `keccak256(abi.encode(...))`.
   Plumbing (executors, nonce, isAsyncExec, evvmId) lives in the
   unified envelope automatically.
3. **The pay signature is separate.** `requestPay` takes its own
   nonce + signature — a compromised pay nonce doesn't invalidate
   the action.
4. **Use `originExecutor` deliberately.** Pass `address(0)` to let any
   fisher execute. Pass a specific address only if you want to lock
   execution to one EOA.

## Patterns to copy

- **Read returns lots of data?** Group it into a `struct` and return that
  — the auto-UI renders structs as a key-value table, which is more
  legible than many separate fields.
- **Need an admin role?** Put the addresses behind a constructor
  argument and `require(msg.sender == admin, ...)` inside the function.
  Then list those functions under `tags.admin` so the UI groups them.
- **Want to hide internal `external` helpers?** Put them under
  `tags.hidden`.
- **Need a fancy UX?** Outgrow the auto-UI and write a normal Next.js
  page using `packages/nextjs/src/components/ui/`. The deployment
  pipeline still records your address, ABI, and the EVVMScan hookup
  works regardless of which UI you ship.
