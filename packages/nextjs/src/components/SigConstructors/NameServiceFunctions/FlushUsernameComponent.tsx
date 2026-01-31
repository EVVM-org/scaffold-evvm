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
  createSignerWithViem,
  EVVM,
  NameService,
  NameServiceABI,
  type IPayData as PayInputData,
  type IFlushUsernameData as FlushUsernameInputData,
} from "@evvm/evvm-js";

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const chainId = await signer.getChainId();
      const evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS as `0x${string}`;
      const evvm = new EVVM({ signer, address: evvmAddress, chainId });
      const nameService = new NameService({ signer, address: formData.addressNameService as `0x${string}`, chainId });

      const priceToFlushUsername = await readContract(config, {
        abi: NameServiceABI,
        address: formData.addressNameService as `0x${string}`,
        functionName: "getPriceToFlushUsername",
        args: [formData.username],
      });
      if (!priceToFlushUsername) {
        console.error("Price to flush username is not available");
        return;
      }

      // Create EVVM pay action first
      const evvmAction = await evvm.pay({
        to: formData.addressNameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: priceToFlushUsername as bigint,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: formData.priorityFlag_EVVM,
        executor: formData.addressNameService as `0x${string}`,
      });

      // Create flush username action
      const nsAction = await nameService.flushUsername({
        username: formData.username,
        nonce: BigInt(formData.nonceNameService),
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.addressNameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: priceToFlushUsername as bigint,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          priorityFlag: formData.priorityFlag_EVVM,
          executor: formData.addressNameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        FlushUsernameInputData: nsAction.data,
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
