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
import { executeAcceptOffer } from "@/utils/transactionExecuters/nameServiceExecuter";
import {
  createSignerWithViem,
  EVVM,
  NameService,
  type IPayData as PayInputData,
  type IAcceptOfferData as AcceptOfferInputData,
} from "@evvm/evvm-js";

type InfoData = {
  PayInputData: PayInputData;
  AcceptOfferInputData: AcceptOfferInputData;
};

interface AcceptOfferComponentProps {
  evvmID: string;
  nameServiceAddress: string;
}

export const AcceptOfferComponent = ({
  evvmID,
  nameServiceAddress,
}: AcceptOfferComponentProps) => {
  const [priority, setPriority] = React.useState("low");
  const [dataToGet, setDataToGet] = React.useState<InfoData | null>(null);

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const getValue = (id: string) =>
      (document.getElementById(id) as HTMLInputElement).value;

    const formData = {
      evvmId: evvmID,
      addressNameService: nameServiceAddress,
      username: getValue("usernameInput_acceptOffer"),
      offerId: getValue("offerIdInput_acceptOffer"),
      nonce: getValue("nonceInput_acceptOffer"),
      priorityFee_EVVM: getValue("priorityFeeEVVMInput_acceptOffer"),
      priorityFlag_EVVM: priority === "high",
      nonce_EVVM: getValue("nonceEVVMInput_acceptOffer"),
    };

    try {
      const walletClient = await getWalletClient(config);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS as `0x${string}`;
      const evvm = new EVVM(signer, evvmAddress);
      const nameService = new NameService(signer, formData.addressNameService as `0x${string}`);

      // Create EVVM pay action first (0 amount)
      const evvmAction = await evvm.pay({
        to: formData.addressNameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: 0n,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: formData.priorityFlag_EVVM,
        executor: formData.addressNameService as `0x${string}`,
      });

      // Create accept offer action
      const nsAction = await nameService.acceptOffer({
        username: formData.username,
        offerID: BigInt(formData.offerId),
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
          priorityFlag: priority === "high",
          executor: formData.addressNameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        AcceptOfferInputData: nsAction.data,
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

    executeAcceptOffer(dataToGet.AcceptOfferInputData, nameServiceAddress as `0x${string}`)
      .then(() => {
        console.log("Withdraw offer executed successfully");
      })
      .catch((error) => {
        console.error("Error executing withdraw offer:", error);
      });
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <TitleAndLink
        title="Accept offer of username"
        link="https://www.evvm.info/docs/SignatureStructures/NameService/acceptOfferStructure"
      />

      <br />

      <NumberInputWithGenerator
        label="NameService Nonce"
        inputId="nonceInput_acceptOffer"
        placeholder="Enter nonce"
      />

      <TextInputField
        label="Username"
        inputId="usernameInput_acceptOffer"
        placeholder="Enter username"
      />

      <NumberInputField
        label="Offer ID"
        inputId="offerIdInput_acceptOffer"
        placeholder="Enter offer ID"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeEVVMInput_acceptOffer"
        placeholder="Enter priority fee"
      />

      {/* Priority configuration */}
      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_acceptOffer"
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
