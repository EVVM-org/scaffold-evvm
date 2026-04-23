// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Counter
 * @notice Minimal example service for scaffold-evvm. No dependencies, no
 *         EVVM integration — demonstrates that any plain Solidity contract
 *         dropped into services/ gets compiled, deployed, and surfaced in
 *         the frontend automatically.
 */
contract Counter {
    /// @notice Current count.
    uint256 public count;

    /// @notice Who last modified the count.
    address public lastCaller;

    event Incremented(address indexed by, uint256 newCount);
    event Decremented(address indexed by, uint256 newCount);
    event Reset(address indexed by);

    /// @notice Increment the counter by 1.
    function increment() external {
        count += 1;
        lastCaller = msg.sender;
        emit Incremented(msg.sender, count);
    }

    /// @notice Decrement the counter by 1. Reverts if already zero.
    function decrement() external {
        require(count > 0, "Counter: cannot go below zero");
        count -= 1;
        lastCaller = msg.sender;
        emit Decremented(msg.sender, count);
    }

    /// @notice Add an arbitrary amount to the counter.
    function addAmount(uint256 amount) external {
        count += amount;
        lastCaller = msg.sender;
        emit Incremented(msg.sender, count);
    }

    /// @notice Reset the counter to zero.
    function reset() external {
        count = 0;
        lastCaller = msg.sender;
        emit Reset(msg.sender);
    }

    /// @notice Read the current count and last caller in one call.
    function summary() external view returns (uint256 currentCount, address caller) {
        return (count, lastCaller);
    }
}
