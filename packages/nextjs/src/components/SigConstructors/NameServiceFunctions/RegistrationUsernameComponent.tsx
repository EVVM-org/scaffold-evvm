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
import { NameServiceABI } from "@evvm/viem-signature-library";
import { executeRegistrationUsername } from "@/utils/transactionExecuters/nameServiceExecuter";
import {
  EvvmABI,
  PayInputData,
  RegistrationUsernameInputData,
  NameServiceSignatureBuilder,
} from "@evvm/viem-signature-library";

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
      clowNumber: getValue("clowNumberInput_registrationUsername"),
      priorityFee_EVVM: getValue("priorityFeeInput_registrationUsername"),
      nonceEVVM: getValue("nonceEVVMInput_registrationUsername"),
      priorityFlag: priority === "high",
    };

    // Validate that required fields are not empty
    if (!formData.username) {
      throw new Error("Username is required");
    }
    if (!formData.nonceNameService) {
      throw new Error("NameService nonce is required");
    }
    if (!formData.clowNumber) {
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
      const signatureBuilder = new (NameServiceSignatureBuilder as any)(
        walletClient,
        walletData
      );

      await readRewardAmount();

      const { paySignature, actionSignature } =
        await signatureBuilder.signRegistrationUsername(
          BigInt(formData.evvmId),
          formData.addressNameService as `0x${string}`,
          formData.username,
          BigInt(formData.clowNumber),
          BigInt(formData.nonceNameService),
          rewardAmount as bigint,
          BigInt(formData.priorityFee_EVVM),
          BigInt(formData.nonceEVVM),
          formData.priorityFlag
        );

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.addressNameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: rewardAmount ? rewardAmount * BigInt(100) : BigInt(0),
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonceEVVM),
          priority: priority === "high",
          executor: formData.addressNameService as `0x${string}`,
          signature: paySignature,
        },
        RegistrationUsernameInputData: {
          user: walletData.address as `0x${string}`,
          nonce: BigInt(formData.nonceNameService),
          username: formData.username,
          clowNumber: BigInt(formData.clowNumber),
          signature: actionSignature,
          priorityFee_EVVM: BigInt(formData.priorityFee_EVVM),
          nonce_EVVM: BigInt(formData.nonceEVVM),
          priorityFlag_EVVM: formData.priorityFlag,
          signature_EVVM: paySignature,
        },
      });
    } catch (error) {
      console.error("Error creating signatures:", error);
    }
  };

  const readRewardAmount = async () => {
    // Use the prop directly instead of a missing input
    if (!nameServiceAddress) {
      setRewardAmount(null);
    } else {
      await readContract(config, {
        abi: NameServiceABI,
        address: nameServiceAddress as `0x${string}`,
        functionName: "getEvvmAddress",
        args: [],
      })
        .then((evvmAddress) => {
          if (!evvmAddress) {
            setRewardAmount(null);
          }

          readContract(config, {
            abi: EvvmABI,
            address: evvmAddress as `0x${string}`,
            functionName: "getRewardAmount",
            args: [],
          })
            .then((reward) => {
              console.log("Mate reward amount:", reward);
              setRewardAmount(reward ? BigInt(reward.toString()) : null);
            })
            .catch((error) => {
              console.error("Error reading mate reward amount:", error);
              setRewardAmount(null);
            });
        })
        .catch((error) => {
          console.error("Error reading NameService address:", error);
          setRewardAmount(null);
        });
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
        label="Clow Number"
        inputId="clowNumberInput_registrationUsername"
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
