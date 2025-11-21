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
import { executeRemoveCustomMetadata } from "@/utils/transactionExecuters/nameServiceExecuter";
import {
  NameServiceABI,
  PayInputData,
  RemoveCustomMetadataInputData,
  NameServiceSignatureBuilder,
} from "@evvm/viem-signature-library";

type InfoData = {
  PayInputData: PayInputData;
  RemoveCustomMetadataInputData: RemoveCustomMetadataInputData;
};

interface RemoveCustomMetadataComponentProps {
  evvmID: string;
  nameServiceAddress: string;
}

export const RemoveCustomMetadataComponent = ({
  evvmID,
  nameServiceAddress,
}: RemoveCustomMetadataComponentProps) => {
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
      nonceNameService: getValue("nonceNameServiceInput_removeCustomMetadata"),
      identity: getValue("identityInput_removeCustomMetadata"),
      key: getValue("keyInput_removeCustomMetadata"),
      priorityFee_EVVM: getValue("priorityFeeInput_removeCustomMetadata"),
      nonceEVVM: getValue("nonceEVVMInput_removeCustomMetadata"),
      priorityFlag: priority === "high",
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
        functionName: "getPriceToRemoveCustomMetadata",
        args: [],
      });
      if (!price) {
        console.error("Price to remove custom metadata is not available");
        return;
      }

      const { paySignature, actionSignature } =
        await signatureBuilder.signRemoveCustomMetadata(
          BigInt(formData.evvmId),
          formData.addressNameService as `0x${string}`,
          formData.identity,
          BigInt(formData.key),
          BigInt(formData.nonceNameService),
          price as bigint,
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
          amount: price as bigint,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonceEVVM),
          priority: priority === "high",
          executor: formData.addressNameService as `0x${string}`,
          signature: paySignature,
        },
        RemoveCustomMetadataInputData: {
          user: walletData.address as `0x${string}`,
          nonce: BigInt(formData.nonceNameService),
          identity: formData.identity,
          key: BigInt(formData.key),
          priorityFee_EVVM: BigInt(formData.priorityFee_EVVM),
          signature: actionSignature,
          nonce_EVVM: BigInt(formData.nonceEVVM),
          priorityFlag_EVVM: formData.priorityFlag,
          signature_EVVM: paySignature,
        },
      });
    } catch (error) {
      console.error("Error signing accept offer:", error);
    }
  };

  const execute = async () => {
    if (!dataToGet) {
      console.error("No data to execute payment");
      return;
    }

    executeRemoveCustomMetadata(
      dataToGet.RemoveCustomMetadataInputData,
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
        title="Remove custom metadata of identity"
        link="https://www.evvm.info/docs/SignatureStructures/NameService/removeCustomMetadataStructure"
      />

      <br />

      <br />

      <NumberInputWithGenerator
        label="NameService Nonce"
        inputId="nonceNameServiceInput_removeCustomMetadata"
        placeholder="Enter nonce"
      />

      <TextInputField
        label="Identity"
        inputId="identityInput_removeCustomMetadata"
        placeholder="Enter identity"
      />

      <TextInputField
        label="Key"
        inputId="keyInput_removeCustomMetadata"
        placeholder="Enter key"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_removeCustomMetadata"
        placeholder="Enter priority fee"
      />

      {/* Priority configuration */}
      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_removeCustomMetadata"
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
