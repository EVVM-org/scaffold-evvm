"use client";
import React from "react";
import { config } from "@/config/index";
import { getWalletClient } from "@wagmi/core";
import {
  TitleAndLink,
  NumberInputWithGenerator,
  PrioritySelector,
  DataDisplayWithClear,
  HelperInfo,
  NumberInputField,
  StakingActionSelector,
} from "@/components/SigConstructors/InputsAndModules";
import { executePresaleStaking } from "@/utils/transactionExecuters/stakingExecuter";
import { getAccountWithRetry } from "@/utils/getAccountWithRetry";
import {
  PayInputData,
  PresaleStakingInputData,
  StakingSignatureBuilder,
} from "@evvm/viem-signature-library";

type InputData = {
  PresaleStakingInputData: PresaleStakingInputData;
  PayInputData: PayInputData;
};

interface PresaleStakingComponentProps {
  evvmID: string;
  stakingAddress: string;
}

export const PresaleStakingComponent = ({
  evvmID,
  stakingAddress,
}: PresaleStakingComponentProps) => {
  const [isStaking, setIsStaking] = React.useState(true);
  const [priority, setPriority] = React.useState("low");

  const [dataToGet, setDataToGet] = React.useState<InputData | null>(null);

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const getValue = (id: string) =>
      (document.getElementById(id) as HTMLInputElement).value;

    const formData = {
      evvmID: evvmID,
      stakingAddress: stakingAddress,
      priorityFee_EVVM: getValue("priorityFeeInput_presaleStaking"),
      nonce_EVVM: getValue("nonceEVVMInput_presaleStaking"),
      nonce: getValue("nonceStakingInput_presaleStaking"),
      priorityFlag_EVVM: priority === "high",
    };

    const amountOfToken = (1 * 10 ** 18).toLocaleString("fullwide", {
      useGrouping: false,
    });

    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (StakingSignatureBuilder as any)(
        walletClient,
        walletData
      );

      const { paySignature, actionSignature } =
        await signatureBuilder.signPresaleStaking(
          BigInt(formData.evvmID),
          formData.stakingAddress as `0x${string}`,
          isStaking,
          BigInt(formData.nonce),
          BigInt(formData.priorityFee_EVVM),
          BigInt(amountOfToken),
          BigInt(formData.nonce_EVVM),
          formData.priorityFlag_EVVM
        );

      setDataToGet({
        PresaleStakingInputData: {
          isStaking: isStaking,
          user: walletData.address as `0x${string}`,
          nonce: BigInt(formData.nonce),
          signature: actionSignature,
          priorityFee_EVVM: BigInt(formData.priorityFee_EVVM),
          priorityFlag_EVVM: priority === "high",
          nonce_EVVM: BigInt(formData.nonce_EVVM),
          signature_EVVM: paySignature,
        },
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.stakingAddress as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: BigInt(amountOfToken),
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          priority: priority === "high",
          executor: formData.stakingAddress as `0x${string}`,
          signature: paySignature,
        },
      });
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

    executePresaleStaking(dataToGet.PresaleStakingInputData, stakingAddress)
      .then(() => {
        console.log("Presale staking executed successfully");
      })
      .catch((error) => {
        console.error("Error executing presale staking:", error);
      });
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <TitleAndLink
        title="Presale Staking"
        link="https://www.evvm.info/docs/SignatureStructures/SMate/StakingUnstakingStructure"
      />
      <br />
      <p>A presale staker can stake/unstake one sMATE per transaction.</p>
      <br />

      {/* EVVM ID is now passed as a prop */}

      {/* stakingAddress is now passed as a prop */}

      {/* Configuration Section */}
      <StakingActionSelector onChange={setIsStaking} />

      {/* Nonce Generators */}

      <NumberInputWithGenerator
        label="staking Nonce"
        inputId="nonceStakingInput_presaleStaking"
        placeholder="Enter nonce"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_presaleStaking"
        placeholder="Enter priority fee"
      />

      {/* Priority Selection */}
      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_presaleStaking"
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

      {/* Action Button */}
      <button onClick={makeSig}>Create Signature</button>

      {/* Results Section */}
      <DataDisplayWithClear
        dataToGet={dataToGet}
        onClear={() => setDataToGet(null)}
        onExecute={execute}
      />
    </div>
  );
};
