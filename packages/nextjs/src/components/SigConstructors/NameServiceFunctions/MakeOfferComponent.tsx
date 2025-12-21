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
  DateInputField,
} from "@/components/SigConstructors/InputsAndModules";
import { getAccountWithRetry } from "@/utils/getAccountWithRetry";
import { executeMakeOffer } from "@/utils/transactionExecuters/nameServiceExecuter";
import { dateToUnixTimestamp } from "@/utils/dateToUnixTimestamp";
import {
  PayInputData,
  MakeOfferInputData,
  NameServiceSignatureBuilder,
} from "@evvm/viem-signature-library";

type InfoData = {
  PayInputData: PayInputData;
  MakeOfferInputData: MakeOfferInputData;
};

interface MakeOfferComponentProps {
  evvmID: string;
  nameServiceAddress: string;
}

export const MakeOfferComponent = ({
  evvmID,
  nameServiceAddress,
}: MakeOfferComponentProps) => {
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
      nonceNameService: getValue("nonceNameServiceInput_makeOffer"),
      username: getValue("usernameInput_makeOffer"),
      amount: getValue("amountInput_makeOffer"),
      expireDate: dateToUnixTimestamp(getValue("expireDateInput_makeOffer")),
      priorityFee_EVVM: getValue("priorityFeeInput_makeOffer"),
      nonceEVVM: getValue("nonceEVVMInput_makeOffer"),
      priorityFlag: priority === "high",
    };

    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (NameServiceSignatureBuilder as any)(
        walletClient,
        walletData
      );

      const { paySignature, actionSignature } =
        await signatureBuilder.signMakeOffer(
          BigInt(formData.evvmId),
          formData.addressNameService as `0x${string}`,
          formData.username,
          BigInt(formData.expireDate),
          BigInt(formData.amount),
          BigInt(formData.nonceNameService),
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
          amount: BigInt(formData.amount),
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonceEVVM),
          priority: priority === "high",
          executor: formData.addressNameService as `0x${string}`,
          signature: paySignature,
        },
        MakeOfferInputData: {
          user: walletData.address as `0x${string}`,

          username: formData.username,
          expireDate: BigInt(formData.expireDate),
          amount: BigInt(formData.amount),
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

  const execute = async () => {
    if (!dataToGet) {
      console.error("No data to execute payment");
      return;
    }

    executeMakeOffer(dataToGet.MakeOfferInputData, nameServiceAddress as `0x${string}`)
      .then(() => {
        console.log("Make offer executed successfully");
      })
      .catch((error) => {
        console.error("Error executing make offer:", error);
      });
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <TitleAndLink
        title="Make offer of username"
        link="https://www.evvm.info/docs/SignatureStructures/NameService/makeOfferStructure"
      />

      <br />

      <NumberInputWithGenerator
        label="NameService Nonce"
        inputId="nonceNameServiceInput_makeOffer"
        placeholder="Enter nonce"
      />

      <TextInputField
        label="Username"
        inputId="usernameInput_makeOffer"
        placeholder="Enter username"
      />

      <NumberInputField
        label="Amount to offer (in MATE)"
        inputId="amountInput_makeOffer"
        placeholder="Enter amount to offer"
      />

      <DateInputField
        label="Expiration Date"
        inputId="expireDateInput_makeOffer"
        defaultValue="2025-12-31"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_makeOffer"
        placeholder="Enter priority fee"
      />

      {/* Priority configuration */}
      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_makeOffer"
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
