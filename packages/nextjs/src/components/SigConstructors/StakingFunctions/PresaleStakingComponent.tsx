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
  createSignerWithViem,
  EVVM,
  Staking,
  type IPayData as PayInputData,
  type IPresaleStakingData as PresaleStakingInputData,
} from "@evvm/evvm-js";

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
      console.log('🚀 [evvm-js] PresaleStakingComponent: Starting dual signature creation...');
      const walletClient = await getWalletClient(config);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const chainId = await signer.getChainId();
      console.log('🔑 [evvm-js] Signer created from @evvm/evvm-js createSignerWithViem');

      const evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS as `0x${string}`;
      const evvm = new EVVM({ signer, address: evvmAddress, chainId });
      console.log('📦 [evvm-js] EVVM service instantiated from @evvm/evvm-js');

      // Create EVVM pay action first
      console.log('📝 [evvm-js] Creating EVVM pay action (first signature)...');
      const evvmAction = await evvm.pay({
        to: formData.stakingAddress as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: BigInt(amountOfToken),
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: formData.priorityFlag_EVVM,
        executor: formData.stakingAddress as `0x${string}`,
      });
      console.log('✅ [evvm-js] EVVM pay SignedAction created');

      // Create Staking service and use presaleStaking method
      // evvmSignedAction provides the evvmId, bypassing getEvvmID() call
      console.log('📝 [evvm-js] Creating presale staking action via Staking service...');
      const staking = new Staking({ signer, address: stakingAddress as `0x${string}`, chainId });
      const stakingAction = await staking.presaleStaking({
        isStaking: isStaking,
        nonce: BigInt(formData.nonce),
        evvmSignedAction: evvmAction,
      });
      console.log('✅ [evvm-js] Presale staking SignedAction created with dual signatures');

      setDataToGet({
        PresaleStakingInputData: stakingAction.data,
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.stakingAddress as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: BigInt(amountOfToken),
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
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
