"use client";
import React from "react";
import { getAccount, writeContract } from "@wagmi/core";
import { config } from "@/config/index";
import { AddressInputField } from "../InputsAndModules/AddressInputField";
import { NumberInputField } from "../InputsAndModules/NumberInputField";
import { EvvmABI } from "@evvm/viem-signature-library";

import { getAccountWithRetry } from "@/utils/getAccountWithRetry";
import { HelperInfo } from "../InputsAndModules/HelperInfo";

interface FaucetFunctionsComponentProps {
  evvmAddress: string;
}

export const FaucetFunctionsComponent = ({
  evvmAddress,
}: FaucetFunctionsComponentProps) => {
  const account = getAccount(config);

  const executeFaucet = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const getValue = (id: string) =>
      (document.getElementById(id) as HTMLInputElement).value;

    const formData = {
      evvmAddress: evvmAddress,
      user: getValue("addressGive_faucet"),
      token: getValue("tokenAddress_faucet"),
      quantity: getValue("amountTokenInput_faucet"),
    };

    writeContract(config, {
      abi: EvvmABI,
      address: formData.evvmAddress as `0x${string}`,
      functionName: "addBalance",
      args: [formData.user, formData.token, formData.quantity],
    })
      .then(() => {
        console.log("Tokens successfully sent to", formData.user);
      })
      .catch((error) => {
        console.error("Error sending tokens:", error);
      });
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <h1>Faucet</h1>
      <p>This faucet allows you to get tokens to a specified address.</p>
      <br />

      <AddressInputField
        label="Address to get tokens"
        inputId="addressGive_faucet"
        placeholder="Enter address"
      />

      <AddressInputField
        label="Token address"
        inputId="tokenAddress_faucet"
        placeholder="Enter token address"
      />

      <div>
        <HelperInfo label="Most common token addresses">
          <div style={{ marginTop: 8 }}>
            <strong>MATE</strong> address:
            <br />
            0x0000000000000000000000000000000000000001
          </div>
          <div>
            <strong>ETH</strong> address:
            <br />
            0x0000000000000000000000000000000000000000
          </div>
        </HelperInfo>
      </div>

      <NumberInputField
        label="Amount"
        inputId="amountTokenInput_faucet"
        placeholder="Enter amount"
      />

      <button
        onClick={executeFaucet}
        style={{
          padding: "0.5rem",
          marginTop: "1rem",
        }}
      >
        Get Tokens
      </button>
    </div>
  );
};
