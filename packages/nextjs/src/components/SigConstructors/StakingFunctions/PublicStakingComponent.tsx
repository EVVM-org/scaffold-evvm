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
import { executePublicStaking } from "@/utils/transactionExecuters/stakingExecuter";
import { getAccountWithRetry } from "@/utils/getAccountWithRetry";
import {
  createSignerWithViem,
  EVVM,
  Staking,
  type IPayData as PayInputData,
  type IPublicStakingData as PublicStakingInputData,
} from "@evvm/evvm-js";

type InputData = {
  PublicStakingInputData: PublicStakingInputData;
  PayInputData: PayInputData;
};

interface PublicStakingComponentProps {
  evvmID: string;
  stakingAddress: string;
}

export const PublicStakingComponent = ({
  evvmID,
  stakingAddress,
}: PublicStakingComponentProps) => {
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
      nonceEVVM: getValue("nonceEVVMInput_PublicStaking"),
      nonceStaking: getValue("nonceStakingInput_PublicStaking"),
      amountOfStaking: Number(getValue("amountOfStakingInput_PublicStaking")),
      priorityFee: getValue("priorityFeeInput_PublicStaking"),
    };

    if (!formData.stakingAddress) {
      alert("Please enter a staking address");
      return;
    }

    const amountOfToken =
      BigInt(formData.amountOfStaking) *
      (BigInt(5083) * BigInt(10) ** BigInt(18));

    try {
      console.log('🚀 [evvm-js] PublicStakingComponent: Starting dual signature creation...');
      const walletClient = await getWalletClient(config);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      console.log('🔑 [evvm-js] Signer created from @evvm/evvm-js createSignerWithViem');

      const evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS as `0x${string}`;
      const evvm = new EVVM(signer, evvmAddress);
      console.log('📦 [evvm-js] EVVM service instantiated from @evvm/evvm-js');

      // Create EVVM pay action first
      console.log('📝 [evvm-js] Creating EVVM pay action (first signature)...');
      const evvmAction = await evvm.pay({
        to: formData.stakingAddress as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: amountOfToken,
        priorityFee: BigInt(formData.priorityFee),
        nonce: BigInt(formData.nonceEVVM),
        priorityFlag: priority === "high",
        executor: formData.stakingAddress as `0x${string}`,
      });
      console.log('✅ [evvm-js] EVVM pay SignedAction created');

      // Create Staking service and use publicStaking method
      // evvmSignedAction provides the evvmId, bypassing getEvvmID() call
      console.log('📝 [evvm-js] Creating public staking action via Staking service...');
      const staking = new Staking(signer, stakingAddress as `0x${string}`);
      const stakingAction = await staking.publicStaking({
        isStaking: isStaking,
        amountOfStaking: BigInt(formData.amountOfStaking),
        nonce: BigInt(formData.nonceStaking),
        evvmSignedAction: evvmAction,
      });
      console.log('✅ [evvm-js] Public staking SignedAction created with dual signatures');

      setDataToGet({
        PublicStakingInputData: stakingAction.data,
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.stakingAddress as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: BigInt(amountOfToken),
          priorityFee: BigInt(formData.priorityFee),
          nonce: BigInt(formData.nonceEVVM),
          priorityFlag: priority === "high",
          executor: formData.stakingAddress as `0x${string}`,
          signature: evvmAction.data.signature,
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

    const stakingAddress = dataToGet.PayInputData.to_address!;

    executePublicStaking(dataToGet.PublicStakingInputData, stakingAddress)
      .then(() => {
        console.log("Public staking executed successfully");
      })
      .catch((error) => {
        console.error("Error executing public staking:", error);
      });
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <TitleAndLink
        title="Public Staking"
        link="https://www.evvm.info/docs/SignatureStructures/SMate/StakingUnstakingStructure"
      />
      <br />

      {/* EVVM ID is now passed as a prop */}

      {/* stakingAddress is now passed as a prop */}

      {/* Configuration Section */}
      <StakingActionSelector onChange={setIsStaking} />

      {/* Nonce Generators */}

      <NumberInputWithGenerator
        label="staking Nonce"
        inputId="nonceStakingInput_PublicStaking"
        placeholder="Enter nonce"
      />

      {/* Amount Inputs */}
      <NumberInputField
        label={
          isStaking
            ? "Amount of MATE to stake"
            : "Amount of MATE to unstake (sMATE)"
        }
        inputId="amountOfStakingInput_PublicStaking"
        placeholder="Enter amount"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_PublicStaking"
        placeholder="Enter priority fee"
      />

      {/* Priority Selection */}
      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_PublicStaking"
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
