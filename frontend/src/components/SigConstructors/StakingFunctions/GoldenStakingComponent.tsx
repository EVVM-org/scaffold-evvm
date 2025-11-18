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
  StakingSignatureBuilder,
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
  const [priority, setPriority] = React.useState("low");
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
      const signatureBuilder = new (StakingSignatureBuilder as any)(
        walletClient,
        walletData
      );

      const signaturePay = await signatureBuilder.signGoldenStaking(
        BigInt(formData.evvmID),
        formData.stakingAddress as `0x${string}`,
        amountOfToken,
        BigInt(formData.nonce),
        priority === "high"
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
          priority: priority === "high",
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

      {/* Priority configuration */}
      <PrioritySelector onPriorityChange={setPriority} />

      {/* Nonce section with automatic generator */}

      <NumberInputWithGenerator
        label="Nonce"
        inputId="nonceInput_GoldenStaking"
        placeholder="Enter nonce"
        showRandomBtn={priority !== "low"}
      />

      <div>
        {priority === "low" && (
          <HelperInfo label="How to find my sync nonce?">
            <div>
              You can retrieve your next sync nonce from the EVVM contract using
              the <code>getNextCurrentSyncNonce</code> function.
            </div>
          </HelperInfo>
        )}
      </div>

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
