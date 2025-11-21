"use client";
import React from "react";
import { config } from "@/config/index";
import { getWalletClient } from "@wagmi/core";

import {
  NumberInputWithGenerator,
  PrioritySelector,
  DataDisplayWithClear,
  HelperInfo,
  NumberInputField,
  StakingActionSelector,
} from "@/components/SigConstructors/InputsAndModules";

import { getAccountWithRetry } from "@/utils/getAccountWithRetry";

import {
  EVVMSignatureBuilder,
  GoldenStakingInputData,
  PayInputData,
} from "@evvm/viem-signature-library";

import { executeGoldenStaking } from "@/utils/transactionExecuters/stakingExecuter";

type InfoData = {
  PayInputData: PayInputData;
  GoldenStakingInputData: GoldenStakingInputData;
};

interface GoldenStakingComponentProps {
  evvmID: string;
  stakingAddress: string;
}

export const GoldenStakingComponent = ({
  evvmID,
  stakingAddress,
}: GoldenStakingComponentProps) => {
  const [isStaking, setIsStaking] = React.useState(true);
  // Golden staking ALWAYS uses sync (low priority) - contract enforced
  const priority = "low";
  const [dataToGet, setDataToGet] = React.useState<InfoData | null>(null);

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const getValue = (id: string) =>
      (document.getElementById(id) as HTMLInputElement).value;

    const formData = {
      evvmID: evvmID,
      nonce: getValue("nonceInput_GoldenStaking"),
      stakingAddress: stakingAddress,
      amountOfStaking: Number(getValue("amountOfStakingInput_GoldenStaking")),
    };

    const amountOfToken =
      BigInt(formData.amountOfStaking) *
      (BigInt(5083) * BigInt(10) ** BigInt(18));

    // Sign and set data

    try {
      const walletClient = await getWalletClient(config);

      // CRITICAL FIX: Use EVVMSignatureBuilder.signPay directly
      // StakingSignatureBuilder.signGoldenStaking is broken - always returns same signature
      const evvmSignatureBuilder = new (EVVMSignatureBuilder as any)(
        walletClient,
        walletData
      );

      console.log("🔧 Using EVVMSignatureBuilder.signPay instead of StakingSignatureBuilder.signGoldenStaking");
      console.log("Priority: low (contract enforced) → priorityFlag: false");

      const signaturePay = await evvmSignatureBuilder.signPay(
        BigInt(formData.evvmID),
        formData.stakingAddress as `0x${string}`,
        "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amountOfToken,
        BigInt(0), // priorityFee always 0 for golden staking
        BigInt(formData.nonce),
        false, // Golden staking ALWAYS uses sync mode (priorityFlag: false)
        formData.stakingAddress as `0x${string}`
      );
      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.stakingAddress as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: amountOfToken,
          priorityFee: BigInt(0),
          nonce: BigInt(formData.nonce),
          priority: false, // Golden staking ALWAYS uses sync mode
          executor: formData.stakingAddress as `0x${string}`,
          signature: signaturePay,
        },
        GoldenStakingInputData: {
          isStaking: isStaking,
          amountOfStaking: BigInt(formData.amountOfStaking),
          signature_EVVM: signaturePay,
        },
      } as InfoData);
    } catch (error) {
      console.error("Error creating signature:", error);
    }
  };

  const execute = async () => {
    if (!dataToGet) {
      console.error("No data to execute payment");
      return;
    }
    const stakingAddress = dataToGet.PayInputData.to_address;

    executeGoldenStaking(dataToGet.GoldenStakingInputData, stakingAddress)
      .then(() => {
        console.log("Golden staking executed successfully");
      })
      .catch((error) => {
        console.error("Error executing golden staking:", error);
      });
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <h1>Golden staking</h1>
      <br />

      {/* EVVM ID is now passed as a prop */}

      {/* stakingAddress is now passed as a prop */}

      {/* Configuration Section */}
      <StakingActionSelector onChange={setIsStaking} />

      {/* Basic input fields */}
      <NumberInputField
        label={
          isStaking
            ? "Amount of MATE to stake"
            : "Amount of MATE to unstake (sMATE)"
        }
        inputId="amountOfStakingInput_GoldenStaking"
        placeholder="Enter amount"
      />

      {/* Info about golden staking always using sync */}
      <div style={{
        padding: "0.75rem",
        marginBottom: "1rem",
        backgroundColor: "#f0f9ff",
        border: "1px solid #0284c7",
        borderRadius: "0.5rem"
      }}>
        <p style={{ fontSize: "0.9rem", margin: 0, color: "#0c4a6e" }}>
          ℹ️ <strong>Golden staking always uses synchronous (low priority) mode.</strong> This is enforced by the contract.
        </p>
      </div>

      {/* Nonce section - only sync nonces allowed, no random button */}
      <NumberInputWithGenerator
        label="Sync Nonce (required)"
        inputId="nonceInput_GoldenStaking"
        placeholder="Enter sync nonce"
        showRandomBtn={false}
      />

      <HelperInfo label="How to find my sync nonce?">
        <div>
          You can retrieve your next sync nonce from the EVVM contract using
          the <code>getNextCurrentSyncNonce</code> function with your address.
          <br />
          <br />
          <strong>IMPORTANT:</strong> Golden staking ALWAYS uses sync nonces. The nonce MUST match your current nextSyncUsedNonce at execution time.
        </div>
      </HelperInfo>

      {/* Create signature button */}
      <button
        onClick={makeSig}
        style={{
          padding: "0.5rem",
          marginTop: "1rem",
        }}
      >
        Create signature
      </button>

      {/* Results section */}
      <DataDisplayWithClear
        dataToGet={dataToGet}
        onClear={() => setDataToGet(null)}
        onExecute={execute}
      />
    </div>
  );
};
