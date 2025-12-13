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
import { executeFlushCustomMetadata } from "@/utils/transactionExecuters/nameServiceExecuter";
import {
  NameServiceABI,
  FlushCustomMetadataInputData,
  PayInputData,
  NameServiceSignatureBuilder,
} from "@evvm/viem-signature-library";

type InfoData = {
  PayInputData: PayInputData;
  FlushCustomMetadataInputData: FlushCustomMetadataInputData;
};

interface FlushCustomMetadataComponentProps {
  evvmID: string;
  nameServiceAddress: string;
}

export const FlushCustomMetadataComponent = ({
  evvmID,
  nameServiceAddress,
}: FlushCustomMetadataComponentProps) => {
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
      nonceNameService: getValue("nonceNameServiceInput_flushCustomMetadata"),
      identity: getValue("identityInput_flushCustomMetadata"),
      priorityFee_EVVM: getValue("priorityFeeInput_flushCustomMetadata"),
      nonce_EVVM: getValue("nonceEVVMInput_flushCustomMetadata"),
      priorityFlag_EVVM: priority === "high",
    };

    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (NameServiceSignatureBuilder as any)(
        walletClient,
        walletData
      );

      const price = await readContract(config, {
        abi: NameServiceABI,
        address: formData.addressNameService as `0x${string}`,
        functionName: "getPriceToFlushCustomMetadata",
        args: [formData.identity],
      });

      const { paySignature, actionSignature } =
        await signatureBuilder.signFlushCustomMetadata(
          BigInt(formData.evvmId),
          formData.addressNameService as `0x${string}`,
          formData.identity,
          BigInt(formData.nonceNameService),
          price as bigint,
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
          amount: price as bigint,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          priority: priority === "high",
          executor: formData.addressNameService as `0x${string}`,
          signature: paySignature,
        },
        FlushCustomMetadataInputData: {
          user: walletData.address as `0x${string}`,
          identity: formData.identity,
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

    executeFlushCustomMetadata(
      dataToGet.FlushCustomMetadataInputData,
      nameServiceAddress as `0x${string}`
    )
      .then(() => {
        console.log("Flush custom metadata executed successfully");
      })
      .catch((error) => {
        console.error("Error executing flush custom metadata:", error);
      });
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <TitleAndLink
        title="Flush Custom Metadata of Identity"
        link="https://www.evvm.info/docs/SignatureStructures/NameService/flushCustomMetadataStructure"
      />

      <br />

      {/* Nonce section with automatic generator */}

      <NumberInputWithGenerator
        label="NameService Nonce"
        inputId="nonceNameServiceInput_flushCustomMetadata"
        placeholder="Enter nonce"
      />

      <TextInputField
        label="Identity"
        inputId="identityInput_flushCustomMetadata"
        placeholder="Enter identity"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_flushCustomMetadata"
        placeholder="Enter priority fee"
      />

      {/* Priority configuration */}
      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_flushCustomMetadata"
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
