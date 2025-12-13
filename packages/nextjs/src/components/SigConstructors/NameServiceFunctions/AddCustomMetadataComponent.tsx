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
import { executeAddCustomMetadata } from "@/utils/transactionExecuters/nameServiceExecuter";
import {
  NameServiceABI,
  AddCustomMetadataInputData,
  PayInputData,
  NameServiceSignatureBuilder,
} from "@evvm/viem-signature-library";

type InfoData = {
  PayInputData: PayInputData;
  AddCustomMetadataInputData: AddCustomMetadataInputData;
};

interface AddCustomMetadataComponentProps {
  evvmID: string;
  nameServiceAddress: string;
}

export const AddCustomMetadataComponent = ({
  evvmID,
  nameServiceAddress,
}: AddCustomMetadataComponentProps) => {
  const [priority, setPriority] = React.useState("low");
  const [dataToGet, setDataToGet] = React.useState<InfoData | null>(null);
  const [amountToAddCustomMetadata, setAmountToAddCustomMetadata] =
    React.useState<bigint | null>(null);

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
      nonceNameService: getValue("nonceNameServiceInput_addCustomMetadata"),
      identity: getValue("identityInput_addCustomMetadata"),
      schema: getValue("schemaInput_addCustomMetadata"),
      subschema: getValue("subschemaInput_addCustomMetadata"),
      value: getValue("valueInput_addCustomMetadata"),
      priorityFee_EVVM: getValue("priorityFeeInput_addCustomMetadata"),
      nonceEVVM: getValue("nonceEVVMInput_addCustomMetadata"),
      priorityFlag: priority === "high",
    };

    let valueCustomMetadata = `${formData.schema}:${formData.subschema}>${formData.value}`;

    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (NameServiceSignatureBuilder as any)(
        walletClient,
        walletData
      );

      await getPriceToAddCustomMetadata();

      const { paySignature, actionSignature } =
        await signatureBuilder.signAddCustomMetadata(
          BigInt(formData.evvmId),
          formData.addressNameService as `0x${string}`,
          BigInt(formData.nonceNameService),
          formData.identity,
          valueCustomMetadata,
          amountToAddCustomMetadata
            ? BigInt(amountToAddCustomMetadata)
            : BigInt(5000000000000000000 * 10),
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
          amount: amountToAddCustomMetadata
            ? BigInt(amountToAddCustomMetadata)
            : BigInt(5000000000000000000 * 10),
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonceEVVM),
          priority: priority === "high",
          executor: formData.addressNameService as `0x${string}`,
          signature: paySignature,
        },
        AddCustomMetadataInputData: {
          user: walletData.address as `0x${string}`,
          identity: formData.identity,
          value: valueCustomMetadata,
          nonce: BigInt(formData.nonceNameService),
          signature: actionSignature,
          priorityFee_EVVM: BigInt(formData.priorityFee_EVVM),
          nonce_EVVM: BigInt(formData.nonceEVVM),
          priorityFlag_EVVM: formData.priorityFlag,
          signature_EVVM: paySignature,
        },
      });
    } catch (error) {
      console.error("Error creating signature:", error);
    }
  };

  const getPriceToAddCustomMetadata = async () => {
    // Use nameServiceAddress from props, not input
    if (!nameServiceAddress) {
      setAmountToAddCustomMetadata(null);
    } else {
      await readContract(config, {
        abi: NameServiceABI,
        address: nameServiceAddress as `0x${string}`,
        functionName: "getPriceToAddCustomMetadata",
        args: [],
      })
        .then((price) => {
          console.log("Price to add custom metadata:", price);
          setAmountToAddCustomMetadata(price ? BigInt(price.toString()) : null);
        })
        .catch((error) => {
          console.error("Error reading price to add custom metadata:", error);
          setAmountToAddCustomMetadata(null);
        });
    }
  };

  const execute = async () => {
    if (!dataToGet) {
      console.error("No data to execute payment");
      return;
    }

    executeAddCustomMetadata(
      dataToGet.AddCustomMetadataInputData,
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
        title="Add custom metadata of identity"
        link="https://www.evvm.info/docs/SignatureStructures/NameService/addCustomMetadataStructure"
      />

      <br />

      <NumberInputWithGenerator
        label="NameService Nonce"
        inputId="nonceNameServiceInput_addCustomMetadata"
        placeholder="Enter nonce"
      />

      <TextInputField
        label="Identity"
        inputId="identityInput_addCustomMetadata"
        placeholder="Enter identity"
      />

      <TextInputField
        label="Schema"
        inputId="schemaInput_addCustomMetadata"
        placeholder="Enter schema"
      />

      <TextInputField
        label="Subschema"
        inputId="subschemaInput_addCustomMetadata"
        placeholder="Enter subschema"
      />

      <TextInputField
        label="Value"
        inputId="valueInput_addCustomMetadata"
        placeholder="Enter value"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_addCustomMetadata"
        placeholder="Enter priority fee"
      />

      {/* Priority configuration */}
      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_addCustomMetadata"
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
