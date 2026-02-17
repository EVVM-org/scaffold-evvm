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
  TextInputField,
} from "@/components/SigConstructors/InputsAndModules";
import { getAccountWithRetry } from "@/utils/getAccountWithRetry";
import { executePreRegistrationUsername } from "@/utils/transactionExecuters/nameServiceExecuter";
import {
  createSignerWithViem,
  Core,
  NameService,
  type IPayData as PayInputData,
  type IPreRegistrationUsernameData as PreRegistrationUsernameInputData,
} from "@evvm/evvm-js";
import { keccak256, encodePacked } from "viem";

// Hash function for pre-registered username
function hashPreRegisteredUsername(username: string, lockNumber: bigint): string {
  return keccak256(encodePacked(['string', 'uint256'], [username, lockNumber]));
}

type InfoData = {
  PayInputData: PayInputData;
  PreRegistrationUsernameInputData: PreRegistrationUsernameInputData;
};

interface PreRegistrationUsernameComponentProps {
  evvmID: string;
  nameServiceAddress: string;
}

export const PreRegistrationUsernameComponent = ({
  evvmID,
  nameServiceAddress,
}: PreRegistrationUsernameComponentProps) => {
  const [priority, setPriority] = React.useState("low");
  const [dataToGet, setDataToGet] = React.useState<InfoData | null>(null);

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const getValue = (id: string) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (!el) {
        throw new Error(
          `Input element with id '${id}' not found. Ensure the input is rendered and the id is correct.`
        );
      }
      return el.value;
    };

    const formData = {
      evvmId: evvmID,
      addressNameService: nameServiceAddress,
      username: getValue("usernameInput_preRegistration"),
      nonce: getValue("nonceNameServiceInput_preRegistration"),
      lockNumber: getValue("lockNumberInput_preRegistration"),
      nonce_EVVM: getValue("nonceEVVMInput_preRegistration"),
      priorityFee_EVVM: getValue("priorityFeeInput_preRegistration"),
      priorityFlag_EVVM: priority === "high",
    };

    // Validate that required fields are not empty
    if (!formData.username) {
      throw new Error("Username is required");
    }
    if (!formData.nonce) {
      throw new Error("NameService nonce is required");
    }
    if (!formData.lockNumber) {
      throw new Error("Clow number is required");
    }
    if (!formData.nonce_EVVM) {
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

      // Hash the username with clow number
      const hashUsername = hashPreRegisteredUsername(
        formData.username,
        BigInt(formData.lockNumber)
      );

      // Create EVVM pay action first (0 amount for pre-registration)
      const evvmAction = await evvm.pay({
        toAddress: formData.addressNameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: 0n,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonce_EVVM),
        isAsyncExec: formData.priorityFlag_EVVM,
        senderExecutor: formData.addressNameService as `0x${string}`,
      });

      // Create pre-registration action
      const nsAction = await nameService.preRegistrationUsername({
        hashPreRegisteredUsername: hashUsername,
        nonce: BigInt(formData.nonce),
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.addressNameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: BigInt(0),
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          isAsyncExec: priority === "high",
          senderExecutor: formData.addressNameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        PreRegistrationUsernameInputData: nsAction.data,
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

    executePreRegistrationUsername(
      dataToGet.PreRegistrationUsernameInputData,
      nameServiceAddress as `0x${string}`
    )
      .then(() => {
        console.log("Pre-registration username executed successfully");
      })
      .catch((error) => {
        console.error("Error executing pre-registration username:", error);
      });
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <TitleAndLink
        title="Pre-registration of username"
        link="https://www.evvm.info/docs/SignatureStructures/NameService/preRegistrationUsernameStructure"
      />
      <br />
      <p>
        If this name was registered before is possible that you need to flush
        the custom metadata
      </p>
      <br />
      {/* Address Input */}

      {/* Nonce section with automatic generator */}

      <NumberInputWithGenerator
        label="Lock Number"
        inputId="lockNumberInput_preRegistration"
        placeholder="Enter clow number"
      />

      {/* Basic input fields */}

      <TextInputField
        label="Username"
        inputId="usernameInput_preRegistration"
        placeholder="Enter username"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_preRegistration"
        placeholder="Enter priority fee"
      />

      <NumberInputWithGenerator
        label="NameService Nonce"
        inputId="nonceNameServiceInput_preRegistration"
        placeholder="Enter nonce"
      />

      {/* Priority configuration */}
      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_preRegistration"
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
