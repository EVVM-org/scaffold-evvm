"use client";

import React, { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { config } from "@/config";
import { useEvvmDeployment } from "@/hooks/useEvvmDeployment";
import { WalletConnect } from "@/components/WalletConnect";
import {
  TitleAndLink,
  NumberInputWithGenerator,
  AddressInputField,
  PrioritySelector,
  DataDisplayWithClear,
  HelperInfo,
  NumberInputField,
  DateInputField,
} from "@/components/SigConstructors/InputsAndModules";
import { getAccountWithRetry } from "@/utils/getAccountWithRetry";
import {
  executeMakeOrder,
  executeCancelOrder,
  executeDispatchOrderFillProportionalFee,
  executeDispatchOrderFillFixedFee,
} from "@/utils/transactionExecuters";
import {
  createSignerWithViem,
  EVVM,
  P2PSwap,
  type IMakeOrderData as MakeOrderInputData,
  type ICancelOrderData as CancelOrderInputData,
  type IDispatchOrderFixedFeeData as DispatchOrderFillFixedFeeInputData,
  type IDispatchOrderData as DispatchOrderFillPropotionalFeeInputData,
} from "@evvm/evvm-js";
import { MATE_TOKEN_ADDRESS } from "@/utils/constants";
import styles from "@/styles/pages/P2PSwap.module.css";

type TabType = "makeOrder" | "dispatchFixed" | "dispatchProportional" | "cancelOrder";

export default function P2PSwapPage() {
  const { deployment, loading: deploymentLoading, error: deploymentError } = useEvvmDeployment();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>("makeOrder");

  // Make Order State
  const [priorityMake, setPriorityMake] = useState("low");
  const [makeOrderData, setMakeOrderData] = useState<MakeOrderInputData | null>(null);
  const [makeLoading, setMakeLoading] = useState(false);

  // Dispatch Fixed Fee State
  const [priorityDispatchFixed, setPriorityDispatchFixed] = useState("low");
  const [amountBFixed, setAmountBFixed] = useState(0n);
  const [amountOutFixed, setAmountOutFixed] = useState(1000000000000000000n);
  const [dispatchFixedData, setDispatchFixedData] = useState<DispatchOrderFillFixedFeeInputData | null>(null);
  const [dispatchFixedLoading, setDispatchFixedLoading] = useState(false);

  // Dispatch Proportional Fee State
  const [priorityDispatchProp, setPriorityDispatchProp] = useState("low");
  const [amountBProp, setAmountBProp] = useState(0n);
  const [dispatchPropData, setDispatchPropData] = useState<DispatchOrderFillPropotionalFeeInputData | null>(null);
  const [dispatchPropLoading, setDispatchPropLoading] = useState(false);

  // Cancel Order State
  const [priorityCancel, setPriorityCancel] = useState("low");
  const [cancelOrderData, setCancelOrderData] = useState<CancelOrderInputData | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Transaction status
  const [txError, setTxError] = useState<string | null>(null);

  // Fee calculations
  const feeFixed: bigint = useMemo(() => {
    const propFee = (amountBFixed * 500n) / 10_000n;
    if (propFee > amountOutFixed) {
      return amountOutFixed;
    } else {
      return propFee;
    }
  }, [amountBFixed, amountOutFixed]);

  const feeProp: bigint = useMemo(
    () => (amountBProp * 500n) / 10_000n,
    [amountBProp]
  );

  if (deploymentLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>P2P Swap</h2>
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
          <h2>P2P Swap</h2>
          <WalletConnect />
        </div>
        <div className={styles.error}>
          {deploymentError || "No EVVM deployment found."}
        </div>
      </div>
    );
  }

  if (!deployment.p2pSwap || deployment.p2pSwap === "0x0000000000000000000000000000000000000000") {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>P2P Swap</h2>
          <WalletConnect />
        </div>
        <div className={styles.error}>
          <strong style={{ color: "red" }}>
            P2P Swap contract address is not available in the deployment configuration.
          </strong>
        </div>
      </div>
    );
  }

  // ============================================
  // MAKE ORDER FUNCTIONS
  // ============================================

  const makeMakeOrderSignature = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) {
      setTxError("Unable to get wallet data. Please connect your wallet.");
      return;
    }

    setMakeLoading(true);
    setTxError(null);

    try {
      const getValue = (id: string) =>
        (document.getElementById(id) as HTMLInputElement)?.value || "";

      const formData = {
        nonce: getValue("nonceInput_MakeOrder"),
        tokenA: getValue("tokenA_MakeOrder"),
        tokenB: getValue("tokenB_MakeOrder"),
        amountA: getValue("amountA_MakeOrder"),
        amountB: getValue("amountB_MakeOrder"),
        priorityFee: getValue("priorityFee_MakeOrder"),
        nonce_EVVM: getValue("nonce_EVVM_MakeOrder"),
      };

      // Validation
      if (!formData.tokenA || !formData.tokenB) {
        throw new Error("Token addresses are required");
      }
      if (!formData.amountA || formData.amountA === "0") {
        throw new Error("Amount A must be greater than 0");
      }
      if (!formData.amountB || formData.amountB === "0") {
        throw new Error("Amount B must be greater than 0");
      }
      if (!formData.nonce) {
        throw new Error("P2PSwap nonce is required");
      }
      if (!formData.nonce_EVVM) {
        throw new Error("EVVM nonce is required");
      }

      const walletClient = await getWalletClient(config);
      if (!walletClient) {
        throw new Error("Wallet client not available");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const p2pSwap = new P2PSwap(signer, deployment.p2pSwap as `0x${string}`);

      // Create EVVM pay() action first
      const evvmAction = await evvm.pay({
        to: deployment.p2pSwap as `0x${string}`,
        tokenAddress: formData.tokenA as `0x${string}`,
        amount: BigInt(formData.amountA),
        priorityFee: BigInt(formData.priorityFee),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: priorityMake === "high",
        executor: deployment.p2pSwap as `0x${string}`,
      });

      // Create P2PSwap makeOrder() action
      const p2pAction = await p2pSwap.makeOrder({
        nonce: BigInt(formData.nonce),
        tokenA: formData.tokenA as `0x${string}`,
        tokenB: formData.tokenB as `0x${string}`,
        amountA: BigInt(formData.amountA),
        amountB: BigInt(formData.amountB),
        evvmSignedAction: evvmAction,
      });

      const orderData: MakeOrderInputData = p2pAction.data;

      setMakeOrderData(orderData);
      console.log("Make order signature created successfully", orderData);
    } catch (error: any) {
      console.error("Error creating signature:", error);
      setTxError(error.message || "Failed to create signature");
    } finally {
      setMakeLoading(false);
    }
  };

  const executeMakeOrderTx = async () => {
    if (!makeOrderData) {
      setTxError("No order data available. Please create a signature first.");
      return;
    }

    setMakeLoading(true);
    setTxError(null);

    try {
      await executeMakeOrder(makeOrderData, deployment.p2pSwap as `0x${string}`);
      console.log("Order created successfully");
      setMakeOrderData(null);
      // Reset form
      const inputs = ["nonceInput_MakeOrder", "tokenA_MakeOrder", "tokenB_MakeOrder", "amountA_MakeOrder", "amountB_MakeOrder", "priorityFee_MakeOrder", "nonce_EVVM_MakeOrder"];
      inputs.forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input) input.value = "";
      });
    } catch (error: any) {
      console.error("Error executing transaction:", error);
      setTxError(error.message || "Failed to execute transaction");
    } finally {
      setMakeLoading(false);
    }
  };

  // ============================================
  // DISPATCH FIXED FEE FUNCTIONS
  // ============================================

  const makeDispatchFixedSignature = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) {
      setTxError("Unable to get wallet data. Please connect your wallet.");
      return;
    }

    setDispatchFixedLoading(true);
    setTxError(null);

    try {
      const getValue = (id: string) =>
        (document.getElementById(id) as HTMLInputElement)?.value || "";

      const formData = {
        nonce: getValue("nonceInput_DispatchOrderFillFixedFee"),
        tokenA: getValue("tokenA_DispatchOrderFillFixedFee"),
        tokenB: getValue("tokenB_DispatchOrderFillFixedFee"),
        amountB: getValue("amountB_DispatchOrderFillFixedFee"),
        orderId: getValue("orderId_DispatchOrderFillFixedFee"),
        priorityFee: getValue("priorityFee_DispatchOrderFillFixedFee"),
        nonce_EVVM: getValue("nonce_EVVM_DispatchOrderFillFixedFee"),
      };

      // Validation
      if (!formData.tokenA || !formData.tokenB) {
        throw new Error("Token addresses are required");
      }
      if (!formData.orderId) {
        throw new Error("Order ID is required");
      }
      if (!formData.amountB || formData.amountB === "0") {
        throw new Error("Amount B must be greater than 0");
      }
      if (!formData.nonce) {
        throw new Error("P2PSwap nonce is required");
      }
      if (!formData.nonce_EVVM) {
        throw new Error("EVVM nonce is required");
      }

      const amountOfTokenBToFill = BigInt(formData.amountB) + feeFixed;

      const walletClient = await getWalletClient(config);
      if (!walletClient) {
        throw new Error("Wallet client not available");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const p2pSwap = new P2PSwap(signer, deployment.p2pSwap as `0x${string}`);

      // Create EVVM pay() action first
      const evvmAction = await evvm.pay({
        to: deployment.p2pSwap as `0x${string}`,
        tokenAddress: formData.tokenB as `0x${string}`,
        amount: amountOfTokenBToFill,
        priorityFee: BigInt(formData.priorityFee),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: priorityDispatchFixed === "high",
        executor: deployment.p2pSwap as `0x${string}`,
      });

      if (!feeFixed) throw new Error("Error calculating fee");
      if (!amountOutFixed) throw new Error("Error calculating fee");

      // Create P2PSwap dispatchOrder() action with fixed fee
      const p2pAction = await p2pSwap.dispatchOrder_fillFixedFee({
        nonce: BigInt(formData.nonce),
        tokenA: formData.tokenA as `0x${string}`,
        tokenB: formData.tokenB as `0x${string}`,
        orderId: BigInt(formData.orderId),
        amountOfTokenBToFill,
        maxFillFixedFee: BigInt(amountOutFixed),
        evvmSignedAction: evvmAction,
      });

      const dispatchData: DispatchOrderFillFixedFeeInputData = p2pAction.data;

      setDispatchFixedData(dispatchData);
      console.log("Dispatch fixed fee signature created successfully", dispatchData);
    } catch (error: any) {
      console.error("Error creating signature:", error);
      setTxError(error.message || "Failed to create signature");
    } finally {
      setDispatchFixedLoading(false);
    }
  };

  const executeDispatchFixedTx = async () => {
    if (!dispatchFixedData) {
      setTxError("No dispatch data available. Please create a signature first.");
      return;
    }

    setDispatchFixedLoading(true);
    setTxError(null);

    try {
      await executeDispatchOrderFillFixedFee(dispatchFixedData, deployment.p2pSwap as `0x${string}`);
      console.log("Order dispatched successfully");
      setDispatchFixedData(null);
      // Reset form
      const inputs = ["nonceInput_DispatchOrderFillFixedFee", "tokenA_DispatchOrderFillFixedFee", "tokenB_DispatchOrderFillFixedFee", "amountB_DispatchOrderFillFixedFee", "orderId_DispatchOrderFillFixedFee", "priorityFee_DispatchOrderFillFixedFee", "nonce_EVVM_DispatchOrderFillFixedFee", "amountOut_DispatchOrderFillFixedFee"];
      inputs.forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input) input.value = "";
      });
      setAmountBFixed(0n);
      setAmountOutFixed(1000000000000000000n);
    } catch (error: any) {
      console.error("Error executing transaction:", error);
      setTxError(error.message || "Failed to execute transaction");
    } finally {
      setDispatchFixedLoading(false);
    }
  };

  // ============================================
  // DISPATCH PROPORTIONAL FEE FUNCTIONS
  // ============================================

  const makeDispatchPropSignature = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) {
      setTxError("Unable to get wallet data. Please connect your wallet.");
      return;
    }

    setDispatchPropLoading(true);
    setTxError(null);

    try {
      const getValue = (id: string) =>
        (document.getElementById(id) as HTMLInputElement)?.value || "";

      const formData = {
        nonce: getValue("nonceInput_DispatchOrderFillPropotionalFee"),
        tokenA: getValue("tokenA_DispatchOrderFillPropotionalFee"),
        tokenB: getValue("tokenB_DispatchOrderFillPropotionalFee"),
        amountB: getValue("amountB_DispatchOrderFillPropotionalFee"),
        orderId: getValue("orderId_DispatchOrderFillPropotionalFee"),
        priorityFee: getValue("priorityFee_DispatchOrderFillPropotionalFee"),
        nonce_EVVM: getValue("nonce_EVVM_DispatchOrderFillPropotionalFee"),
      };

      // Validation
      if (!formData.tokenA || !formData.tokenB) {
        throw new Error("Token addresses are required");
      }
      if (!formData.orderId) {
        throw new Error("Order ID is required");
      }
      if (!formData.amountB || formData.amountB === "0") {
        throw new Error("Amount B must be greater than 0");
      }
      if (!formData.nonce) {
        throw new Error("P2PSwap nonce is required");
      }
      if (!formData.nonce_EVVM) {
        throw new Error("EVVM nonce is required");
      }

      const amountOfTokenBToFill = BigInt(formData.amountB) + feeProp;

      const walletClient = await getWalletClient(config);
      if (!walletClient) {
        throw new Error("Wallet client not available");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const p2pSwap = new P2PSwap(signer, deployment.p2pSwap as `0x${string}`);

      // Create EVVM pay() action first
      const evvmAction = await evvm.pay({
        to: deployment.p2pSwap as `0x${string}`,
        tokenAddress: formData.tokenB as `0x${string}`,
        amount: amountOfTokenBToFill,
        priorityFee: BigInt(formData.priorityFee),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: priorityDispatchProp === "high",
        executor: deployment.p2pSwap as `0x${string}`,
      });

      if (!feeProp) throw new Error("Error calculating fee");

      // Create P2PSwap dispatchOrder() action with proportional fee
      const p2pAction = await p2pSwap.dispatchOrder_fillPropotionalFee({
        nonce: BigInt(formData.nonce),
        tokenA: formData.tokenA as `0x${string}`,
        tokenB: formData.tokenB as `0x${string}`,
        orderId: BigInt(formData.orderId),
        amountOfTokenBToFill,
        evvmSignedAction: evvmAction,
      });

      const dispatchData: DispatchOrderFillPropotionalFeeInputData = p2pAction.data;

      setDispatchPropData(dispatchData);
      console.log("Dispatch proportional fee signature created successfully", dispatchData);
    } catch (error: any) {
      console.error("Error creating signature:", error);
      setTxError(error.message || "Failed to create signature");
    } finally {
      setDispatchPropLoading(false);
    }
  };

  const executeDispatchPropTx = async () => {
    if (!dispatchPropData) {
      setTxError("No dispatch data available. Please create a signature first.");
      return;
    }

    setDispatchPropLoading(true);
    setTxError(null);

    try {
      await executeDispatchOrderFillProportionalFee(dispatchPropData, deployment.p2pSwap as `0x${string}`);
      console.log("Order dispatched successfully");
      setDispatchPropData(null);
      // Reset form
      const inputs = ["nonceInput_DispatchOrderFillPropotionalFee", "tokenA_DispatchOrderFillPropotionalFee", "tokenB_DispatchOrderFillPropotionalFee", "amountB_DispatchOrderFillPropotionalFee", "orderId_DispatchOrderFillPropotionalFee", "priorityFee_DispatchOrderFillPropotionalFee", "nonce_EVVM_DispatchOrderFillPropotionalFee"];
      inputs.forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input) input.value = "";
      });
      setAmountBProp(0n);
    } catch (error: any) {
      console.error("Error executing transaction:", error);
      setTxError(error.message || "Failed to execute transaction");
    } finally {
      setDispatchPropLoading(false);
    }
  };

  // ============================================
  // CANCEL ORDER FUNCTIONS
  // ============================================

  const makeCancelOrderSignature = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) {
      setTxError("Unable to get wallet data. Please connect your wallet.");
      return;
    }

    setCancelLoading(true);
    setTxError(null);

    try {
      const getValue = (id: string) =>
        (document.getElementById(id) as HTMLInputElement)?.value || "";

      const formData = {
        nonce: getValue("nonceInput_CancelOrder"),
        tokenA: getValue("tokenA_CancelOrder"),
        tokenB: getValue("tokenB_CancelOrder"),
        orderId: getValue("orderId_CancelOrder"),
        priorityFee: getValue("priorityFee_CancelOrder"),
        nonce_EVVM: getValue("nonce_EVVM_CancelOrder"),
      };

      // Validation
      if (!formData.tokenA || !formData.tokenB) {
        throw new Error("Token addresses are required");
      }
      if (!formData.orderId) {
        throw new Error("Order ID is required");
      }
      if (!formData.nonce) {
        throw new Error("P2PSwap nonce is required");
      }
      if (!formData.nonce_EVVM) {
        throw new Error("EVVM nonce is required");
      }

      const walletClient = await getWalletClient(config);
      if (!walletClient) {
        throw new Error("Wallet client not available");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const p2pSwap = new P2PSwap(signer, deployment.p2pSwap as `0x${string}`);

      // Create EVVM pay() action first (with 0 amount for cancel)
      const evvmAction = await evvm.pay({
        to: deployment.p2pSwap as `0x${string}`,
        tokenAddress: MATE_TOKEN_ADDRESS,
        amount: 0n,
        priorityFee: BigInt(formData.priorityFee),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: priorityCancel === "high",
        executor: deployment.p2pSwap as `0x${string}`,
      });

      // Create P2PSwap cancelOrder() action
      const p2pAction = await p2pSwap.cancelOrder({
        nonce: BigInt(formData.nonce),
        tokenA: formData.tokenA as `0x${string}`,
        tokenB: formData.tokenB as `0x${string}`,
        orderId: BigInt(formData.orderId),
        evvmSignedAction: evvmAction,
      });

      const cancelData: CancelOrderInputData = p2pAction.data;

      setCancelOrderData(cancelData);
      console.log("Cancel order signature created successfully", cancelData);
    } catch (error: any) {
      console.error("Error creating signature:", error);
      setTxError(error.message || "Failed to create signature");
    } finally {
      setCancelLoading(false);
    }
  };

  const executeCancelOrderTx = async () => {
    if (!cancelOrderData) {
      setTxError("No cancel data available. Please create a signature first.");
      return;
    }

    setCancelLoading(true);
    setTxError(null);

    try {
      await executeCancelOrder(cancelOrderData, deployment.p2pSwap as `0x${string}`);
      console.log("Order cancelled successfully");
      setCancelOrderData(null);
      // Reset form
      const inputs = ["nonceInput_CancelOrder", "tokenA_CancelOrder", "tokenB_CancelOrder", "orderId_CancelOrder", "priorityFee_CancelOrder", "nonce_EVVM_CancelOrder"];
      inputs.forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input) input.value = "";
      });
    } catch (error: any) {
      console.error("Error executing transaction:", error);
      setTxError(error.message || "Failed to execute transaction");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>P2P Swap</h2>
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

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={activeTab === "makeOrder" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("makeOrder")}
        >
          Make Order
        </button>
        <button
          className={activeTab === "dispatchFixed" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("dispatchFixed")}
        >
          Dispatch (Fixed Fee)
        </button>
        <button
          className={activeTab === "dispatchProportional" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("dispatchProportional")}
        >
          Dispatch (Proportional)
        </button>
        <button
          className={activeTab === "cancelOrder" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("cancelOrder")}
        >
          Cancel Order
        </button>
      </div>

      {/* Make Order Tab */}
      {activeTab === "makeOrder" && (
        <div className="flex flex-1 flex-col justify-center items-center">
          <TitleAndLink
            title="Make Order"
            link="https://www.evvm.info/docs/SignatureStructures/P2PSwap/MakeOrderSignatureStructure"
          />
          <br />

          <AddressInputField
            label="Token A address (offering)"
            inputId="tokenA_MakeOrder"
            placeholder="Enter token A address"
          />

          <AddressInputField
            label="Token B address (requesting)"
            inputId="tokenB_MakeOrder"
            placeholder="Enter token B address"
          />

          <NumberInputField
            label="Amount of token A"
            inputId="amountA_MakeOrder"
            placeholder="Enter amount"
          />

          <NumberInputField
            label="Amount of token B"
            inputId="amountB_MakeOrder"
            placeholder="Enter amount"
          />

          <NumberInputField
            label="Priority fee"
            inputId="priorityFee_MakeOrder"
            placeholder="Enter priority fee"
            defaultValue="0"
          />

          <PrioritySelector onPriorityChange={setPriorityMake} />

          <NumberInputWithGenerator
            label="Nonce for P2PSwap"
            inputId="nonceInput_MakeOrder"
            placeholder="Enter nonce"
            showRandomBtn={true}
          />

          <NumberInputWithGenerator
            label="Nonce for EVVM contract interaction"
            inputId="nonce_EVVM_MakeOrder"
            placeholder="Enter nonce"
            showRandomBtn={priorityMake !== "low"}
          />

          <div>
            {priorityMake === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using
                  the <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}
          </div>

          <button
            onClick={makeMakeOrderSignature}
            disabled={makeLoading || !isConnected}
            style={{
              padding: "0.5rem",
              marginTop: "1rem",
              opacity: makeLoading || !isConnected ? 0.5 : 1,
            }}
          >
            {makeLoading ? "Creating signature..." : "Create signature"}
          </button>

          <DataDisplayWithClear
            dataToGet={makeOrderData}
            onClear={() => setMakeOrderData(null)}
            onExecute={executeMakeOrderTx}
          />
        </div>
      )}

      {/* Dispatch Fixed Fee Tab */}
      {activeTab === "dispatchFixed" && (
        <div className="flex flex-1 flex-col justify-center items-center">
          <TitleAndLink
            title="Dispatch Order (with fixed fee)"
            link="https://www.evvm.info/docs/SignatureStructures/P2PSwap/DispatchOrderSignatureStructure"
          />
          <br />

          <AddressInputField
            label="Token A address"
            inputId="tokenA_DispatchOrderFillFixedFee"
            placeholder="Enter token A address"
          />

          <AddressInputField
            label="Token B address"
            inputId="tokenB_DispatchOrderFillFixedFee"
            placeholder="Enter token B address"
          />

          <NumberInputField
            label="Order ID"
            inputId="orderId_DispatchOrderFillFixedFee"
            placeholder="Enter order ID"
          />

          <NumberInputField
            label="Priority fee"
            inputId="priorityFee_DispatchOrderFillFixedFee"
            placeholder="Enter priority fee"
            defaultValue="0"
          />

          <div style={{ marginBottom: "1rem" }}>
            <p>Amount of token B to fill</p>
            <div className="flex">
              <input
                type="number"
                placeholder="Enter amount of token B to fill"
                id="amountB_DispatchOrderFillFixedFee"
                style={{
                  color: "black",
                  backgroundColor: "white",
                  height: "2rem",
                  width: "25rem",
                }}
                onInput={(e) => {
                  const value = e.currentTarget.value;
                  if (value) setAmountBFixed(BigInt(value));
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <p>Fee cap</p>
            <div className="flex">
              <input
                type="number"
                placeholder="Enter fee cap"
                id="amountOut_DispatchOrderFillFixedFee"
                defaultValue="1000000000000000000"
                style={{
                  color: "black",
                  backgroundColor: "white",
                  height: "2rem",
                  width: "25rem",
                }}
                onInput={(e) => {
                  const value = e.currentTarget.value;
                  if (value) setAmountOutFixed(BigInt(value));
                }}
              />
            </div>
            <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
              Calculated fee: {feeFixed.toString()} (5% of amount B, capped at fee cap)
            </p>
          </div>

          <PrioritySelector onPriorityChange={setPriorityDispatchFixed} />

          <NumberInputWithGenerator
            label="Nonce for P2PSwap"
            inputId="nonceInput_DispatchOrderFillFixedFee"
            placeholder="Enter nonce"
            showRandomBtn={true}
          />

          <NumberInputWithGenerator
            label="Nonce for EVVM contract interaction"
            inputId="nonce_EVVM_DispatchOrderFillFixedFee"
            placeholder="Enter nonce"
            showRandomBtn={priorityDispatchFixed !== "low"}
          />

          <div>
            {priorityDispatchFixed === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using
                  the <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}
          </div>

          <button
            onClick={makeDispatchFixedSignature}
            disabled={dispatchFixedLoading || !isConnected}
            style={{
              padding: "0.5rem",
              marginTop: "1rem",
              opacity: dispatchFixedLoading || !isConnected ? 0.5 : 1,
            }}
          >
            {dispatchFixedLoading ? "Creating signature..." : "Create signature"}
          </button>

          <DataDisplayWithClear
            dataToGet={dispatchFixedData}
            onClear={() => setDispatchFixedData(null)}
            onExecute={executeDispatchFixedTx}
          />
        </div>
      )}

      {/* Dispatch Proportional Fee Tab */}
      {activeTab === "dispatchProportional" && (
        <div className="flex flex-1 flex-col justify-center items-center">
          <TitleAndLink
            title="Dispatch Order (with proportional fee)"
            link="https://www.evvm.info/docs/SignatureStructures/P2PSwap/DispatchOrderSignatureStructure"
          />
          <br />

          <AddressInputField
            label="Token A address"
            inputId="tokenA_DispatchOrderFillPropotionalFee"
            placeholder="Enter token A address"
          />

          <AddressInputField
            label="Token B address"
            inputId="tokenB_DispatchOrderFillPropotionalFee"
            placeholder="Enter token B address"
          />

          <NumberInputField
            label="Order ID"
            inputId="orderId_DispatchOrderFillPropotionalFee"
            placeholder="Enter order ID"
          />

          <NumberInputField
            label="Priority fee"
            inputId="priorityFee_DispatchOrderFillPropotionalFee"
            placeholder="Enter priority fee"
            defaultValue="0"
          />

          <div style={{ marginBottom: "1rem" }}>
            <p>Amount of token B to fill</p>
            <div className="flex">
              <input
                type="number"
                placeholder="Enter amount of token B to fill"
                id="amountB_DispatchOrderFillPropotionalFee"
                style={{
                  color: "black",
                  backgroundColor: "white",
                  height: "2rem",
                  width: "25rem",
                }}
                onInput={(e) => {
                  const value = e.currentTarget.value;
                  if (value) setAmountBProp(BigInt(value));
                }}
              />
            </div>
            <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
              Calculated fee: {feeProp.toString()} (5% of amount B)
            </p>
          </div>

          <PrioritySelector onPriorityChange={setPriorityDispatchProp} />

          <NumberInputWithGenerator
            label="Nonce for P2PSwap"
            inputId="nonceInput_DispatchOrderFillPropotionalFee"
            placeholder="Enter nonce"
            showRandomBtn={true}
          />

          <NumberInputWithGenerator
            label="Nonce for EVVM contract interaction"
            inputId="nonce_EVVM_DispatchOrderFillPropotionalFee"
            placeholder="Enter nonce"
            showRandomBtn={priorityDispatchProp !== "low"}
          />

          <div>
            {priorityDispatchProp === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using
                  the <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}
          </div>

          <button
            onClick={makeDispatchPropSignature}
            disabled={dispatchPropLoading || !isConnected}
            style={{
              padding: "0.5rem",
              marginTop: "1rem",
              opacity: dispatchPropLoading || !isConnected ? 0.5 : 1,
            }}
          >
            {dispatchPropLoading ? "Creating signature..." : "Create signature"}
          </button>

          <DataDisplayWithClear
            dataToGet={dispatchPropData}
            onClear={() => setDispatchPropData(null)}
            onExecute={executeDispatchPropTx}
          />
        </div>
      )}

      {/* Cancel Order Tab */}
      {activeTab === "cancelOrder" && (
        <div className="flex flex-1 flex-col justify-center items-center">
          <TitleAndLink
            title="Cancel Order"
            link="https://www.evvm.info/docs/SignatureStructures/P2PSwap/CancelOrderSignatureStructure"
          />
          <br />

          <AddressInputField
            label="Token A address"
            inputId="tokenA_CancelOrder"
            placeholder="Enter token A address"
          />

          <AddressInputField
            label="Token B address"
            inputId="tokenB_CancelOrder"
            placeholder="Enter token B address"
          />

          <NumberInputField
            label="Order ID"
            inputId="orderId_CancelOrder"
            placeholder="Enter order ID"
          />

          <NumberInputField
            label="Priority fee (paid in MATE TOKEN)"
            inputId="priorityFee_CancelOrder"
            placeholder="Enter priority fee"
            defaultValue="0"
          />

          <PrioritySelector onPriorityChange={setPriorityCancel} />

          <NumberInputWithGenerator
            label="Nonce for P2PSwap"
            inputId="nonceInput_CancelOrder"
            placeholder="Enter nonce"
            showRandomBtn={true}
          />

          <NumberInputWithGenerator
            label="Nonce for EVVM contract interaction"
            inputId="nonce_EVVM_CancelOrder"
            placeholder="Enter nonce"
            showRandomBtn={priorityCancel !== "low"}
          />

          <div>
            {priorityCancel === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using
                  the <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}
          </div>

          <button
            onClick={makeCancelOrderSignature}
            disabled={cancelLoading || !isConnected}
            style={{
              padding: "0.5rem",
              marginTop: "1rem",
              opacity: cancelLoading || !isConnected ? 0.5 : 1,
            }}
          >
            {cancelLoading ? "Creating signature..." : "Create signature"}
          </button>

          <DataDisplayWithClear
            dataToGet={cancelOrderData}
            onClear={() => setCancelOrderData(null)}
            onExecute={executeCancelOrderTx}
          />
        </div>
      )}
    </div>
  );
}
