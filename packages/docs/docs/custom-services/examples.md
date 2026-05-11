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

## Service that extends EvvmService

```solidity
// services/Tipjar/Tipjar.sol
pragma solidity 0.8.30;

import "@scaffold-evvm/testnet-contracts/library/EvvmService.sol";
import "@scaffold-evvm/testnet-contracts/interfaces/ICore.sol";

contract Tipjar is EvvmService {
    mapping(address => uint256) public received;

    event Tipped(address indexed from, address indexed to, uint256 amount);

    constructor(address _core) EvvmService(_core) {}

    function tip(
        address user,
        address to,
        uint256 amount,
        address senderExecutor,
        address originExecutor,
        uint256 nonce,
        bytes calldata signature,
        uint256 priorityFeePay,
        uint256 noncePay,
        bytes calldata signaturePay
    ) external {
        // Action hash encodes only the operation name + business args.
        // The unified envelope (executor pair + nonce + isAsyncExec)
        // is added inside Core.validateAndConsumeNonce.
        bytes32 actionHash = keccak256(abi.encode("tip", to, amount));

        ICore(getCoreAddress()).validateAndConsumeNonce(
            user, senderExecutor, actionHash, originExecutor,
            nonce, true, signature
        );

        // requestPay (inherited from EvvmService) funnels the fee
        // through Core.pay and forwards the priority fee to the executor.
        requestPay(
            user, getPrincipalTokenAddress(), amount, priorityFeePay,
            originExecutor, noncePay, true, signaturePay
        );

        received[to] += amount;
        emit Tipped(user, to, amount);
    }
}
```

Add a `manifest.json` to wire the auto-UI for the dual-signature flow:

```json
{
  "name": "Tipjar",
  "description": "Send a tip to any EVVM user, paid in MATE.",
  "tags": {
    "publicPay": ["tip"]
  },
  "actions": {
    "tip": {
      "actionPayload": ["address to", "uint256 amount"]
    }
  }
}
```

After deploying, `/services/Tipjar` shows a `tip` form with two
business inputs (`to`, `amount`) — the auto-UI handles both signatures
and submits them together.

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
