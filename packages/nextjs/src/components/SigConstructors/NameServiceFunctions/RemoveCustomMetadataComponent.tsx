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
  createSignerWithViem,
  EVVM,
  NameService,
  NameServiceABI,
  type IPayData as PayInputData,
  type IRemoveCustomMetadataData as RemoveCustomMetadataInputData,
} from "@evvm/evvm-js";

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS as `0x${string}`;
      const evvm = new EVVM(signer, evvmAddress);
      const nameService = new NameService(signer, formData.addressNameService as `0x${string}`);

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

      // Create EVVM pay action first
      const evvmAction = await evvm.pay({
        to: formData.addressNameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: price as bigint,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonceEVVM),
        priorityFlag: formData.priorityFlag,
        executor: formData.addressNameService as `0x${string}`,
      });

      // Create remove custom metadata action
      const nsAction = await nameService.removeCustomMetadata({
        identity: formData.identity,
        key: BigInt(formData.key),
        nonce: BigInt(formData.nonceNameService),
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.addressNameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: price as bigint,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonceEVVM),
          priorityFlag: priority === "high",
          executor: formData.addressNameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        RemoveCustomMetadataInputData: nsAction.data,
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
