"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { usePublicClient } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { config } from "@/config";
import { useEvvmDeployment } from "@/hooks/useEvvmDeployment";
import { WalletConnect } from "@/components/WalletConnect";
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
import { getAccountWithRetry } from "@/utils/getAccountWithRetry";
import {
  executePay,
  executeDispersePay,
} from "@/lib/evvmExecutors";
import {
  EVVMSignatureBuilder,
  PayInputData,
  DispersePayInputData,
  DispersePayMetadata,
} from "@evvm/viem-signature-library";
import styles from "@/styles/pages/Payments.module.css";

// Helper to transform library types to our types
const transformPayData = (data: any): import("@/types/evvm").PayInputData => ({
  ...data,
  signature: data.signature as `0x${string}`,
});

const transformDisperseData = (data: any): import("@/types/evvm").DispersePayInputData => ({
  from: data.from,
  token: data.token,
  recipients: data.toData.map((t: any) => ({
    address: t.to_address,
    amount: t.amount,
  })),
  priorityFee: data.priorityFee,
  nonce: data.nonce,
  priority: data.priority,
  executor: data.executor,
  signature: data.signature as `0x${string}`,
});

export default function PaymentsPage() {
  const { deployment, loading: deploymentLoading, error: deploymentError } = useEvvmDeployment();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [activeTab, setActiveTab] = useState<"single" | "disperse">("single");

  // Single payment state
  const [isUsingUsername, setIsUsingUsername] = useState(false);
  const [isUsingExecutor, setIsUsingExecutor] = useState(false);
  const [priority, setPriority] = useState("low");
  const [payDataToGet, setPayDataToGet] = useState<PayInputData | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  // Disperse payment state
  const [isUsingExecutorDisperse, setIsUsingExecutorDisperse] = useState(false);
  const [priorityDisperse, setPriorityDisperse] = useState("low");
  const [isUsingUsernameOnDisperse, setIsUsingUsernameOnDisperse] = useState<boolean[]>([
    false, false, false, false, false,
  ]);
  const [numberOfUsersToDisperse, setNumberOfUsersToDisperse] = useState(1);
  const [disperseDataToGet, setDisperseDataToGet] = useState<DispersePayInputData | null>(null);
  const [disperseLoading, setDisperseLoading] = useState(false);

  // Transaction status
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  if (deploymentLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>EVVM Payments</h2>
          <WalletConnect />
        </div>
        <p>Loading deployment information...</p>
      </div>
    );
  }

  if (deploymentError || !deployment) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>EVVM Payments</h2>
          <WalletConnect />
        </div>
        <div className={styles.error}>
          {deploymentError || "No EVVM deployment found."}
        </div>
      </div>
    );
  }

  // ============================================
  // SINGLE PAYMENT FUNCTIONS
  // ============================================

  const makeSinglePaySignature = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) {
      setTxError("Unable to get wallet data. Please connect your wallet.");
      return;
    }

    setPayLoading(true);
    setTxError(null);

    try {
      const getValue = (id: string) =>
        (document.getElementById(id) as HTMLInputElement)?.value || "";

      const formData = {
        evvmID: deployment.evvmID.toString(),
        nonce: getValue("nonceInput_Pay"),
        tokenAddress: getValue("tokenAddress_Pay"),
        to: getValue(isUsingUsername ? "toUsername" : "toAddress"),
        executor: isUsingExecutor
          ? getValue("executorInput_Pay")
          : "0x0000000000000000000000000000000000000000",
        amount: getValue("amountTokenInput_Pay"),
        priorityFee: getValue("priorityFeeInput_Pay"),
      };

      // Validation
      if (!formData.to) {
        throw new Error("Recipient address or username is required");
      }
      if (!formData.tokenAddress) {
        throw new Error("Token address is required");
      }
      if (!formData.amount || formData.amount === "0") {
        throw new Error("Amount must be greater than 0");
      }
      if (!formData.nonce) {
        throw new Error("Nonce is required");
      }

      const walletClient = await getWalletClient(config);

      if (!walletClient) {
        throw new Error("Wallet client not available. Please connect your wallet and ensure you're on the correct network.");
      }

      console.log("Creating EVVM signature builder with:", {
        walletClient,
        walletData,
        evvmID: formData.evvmID
      });

      const signatureBuilder = new (EVVMSignatureBuilder as any)(
        walletClient,
        walletData
      );

      const signature = await signatureBuilder.signPay(
        BigInt(formData.evvmID),
        formData.to,
        formData.tokenAddress as `0x${string}`,
        BigInt(formData.amount),
        BigInt(formData.priorityFee),
        BigInt(formData.nonce),
        priority === "high",
        formData.executor as `0x${string}`
      );

      console.log("Payment signature created:", {
        signature,
        signatureType: typeof signature,
        signatureLength: signature?.length
      });

      if (!signature) {
        throw new Error("Signature creation failed: Signature is undefined");
      }

      if (typeof signature !== 'string' || !signature.startsWith('0x')) {
        throw new Error(`Invalid signature format: ${signature}`);
      }

      const payData: any = {
        from: walletData.address as `0x${string}`,
        to_address: (formData.to.startsWith("0x")
          ? formData.to
          : "0x0000000000000000000000000000000000000000") as `0x${string}`,
        to_identity: formData.to.startsWith("0x") ? "" : formData.to,
        token: formData.tokenAddress as `0x${string}`,
        amount: BigInt(formData.amount),
        priorityFee: BigInt(formData.priorityFee),
        nonce: BigInt(formData.nonce),
        priority: priority === "high",
        executor: formData.executor,
        signature: signature as `0x${string}`,
      };

      setPayDataToGet(payData);
      console.log("Payment signature created successfully", payData);
    } catch (error: any) {
      console.error("Error creating signature:", error);
      setTxError(error.message || "Failed to create signature");
    } finally {
      setPayLoading(false);
    }
  };

  const executePayment = async () => {
    if (!payDataToGet) {
      setTxError("No payment data available. Please create a signature first.");
      return;
    }

    if (!deployment?.evvm) {
      setTxError("EVVM address is not available");
      return;
    }

    const walletClient = await getWalletClient(config);

    if (!walletClient || !publicClient) {
      setTxError("Wallet client is not available. Please connect your wallet.");
      return;
    }

    setPayLoading(true);
    setTxError(null);
    setTxHash(null);

    try {
      const hash = await executePay(
        walletClient,
        publicClient,
        deployment.evvm as `0x${string}`,
        transformPayData(payDataToGet)
      );
      console.log("Payment executed successfully", hash);
      setTxHash(hash);
      setPayDataToGet(null);
      // Reset form
      const inputs = ["nonceInput_Pay", "tokenAddress_Pay", "toAddress", "toUsername", "amountTokenInput_Pay", "priorityFeeInput_Pay", "executorInput_Pay"];
      inputs.forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input) input.value = "";
      });
    } catch (error: any) {
      console.error("Error executing payment:", error);
      setTxError(error.message || "Failed to execute payment");
    } finally {
      setPayLoading(false);
    }
  };

  // ============================================
  // DISPERSE PAYMENT FUNCTIONS
  // ============================================

  const makeDispersePaySignature = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) {
      setTxError("Unable to get wallet data. Please connect your wallet.");
      return;
    }

    setDisperseLoading(true);
    setTxError(null);

    try {
      const getValue = (id: string) =>
        (document.getElementById(id) as HTMLInputElement)?.value || "";

      const formData = {
        evvmID: deployment.evvmID.toString(),
        tokenAddress: getValue("tokenAddressDispersePay"),
        amount: getValue("amountTokenInputSplit"),
        priorityFee: getValue("priorityFeeInputSplit"),
        nonce: getValue("nonceInputDispersePay"),
        executor: isUsingExecutorDisperse
          ? getValue("executorInputSplit")
          : "0x0000000000000000000000000000000000000000",
      };

      // Build recipient metadata
      const toData: DispersePayMetadata[] = [];
      for (let i = 0; i < numberOfUsersToDisperse; i++) {
        const isUsingUsername = isUsingUsernameOnDisperse[i];
        const toInputId = isUsingUsername
          ? `toUsernameSplitUserNumber${i}`
          : `toAddressSplitUserNumber${i}`;
        const to = getValue(toInputId);
        const amount = getValue(`amountTokenToGiveUser${i}`);

        if (!to) {
          throw new Error(`Recipient ${i + 1}: Address or username is required`);
        }
        if (!amount || amount === "0") {
          throw new Error(`Recipient ${i + 1}: Amount must be greater than 0`);
        }

        toData.push({
          amount: BigInt(amount),
          to_address: isUsingUsername
            ? "0x0000000000000000000000000000000000000000"
            : (to as `0x${string}`),
          to_identity: isUsingUsername ? to : "",
        });
      }

      // Validation
      if (!formData.tokenAddress) {
        throw new Error("Token address is required");
      }
      if (!formData.amount || formData.amount === "0") {
        throw new Error("Total amount must be greater than 0");
      }
      if (!formData.nonce) {
        throw new Error("Nonce is required");
      }
      if (toData.length === 0) {
        throw new Error("At least one recipient is required");
      }

      const walletClient = await getWalletClient(config);

      if (!walletClient) {
        throw new Error("Wallet client not available. Please connect your wallet and ensure you're on the correct network.");
      }

      console.log("Creating EVVM disperse signature builder with:", {
        walletClient,
        walletData,
        evvmID: formData.evvmID,
        recipientCount: toData.length
      });

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

      console.log("Disperse payment signature created:", {
        dispersePaySignature,
        signatureType: typeof dispersePaySignature,
        signatureLength: dispersePaySignature?.length
      });

      if (!dispersePaySignature) {
        throw new Error("Signature creation failed: Signature is undefined");
      }

      if (typeof dispersePaySignature !== 'string' || !dispersePaySignature.startsWith('0x')) {
        throw new Error(`Invalid signature format: ${dispersePaySignature}`);
      }

      const disperseData: any = {
        from: walletData.address as `0x${string}`,
        toData,
        token: formData.tokenAddress as `0x${string}`,
        amount: BigInt(formData.amount),
        priorityFee: BigInt(formData.priorityFee),
        priority: priorityDisperse === "high",
        nonce: BigInt(formData.nonce),
        executor: formData.executor,
        signature: dispersePaySignature as `0x${string}`,
      };

      setDisperseDataToGet(disperseData);
      console.log("Disperse payment signature created successfully", disperseData);
    } catch (error: any) {
      console.error("Error creating disperse signature:", error);
      setTxError(error.message || "Failed to create disperse signature");
    } finally {
      setDisperseLoading(false);
    }
  };

  const executeDispersePayment = async () => {
    if (!disperseDataToGet) {
      setTxError("No disperse payment data available. Please create a signature first.");
      return;
    }

    if (!deployment?.evvm) {
      setTxError("EVVM address is not available");
      return;
    }

    const walletClient = await getWalletClient(config);

    if (!walletClient || !publicClient) {
      setTxError("Wallet client is not available. Please connect your wallet.");
      return;
    }

    setDisperseLoading(true);
    setTxError(null);
    setTxHash(null);

    try {
      const hash = await executeDispersePay(
        walletClient,
        publicClient,
        deployment.evvm as `0x${string}`,
        transformDisperseData(disperseDataToGet)
      );
      console.log("Disperse payment executed successfully", hash);
      setTxHash(hash);
      setDisperseDataToGet(null);
      // Reset form
      const inputs = ["tokenAddressDispersePay", "amountTokenInputSplit", "priorityFeeInputSplit", "nonceInputDispersePay", "executorInputSplit"];
      inputs.forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input) input.value = "";
      });
      // Reset recipient inputs
      for (let i = 0; i < numberOfUsersToDisperse; i++) {
        const toInputId = isUsingUsernameOnDisperse[i]
          ? `toUsernameSplitUserNumber${i}`
          : `toAddressSplitUserNumber${i}`;
        const amountInputId = `amountTokenToGiveUser${i}`;
        [toInputId, amountInputId].forEach(id => {
          const input = document.getElementById(id) as HTMLInputElement;
          if (input) input.value = "";
        });
      }
    } catch (error: any) {
      console.error("Error executing disperse payment:", error);
      setTxError(error.message || "Failed to execute disperse payment");
    } finally {
      setDisperseLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>EVVM Payments</h2>
        <WalletConnect />
      </div>

      {/* Error Display */}
      {txError && (
        <div className={styles.error}>
          <strong>Error:</strong> {txError}
          <button
            onClick={() => setTxError(null)}
            style={{ marginLeft: "1rem", padding: "0.25rem 0.5rem" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Transaction Hash Display */}
      {txHash && (
        <div style={{ padding: "1rem", background: "#d1fae5", borderRadius: "8px", marginBottom: "1rem" }}>
          <strong>Transaction submitted!</strong>
          <br />
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#059669", textDecoration: "underline" }}
          >
            View on Etherscan
          </a>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={activeTab === "single" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("single")}
        >
          Single Payment
        </button>
        <button
          className={activeTab === "disperse" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("disperse")}
        >
          Disperse Payment
        </button>
      </div>

      {/* Single Payment Tab */}
      {activeTab === "single" && (
        <div className="flex flex-1 flex-col justify-center items-center">
          <TitleAndLink
            title="Single payment"
            link="https://www.evvm.info/docs/SignatureStructures/EVVM/SinglePaymentSignatureStructure"
          />
          <br />

          {/* Recipient configuration */}
          <div style={{ marginBottom: "1rem" }}>
            <p>
              To:{" "}
              <select
                style={{
                  color: "black",
                  backgroundColor: "white",
                  height: "2rem",
                  width: "6rem",
                }}
                onChange={(e) => setIsUsingUsername(e.target.value === "true")}
              >
                <option value="false">Address</option>
                <option value="true">Username</option>
              </select>
              <input
                type="text"
                placeholder={isUsingUsername ? "Enter username" : "Enter address"}
                id={isUsingUsername ? "toUsername" : "toAddress"}
                style={{
                  color: "black",
                  backgroundColor: "white",
                  height: "2rem",
                  width: "25rem",
                  marginLeft: "0.5rem",
                }}
              />
            </p>
          </div>

          <AddressInputField
            label="Token address"
            inputId="tokenAddress_Pay"
            placeholder="Enter token address"
            defaultValue="0x0000000000000000000000000000000000000001"
          />

          {/* Amount and Priority Fee */}
          <NumberInputField
            label="Amount"
            inputId="amountTokenInput_Pay"
            placeholder="Enter amount"
          />
          <NumberInputField
            label="Priority fee"
            inputId="priorityFeeInput_Pay"
            placeholder="Enter priority fee"
            defaultValue="0"
          />

          {/* Executor configuration */}
          <ExecutorSelector
            inputId="executorInput_Pay"
            placeholder="Enter executor address"
            onExecutorToggle={setIsUsingExecutor}
            isUsingExecutor={isUsingExecutor}
          />

          {/* Priority configuration */}
          <PrioritySelector onPriorityChange={setPriority} />

          {/* Nonce section */}
          <NumberInputWithGenerator
            label="Nonce"
            inputId="nonceInput_Pay"
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
            onClick={makeSinglePaySignature}
            disabled={payLoading || !isConnected}
            style={{
              padding: "0.5rem",
              marginTop: "1rem",
              opacity: payLoading || !isConnected ? 0.5 : 1,
            }}
          >
            {payLoading ? "Creating signature..." : "Create signature"}
          </button>

          {/* Results section */}
          <DataDisplayWithClear
            dataToGet={payDataToGet}
            onClear={() => setPayDataToGet(null)}
            onExecute={executePayment}
          />
        </div>
      )}

      {/* Disperse Payment Tab */}
      {activeTab === "disperse" && (
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
            defaultValue="0x0000000000000000000000000000000000000001"
          />

          {/* Total Amount */}
          <NumberInputField
            label="Total Amount (sum of all payments)"
            inputId="amountTokenInputSplit"
            placeholder="Enter total amount"
          />

          {/* Priority fee */}
          <NumberInputField
            label="Priority fee"
            inputId="priorityFeeInputSplit"
            placeholder="Enter priority fee"
            defaultValue="0"
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

          <p style={{ fontSize: "0.875rem", color: "#666" }}>
            For testing purposes, the number of users is limited to 5.
          </p>

          {/* User inputs */}
          {Array.from({ length: numberOfUsersToDisperse }).map((_, index) => (
            <div key={index} style={{ marginTop: "1rem", marginBottom: "1rem" }}>
              <h4 style={{ color: "black", marginBottom: "0.5rem" }}>{`Payment ${
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
              <p style={{ marginTop: "0.5rem" }}>Amount</p>
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
            onClick={makeDispersePaySignature}
            disabled={disperseLoading || !isConnected}
            style={{
              padding: "0.5rem",
              marginTop: "1rem",
              opacity: disperseLoading || !isConnected ? 0.5 : 1,
            }}
          >
            {disperseLoading ? "Creating signature..." : "Create signature"}
          </button>

          {/* Display results */}
          <DataDisplayWithClear
            dataToGet={disperseDataToGet}
            onClear={() => setDisperseDataToGet(null)}
            onExecute={executeDispersePayment}
          />
        </div>
      )}
    </div>
  );
}
