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
  createSignerWithViem,
  Core,
  NameService,
  NameServiceABI,
  type IPayData as PayInputData,
  type IFlushCustomMetadataData as FlushCustomMetadataInputData,
} from "@evvm/evvm-js";

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const chainId = await signer.getChainId();
      const evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS as `0x${string}`;
      const evvm = new Core({ signer, address: evvmAddress, chainId });
      const nameService = new NameService({ signer, address: formData.addressNameService as `0x${string}`, chainId });

      const price = await readContract(config, {
        abi: NameServiceABI,
        address: formData.addressNameService as `0x${string}`,
        functionName: "getPriceToFlushCustomMetadata",
        args: [formData.identity],
      });

      // Create EVVM pay action first
      const evvmAction = await evvm.pay({
        toAddress: formData.addressNameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: price as bigint,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonce_EVVM),
        isAsyncExec: formData.priorityFlag_EVVM,
        senderExecutor: formData.addressNameService as `0x${string}`,
      });

      // Create flush custom metadata action
      const nsAction = await nameService.flushCustomMetadata({
        identity: formData.identity,
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
          amount: price as bigint,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          isAsyncExec: priority === "high",
          senderExecutor: formData.addressNameService as `0x${string}`,
          originExecutor: walletData.address as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        FlushCustomMetadataInputData: nsAction.data,
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
