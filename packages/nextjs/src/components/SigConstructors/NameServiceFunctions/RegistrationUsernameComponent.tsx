"use client";
import React from "react";
import { config } from "@/config/index";
import { getWalletClient, readContract } from "@wagmi/core";
import {
  TitleAndLink,
  NumberInputWithGenerator,
  PrioritySelector,
  DataDisplayWithClear,
  HelperInfo,
  NumberInputField,
  TextInputField,
} from "@/components/SigConstructors/InputsAndModules";

import { getAccountWithRetry } from "@/utils/getAccountWithRetry";
import { executeRegistrationUsername } from "@/utils/transactionExecuters/nameServiceExecuter";
import {
  createSignerWithViem,
  Core,
  NameService,
  CoreABI,
  NameServiceABI,
  type IPayData as PayInputData,
  type IRegistrationUsernameData as RegistrationUsernameInputData,
} from "@evvm/evvm-js";

type InfoData = {
  PayInputData: PayInputData;
  RegistrationUsernameInputData: RegistrationUsernameInputData;
};

interface RegistrationUsernameComponentProps {
  evvmID: string;
  nameServiceAddress: string;
}

export const RegistrationUsernameComponent = ({
  evvmID,
  nameServiceAddress,
}: RegistrationUsernameComponentProps) => {
  const [priority, setPriority] = React.useState("low");
  const [dataToGet, setDataToGet] = React.useState<InfoData | null>(null);
  const [rewardAmount, setRewardAmount] = React.useState<bigint | null>(null);

  const getValue = (id: string) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) {
      throw new Error(
        `Input element with id '${id}' not found. Ensure the input is rendered and the id is correct.`
      );
    }
    return el.value;
  };

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const formData = {
      evvmId: evvmID,
      addressNameService: nameServiceAddress,
      nonceNameService: getValue("nonceNameServiceInput_registrationUsername"),
      username: getValue("usernameInput_registrationUsername"),
      lockNumber: getValue("lockNumberInput_registrationUsername"),
      priorityFee_EVVM: getValue("priorityFeeInput_registrationUsername"),
      nonceEVVM: getValue("nonceEVVMInput_registrationUsername"),
      isAsyncExec: priority === "high",
    };

    // Validate that required fields are not empty
    if (!formData.username) {
      throw new Error("Username is required");
    }
    if (!formData.nonceNameService) {
      throw new Error("NameService nonce is required");
    }
    if (!formData.lockNumber) {
      throw new Error("Clow number is required");
    }
    if (!formData.nonceEVVM) {
      throw new Error("EVVM nonce is required");
    }
    if (!formData.priorityFee_EVVM) {
      throw new Error("Priority fee is required");
    }

    try {
      const walletClient = await getWalletClient(config);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const chainId = await signer.getChainId();
      const evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS as `0x${string}`;
      const evvm = new Core({ signer, address: evvmAddress, chainId });
      const nameService = new NameService({ signer, address: formData.addressNameService as `0x${string}`, chainId });

      const currentReward = await readRewardAmount();

      if (!currentReward) {
        throw new Error("Could not read reward amount from Core contract. Please try again.");
      }

      const amount = currentReward * BigInt(100);

      // Create EVVM pay action first
      const evvmAction = await evvm.pay({
        toAddress: formData.addressNameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: amount,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonceEVVM),
        isAsyncExec: formData.isAsyncExec,
        senderExecutor: formData.addressNameService as `0x${string}`,
      });

      // Create registration action
      const nsAction = await nameService.registrationUsername({
        username: formData.username,
        lockNumber: BigInt(formData.lockNumber),
        nonce: BigInt(formData.nonceNameService),
        originExecutor: (walletData.address || "0x0000000000000000000000000000000000000000") as `0x${string}`,
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.addressNameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: amount,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonceEVVM),
          isAsyncExec: priority === "high",
          senderExecutor: formData.addressNameService as `0x${string}`,
          originExecutor: walletData.address as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        RegistrationUsernameInputData: nsAction.data,
      });
    } catch (error) {
      console.error("Error creating signatures:", error);
    }
  };

  const readRewardAmount = async (): Promise<bigint | null> => {
    if (!nameServiceAddress) {
      setRewardAmount(null);
      return null;
    }

    try {
      const evvmAddress = await readContract(config, {
        abi: NameServiceABI,
        address: nameServiceAddress as `0x${string}`,
        functionName: "getCoreAddress",
        args: [],
      });

      if (!evvmAddress) {
        setRewardAmount(null);
        return null;
      }

      const reward = await readContract(config, {
        abi: CoreABI,
        address: evvmAddress as `0x${string}`,
        functionName: "getRewardAmount",
        args: [],
      });

      console.log("Mate reward amount:", reward);
      const value = reward ? BigInt(reward.toString()) : null;
      setRewardAmount(value);
      return value;
    } catch (error) {
      console.error("Error reading reward amount:", error);
      setRewardAmount(null);
      return null;
    }
  };

  const execute = async () => {
    if (!dataToGet) {
      console.error("No data to execute payment");
      return;
    }

    console.log("Executing registration username...");

    executeRegistrationUsername(
      dataToGet.RegistrationUsernameInputData,
      nameServiceAddress as `0x${string}`
    )
      .then(() => {
        console.log("Registration username executed successfully");
      })
      .catch((error) => {
        console.error("Error executing registration username:", error);
      });
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <TitleAndLink
        title="Registration of username"
        link="https://www.evvm.info/docs/SignatureStructures/NameService/registrationUsernameStructure"
      />

      <br />

      <p>
        This functionality is not considering username offers to calculate
        registration fees. We acknowledge that this functionality is needed to
        avoid reentrancy renewal attacks to avoid paying the demand based
        renewal fee.
      </p>
      <br />

      <NumberInputWithGenerator
        label="NameService Nonce"
        inputId="nonceNameServiceInput_registrationUsername"
        placeholder="Enter nonce"
      />

      <NumberInputField
        label="Lock Number"
        inputId="lockNumberInput_registrationUsername"
        placeholder="Enter clow number"
      />

      <TextInputField
        label="Username"
        inputId="usernameInput_registrationUsername"
        placeholder="Enter username"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_registrationUsername"
        placeholder="Enter priority fee"
      />

      {/* Priority configuration */}
      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_registrationUsername"
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

      <DataDisplayWithClear
        dataToGet={dataToGet}
        onClear={() => setDataToGet(null)}
        onExecute={execute}
      />
    </div>
  );
};
