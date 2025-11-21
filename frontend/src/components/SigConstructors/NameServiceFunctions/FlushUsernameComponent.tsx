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
import { executeFlushUsername } from "@/utils/transactionExecuters/nameServiceExecuter";
import {
  NameServiceABI,
  PayInputData,
  FlushUsernameInputData,
  NameServiceSignatureBuilder,
} from "@evvm/viem-signature-library";

type InfoData = {
  PayInputData: PayInputData;
  FlushUsernameInputData: FlushUsernameInputData;
};

interface FlushUsernameComponentProps {
  evvmID: string;
  nameServiceAddress: string;
}

export const FlushUsernameComponent = ({
  evvmID,
  nameServiceAddress,
}: FlushUsernameComponentProps) => {
  const [priority, setPriority] = React.useState("low");
  const [dataToGet, setDataToGet] = React.useState<InfoData | null>(null);

  const getValue = (id: string) =>
    (document.getElementById(id) as HTMLInputElement).value;

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const formData = {
      evvmId: evvmID,
      addressNameService: nameServiceAddress,
      nonceNameService: getValue("nonceNameServiceInput_flushUsername"),
      username: getValue("usernameInput_flushUsername"),
      priorityFee_EVVM: getValue("priorityFeeInput_flushUsername"),
      nonce_EVVM: getValue("nonceEVVMInput_flushUsername"),
      priorityFlag_EVVM: priority === "high",
    };

    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (NameServiceSignatureBuilder as any)(
        walletClient,
        walletData
      );

      const priceToFlushUsername = await readContract(config, {
        abi: NameServiceABI,
        address: formData.addressNameService as `0x${string}`,
        functionName: "getPriceToFlushUsername",
        args: [formData.username],
      });
      if (!priceToFlushUsername) {
        console.error("Price to remove custom metadata is not available");
        return;
      }

      const { paySignature, actionSignature } =
        await signatureBuilder.signFlushUsername(
          BigInt(formData.evvmId),
          formData.addressNameService as `0x${string}`,
          formData.username,
          BigInt(formData.nonceNameService),
          priceToFlushUsername as bigint,
          BigInt(formData.priorityFee_EVVM),
          BigInt(formData.nonce_EVVM),
          formData.priorityFlag_EVVM
        );
      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.addressNameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: priceToFlushUsername as bigint,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          priority: formData.priorityFlag_EVVM,
          executor: formData.addressNameService as `0x${string}`,
          signature: paySignature,
        },
        FlushUsernameInputData: {
          user: walletData.address as `0x${string}`,
          username: formData.username,
          nonce: BigInt(formData.nonceNameService),
          signature: actionSignature,
          priorityFee_EVVM: BigInt(formData.priorityFee_EVVM),
          nonce_EVVM: BigInt(formData.nonce_EVVM),
          priorityFlag_EVVM: formData.priorityFlag_EVVM,
          signature_EVVM: paySignature,
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

    executeFlushUsername(dataToGet.FlushUsernameInputData, nameServiceAddress as `0x${string}`)
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
        title="Delete Username"
        link="https://www.evvm.info/docs/SignatureStructures/NameService/flushUsernameStructure"
      />
      <br />
      <p>
        This function deletes all metadata associated with a username but does
        not remove the offers made on that username.
      </p>
      <br />

      {/* Nonce section with automatic generator */}

      <NumberInputWithGenerator
        label="NameService Nonce"
        inputId="nonceNameServiceInput_flushUsername"
        placeholder="Enter nonce"
      />

      <TextInputField
        label="Identity"
        inputId="usernameInput_flushUsername"
        placeholder="Enter username"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_flushUsername"
        placeholder="Enter priority fee"
      />

      {/* Priority configuration */}
      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_flushUsername"
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
