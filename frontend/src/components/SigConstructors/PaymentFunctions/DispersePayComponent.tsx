"use client";
import React from "react";
import { config } from "@/config/index";
import { getAccount, getWalletClient } from "@wagmi/core";
import {
  TitleAndLink,
  NumberInputWithGenerator,
  AddressInputField,
  PrioritySelector,
  ExecutorSelector,
  DataDisplayWithClear,
  HelperInfo,
  NumberInputField,
} from "@/components/SigConstructors/InputsAndModules";

import {
  EVVMSignatureBuilder,
  DispersePayInputData,
  DispersePayMetadata,
} from "@evvm/viem-signature-library";

import { executeDispersePay } from "@/utils/transactionExecuters/evvmExecuter";

import { getAccountWithRetry } from "@/utils/getAccountWithRetry";

interface DispersePayComponentProps {
  evvmID: string;
  evvmAddress: string;
}

export const DispersePayComponent = ({
  evvmID,
  evvmAddress,
}: DispersePayComponentProps) => {
  let account = getAccount(config);
  const [isUsingExecutorDisperse, setIsUsingExecutorDisperse] =
    React.useState(false);
  const [priorityDisperse, setPriorityDisperse] = React.useState("low");
  const [isUsingUsernameOnDisperse, setIsUsingUsernameOnDisperse] =
    React.useState<Array<boolean>>([false, false, false, false, false]);
  const [numberOfUsersToDisperse, setNumberOfUsersToDisperse] =
    React.useState(1);

  const [dataToGet, setDataToGet] = React.useState<DispersePayInputData | null>(
    null
  );

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const getValue = (id: string) =>
      (document.getElementById(id) as HTMLInputElement).value;

    const formData = {
      evvmID: evvmID,
      tokenAddress: getValue("tokenAddressDispersePay"),
      amount: getValue("amountTokenInputSplit"),
      priorityFee: getValue("priorityFeeInputSplit"),
      nonce: getValue("nonceInputDispersePay"),
      executor: isUsingExecutorDisperse
        ? getValue("executorInputSplit")
        : "0x0000000000000000000000000000000000000000",
    };

    const toData: DispersePayMetadata[] = [];
    for (let i = 0; i < numberOfUsersToDisperse; i++) {
      const isUsingUsername = isUsingUsernameOnDisperse[i];
      const toInputId = isUsingUsername
        ? `toUsernameSplitUserNumber${i}`
        : `toAddressSplitUserNumber${i}`;
      const to = getValue(toInputId);
      const amount = getValue(`amountTokenToGiveUser${i}`);

      toData.push({
        amount: BigInt(amount),
        to_address: isUsingUsername
          ? "0x0000000000000000000000000000000000000000"
          : (to as `0x${string}`),
        to_identity: isUsingUsername ? to : "",
      });
    }

    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (EVVMSignatureBuilder as any)(
        walletClient,
        walletData
      );

      const dispersePaySignature = await signatureBuilder.signDispersePay(
        BigInt(formData.evvmID),
        toData,
        formData.tokenAddress as `0x${string}`,
        BigInt(formData.amount),
        BigInt(formData.priorityFee),
        BigInt(formData.nonce),
        priorityDisperse === "high",
        formData.executor as `0x${string}`
      );

      setDataToGet({
        from: walletData.address as `0x${string}`,
        toData,
        token: formData.tokenAddress as `0x${string}`,
        amount: BigInt(formData.amount),
        priorityFee: BigInt(formData.priorityFee),
        priority: priorityDisperse === "high",
        nonce: BigInt(formData.nonce),
        executor: formData.executor,
        signature: dispersePaySignature,
      });
    } catch (error) {
      console.error("Error creating signature:", error);
    }
  };

  const executeDispersePayment = async () => {
    if (!dataToGet) {
      console.error("No data to execute payment");
      return;
    }

    if (!evvmAddress) {
      console.error("EVVM address is not provided");
      return;
    }

    executeDispersePay(dataToGet, evvmAddress as `0x${string}`)
      .then(() => {
        console.log("Disperse payment executed successfully");
      })
      .catch((error) => {
        console.error("Error executing disperse payment:", error);
      });
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <TitleAndLink
        title="Disperse payment"
        link="https://www.evvm.info/docs/SignatureStructures/EVVM/DispersePaymentSignatureStructure"
      />
      <br />

      {/* Token address */}
      <AddressInputField
        label="Token address"
        inputId="tokenAddressDispersePay"
        placeholder="Enter token address"
      />

      {/* Amount */}

      <NumberInputField
        label="Total Amount (sum of all payments)"
        inputId="amountTokenInputSplit"
        placeholder="Enter amount"
      />

      {/* Priority fee */}

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInputSplit"
        placeholder="Enter priority fee"
      />

      {/* Executor selection */}
      <ExecutorSelector
        inputId="executorInputSplit"
        placeholder="Enter executor"
        onExecutorToggle={setIsUsingExecutorDisperse}
        isUsingExecutor={isUsingExecutorDisperse}
      />

      {/* Number of users */}
      <div style={{ marginBottom: "1rem" }}>
        <p>Number of accounts to split the payment</p>
        <select
          style={{
            color: "black",
            backgroundColor: "white",
            height: "2rem",
            width: "5rem",
          }}
          onChange={(e) => setNumberOfUsersToDisperse(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5].map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
      </div>

      <p>
        For testing purposes, the number of users is 5 but you can change it
        from the repo.
      </p>

      {/* User inputs */}
      {Array.from({ length: numberOfUsersToDisperse }).map((_, index) => (
        <div key={index}>
          <h4 style={{ color: "black", marginTop: "1rem" }}>{`Payment ${
            index + 1
          }`}</h4>
          <p>To:</p>
          <select
            style={{
              color: "black",
              backgroundColor: "white",
              height: "2rem",
              width: "5.5rem",
            }}
            onChange={(e) => {
              setIsUsingUsernameOnDisperse((prev) => {
                const newPrev = [...prev];
                newPrev[index] = e.target.value === "true";
                return newPrev;
              });
            }}
          >
            <option value="false">Address</option>
            <option value="true">Username</option>
          </select>
          <input
            type="text"
            placeholder={
              isUsingUsernameOnDisperse[index]
                ? "Enter username"
                : "Enter address"
            }
            id={
              isUsingUsernameOnDisperse[index]
                ? `toUsernameSplitUserNumber${index}`
                : `toAddressSplitUserNumber${index}`
            }
            style={{
              color: "black",
              backgroundColor: "white",
              height: "2rem",
              width: "25rem",
            }}
          />
          <p>Amount</p>
          <input
            type="number"
            placeholder="Enter amount"
            id={`amountTokenToGiveUser${index}`}
            style={{
              color: "black",
              backgroundColor: "white",
              height: "2rem",
              width: "25rem",
            }}
          />
        </div>
      ))}

      {/* Priority selection */}
      <PrioritySelector onPriorityChange={setPriorityDisperse} />

      {/* Nonce input */}

      <NumberInputWithGenerator
        label="Nonce"
        inputId="nonceInputDispersePay"
        placeholder="Enter nonce"
        showRandomBtn={priorityDisperse !== "low"}
      />

      <div>
        {priorityDisperse === "low" && (
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
        style={{ padding: "0.5rem", marginTop: "1rem" }}
      >
        Create signature
      </button>

      {/* Display results */}
      <DataDisplayWithClear
        dataToGet={dataToGet}
        onClear={() => setDataToGet(null)}
        onExecute={executeDispersePayment}
      />
    </div>
  );
};
