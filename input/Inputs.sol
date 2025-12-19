// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import {EvvmStructs} from "@evvm/testnet-contracts/contracts/evvm/lib/EvvmStructs.sol";

abstract contract Inputs {
    address admin = 0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45;
    address goldenFisher = 0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45;
    address activator = 0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45;

    EvvmStructs.EvvmMetadata inputMetadata =
        EvvmStructs.EvvmMetadata({
            EvvmName: "EVVM",
            // evvmID will be set to 0, and it will be assigned when you register the evvm
            EvvmID: 0,
            principalTokenName: "Mate token",
            principalTokenSymbol: "MATE",
            principalTokenAddress: 0x0000000000000000000000000000000000000001,
            totalSupply: 2033333333000000000000000000,
            eraTokens: 1016666666500000000000000000,
            reward: 5000000000000000000
        });
}
