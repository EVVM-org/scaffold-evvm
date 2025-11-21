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
import { executeWithdrawOffer } from "@/utils/transactionExecuters/nameServiceExecuter";
import {
  PayInputData,
  WithdrawOfferInputData,
  NameServiceSignatureBuilder,
} from "@evvm/viem-signature-library";

type InfoData = {
  PayInputData: PayInputData;
  WithdrawOfferInputData: WithdrawOfferInputData;
};

interface WithdrawOfferComponentProps {
  evvmID: string;
  nameServiceAddress: string;
}

export const WithdrawOfferComponent = ({
  evvmID,
  nameServiceAddress,
}: WithdrawOfferComponentProps) => {
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
      nonceNameService: getValue("nonceNameServiceInput_withdrawOffer"),
      username: getValue("usernameInput_withdrawOffer"),
      offerId: getValue("offerIdInput_withdrawOffer"),
      priorityFee_EVVM: getValue("priorityFeeInput_withdrawOffer"),
      nonce_EVVM: getValue("nonceEVVMInput_withdrawOffer"),
      priorityFlag_EVVM: priority === "high",
    };

    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (NameServiceSignatureBuilder as any)(
        walletClient,
        walletData
      );

      const { paySignature, actionSignature } =
        await signatureBuilder.signWithdrawOffer(
          BigInt(formData.evvmId),
          formData.addressNameService as `0x${string}`,
          formData.username,
          BigInt(formData.offerId),
          BigInt(formData.nonceNameService),
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
          amount: BigInt(0),
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          priority: priority === "high",
          executor: formData.addressNameService as `0x${string}`,
          signature: paySignature,
        },
        WithdrawOfferInputData: {
          user: walletData.address as `0x${string}`,
          nonce: BigInt(formData.nonceNameService),
          username: formData.username,
          offerID: BigInt(formData.offerId),
          priorityFee_EVVM: BigInt(formData.priorityFee_EVVM),
          signature: actionSignature,
          nonce_EVVM: BigInt(formData.nonce_EVVM),
          priorityFlag_EVVM: formData.priorityFlag_EVVM,
          signature_EVVM: paySignature,
        },
      });
    } catch (error) {
      console.error("Error signing withdraw offer:", error);
    }
  };

  const execute = async () => {
    if (!dataToGet) {
      console.error("No data to execute payment");
      return;
    }

    executeWithdrawOffer(dataToGet.WithdrawOfferInputData, nameServiceAddress as `0x${string}`)
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
        title="Withdraw offer of username"
        link="https://www.evvm.info/docs/SignatureStructures/NameService/withdrawOfferStructure"
      />

      <br />

      <NumberInputWithGenerator
        label="NameService Nonce"
        inputId="nonceNameServiceInput_withdrawOffer"
        placeholder="Enter nonce"
      />

      <TextInputField
        label="Username"
        inputId="usernameInput_withdrawOffer"
        placeholder="Enter username"
      />

      <NumberInputField
        label="Offer ID"
        inputId="offerIdInput_withdrawOffer"
        placeholder="Enter offer ID"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_withdrawOffer"
        placeholder="Enter priority fee"
      />

      {/* Priority configuration */}
      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_withdrawOffer"
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
