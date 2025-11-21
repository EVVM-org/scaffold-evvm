"use client";
import React from "react";
import { config } from "@/config/index";
import { writeContract, switchChain } from "@wagmi/core";
import {
  TitleAndLink,
  AddressInputField,
  NumberInputField,
} from "@/components/SigConstructors/InputsAndModules";

import { EvvmABI } from "@evvm/viem-signature-library";
import { getAccountWithRetry } from "@/utils/getAccountWithRetry";

interface SetEvvmIdComponentProps {
  evvmAddress: string;
}

export const SetEvvmIdComponent = ({
  evvmAddress,
}: SetEvvmIdComponentProps) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [txHash, setTxHash] = React.useState<string | null>(null);

  const handleSetEvvmId = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    if (!evvmAddress) {
      alert("Please configure an EVVM address first in the main menu");
      return;
    }

    const newEvvmIdInput = document.getElementById(
      "newEvvmIdInput"
    ) as HTMLInputElement;

    console.log('EVVM Address from props:', evvmAddress);
    console.log('New EVVM ID Input:', newEvvmIdInput);
    console.log('New EVVM ID Value:', newEvvmIdInput?.value);

    if (!newEvvmIdInput?.value) {
      alert("Please enter a new EVVM ID");
      return;
    }

    const newEvvmId = BigInt(newEvvmIdInput.value);

    setIsLoading(true);
    setTxHash(null);

    try {
      // Execute the transaction
      const hash = await writeContract(config, {
        address: evvmAddress as `0x${string}`,
        abi: EvvmABI,
        functionName: "setEvvmID",
        args: [newEvvmId],
      });

      setTxHash(hash);
      alert(`Transaction submitted! New EVVM ID: ${newEvvmId.toString()}\nHash: ${hash}`);
    } catch (error: any) {
      console.error("Error setting EVVM ID:", error);
      alert(`Error: ${error.message || "Failed to set EVVM ID"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <h1>Set EVVM ID</h1>
      <br />

      {/* Display current EVVM Address */}
      {evvmAddress && (
        <div style={{ 
          marginBottom: "1.5rem", 
          padding: "1rem", 
          backgroundColor: "#f0f9ff",
          borderRadius: "8px",
          width: "100%",
        }}>
          <p style={{ color: "#000", marginBottom: "0.5rem" }}>
            <strong>EVVM Contract Address:</strong>
          </p>
          <p style={{ 
            color: "#333", 
            wordBreak: "break-all",
            fontFamily: "monospace",
            fontSize: "0.9rem"
          }}>
            {evvmAddress}
          </p>
        </div>
      )}

      {/* New EVVM ID */}
      <NumberInputField
        label="New EVVM ID"
        inputId="newEvvmIdInput"
        placeholder="Enter new EVVM ID"
      />

      {/* Set button */}
      <button
        onClick={handleSetEvvmId}
        style={{ 
          padding: "0.75rem 1.5rem", 
          marginTop: "1.5rem",
          backgroundColor: isLoading ? "#ccc" : "#000",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: isLoading ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
        disabled={isLoading}
      >
        {isLoading ? "Setting..." : "Set EVVM ID"}
      </button>

      {/* Display transaction hash */}
      {txHash && (
        <div style={{ 
          marginTop: "1.5rem", 
          padding: "1rem", 
          backgroundColor: "#f0fdf4",
          borderRadius: "8px",
          width: "100%",
          border: "2px solid #86efac",
        }}>
          <p style={{ color: "#000", marginBottom: "0.5rem" }}>
            <strong>Transaction Hash:</strong>
          </p>
          <p style={{ 
            color: "#15803d", 
            wordBreak: "break-all",
            fontFamily: "monospace",
            fontSize: "0.9rem"
          }}>
            {txHash}
          </p>
        </div>
      )}
    </div>
  );
};
