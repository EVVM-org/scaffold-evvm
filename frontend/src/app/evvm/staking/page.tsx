"use client";

import React, { useState, useEffect } from "react";
import { config } from "@/config/index";
import { getWalletClient, getAccount } from "@wagmi/core";
import {
  TitleAndLink,
  NumberInputWithGenerator,
  PrioritySelector,
  DataDisplayWithClear,
  HelperInfo,
  NumberInputField,
  StakingActionSelector,
} from "@/components/SigConstructors/InputsAndModules";
import {
  executeGoldenStaking,
  executePresaleStaking,
  executePublicStaking,
} from "@/utils/transactionExecuters/stakingExecuter";
import { getAccountWithRetry } from "@/utils/getAccountWithRetry";
import {
  PayInputData,
  GoldenStakingInputData,
  PresaleStakingInputData,
  PublicStakingInputData,
  StakingSignatureBuilder,
} from "@evvm/viem-signature-library";
import { useEvvmDeployment } from "@/hooks/useEvvmDeployment";
import styles from "@/styles/pages/Staking.module.css";

type GoldenStakingData = {
  PayInputData: PayInputData;
  GoldenStakingInputData: GoldenStakingInputData;
};

type PresaleStakingData = {
  PresaleStakingInputData: PresaleStakingInputData;
  PayInputData: PayInputData;
};

type PublicStakingData = {
  PublicStakingInputData: PublicStakingInputData;
  PayInputData: PayInputData;
};

type StakingTab = "golden" | "presale" | "public";

export default function StakingPage() {
  const { deployment, loading: deploymentLoading, error: deploymentError } = useEvvmDeployment();
  const [activeTab, setActiveTab] = useState<StakingTab>("golden");
  const [account, setAccount] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    // Check for connected account
    const checkAccount = async () => {
      try {
        const walletData = await getAccountWithRetry(config);
        if (walletData && walletData.address) {
          setAccount(walletData.address as `0x${string}`);
        }
      } catch (error) {
        console.error("Failed to get account:", error);
      }
    };
    checkAccount();
  }, []);

  if (deploymentLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>EVVM Staking</h2>
        </div>
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading deployment information...</div>
      </div>
    );
  }

  if (deploymentError || !deployment) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>EVVM Staking</h2>
        </div>
        <div className={styles.error}>
          {deploymentError || "No EVVM deployment found. Please deploy contracts first."}
        </div>
      </div>
    );
  }

  const evvmID = deployment.evvmID.toString();
  const stakingAddress = deployment.staking as `0x${string}`;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>EVVM Staking</h2>
        {account && (
          <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
            Connected: {account.substring(0, 6)}...{account.substring(38)}
          </div>
        )}
      </div>

      <div className={styles.stakingInfo}>
        <h3>Staking Information</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.label}>EVVM ID:</span>
            <span className={styles.value}>{evvmID}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Staking Contract:</span>
            <span className={styles.value} style={{ fontSize: "0.75rem" }}>
              {stakingAddress}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className={styles.tabSwitcher}>
        <button
          className={`${styles.tab} ${activeTab === "golden" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("golden")}
        >
          Golden Staking
        </button>
        <button
          className={`${styles.tab} ${activeTab === "presale" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("presale")}
        >
          Presale Staking
        </button>
        <button
          className={`${styles.tab} ${activeTab === "public" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("public")}
        >
          Public Staking
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === "golden" && (
          <GoldenStakingComponent evvmID={evvmID} stakingAddress={stakingAddress} />
        )}
        {activeTab === "presale" && (
          <PresaleStakingComponent evvmID={evvmID} stakingAddress={stakingAddress} />
        )}
        {activeTab === "public" && (
          <PublicStakingComponent evvmID={evvmID} stakingAddress={stakingAddress} />
        )}
      </div>
    </div>
  );
}

// Golden Staking Component
function GoldenStakingComponent({
  evvmID,
  stakingAddress,
}: {
  evvmID: string;
  stakingAddress: `0x${string}`;
}) {
  const [isStaking, setIsStaking] = useState(true);
  const [priority, setPriority] = useState("low");
  const [dataToGet, setDataToGet] = useState<GoldenStakingData | null>(null);

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const getValue = (id: string) => (document.getElementById(id) as HTMLInputElement).value;

    const formData = {
      evvmID: evvmID,
      nonce: getValue("nonceInput_GoldenStaking"),
      stakingAddress: stakingAddress,
      amountOfStaking: Number(getValue("amountOfStakingInput_GoldenStaking")),
    };

    const amountOfToken = BigInt(formData.amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18));

    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (StakingSignatureBuilder as any)(walletClient, walletData);

      const signaturePay = await signatureBuilder.signGoldenStaking(
        BigInt(formData.evvmID),
        formData.stakingAddress as `0x${string}`,
        amountOfToken,
        BigInt(formData.nonce),
        priority === "high"
      );

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.stakingAddress as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: amountOfToken,
          priorityFee: BigInt(0),
          nonce: BigInt(formData.nonce),
          priority: priority === "high",
          executor: formData.stakingAddress as `0x${string}`,
          signature: signaturePay,
        },
        GoldenStakingInputData: {
          isStaking: isStaking,
          amountOfStaking: BigInt(formData.amountOfStaking),
          signature_EVVM: signaturePay,
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
    const stakingAddress = dataToGet.PayInputData.to_address;

    executeGoldenStaking(dataToGet.GoldenStakingInputData, stakingAddress)
      .then(() => {
        console.log("Golden staking executed successfully");
      })
      .catch((error) => {
        console.error("Error executing golden staking:", error);
      });
  };

  return (
    <div className={styles.stakingForm}>
      <TitleAndLink
        title="Golden Staking"
        link="https://www.evvm.info/docs/SignatureStructures/SMate/StakingUnstakingStructure"
      />
      <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
        Golden stakers have exclusive privileges and higher rewards. Staking amount is multiplied by 5083.
      </p>

      <StakingActionSelector onChange={setIsStaking} />

      <NumberInputField
        label={isStaking ? "Amount of MATE to stake" : "Amount of MATE to unstake (sMATE)"}
        inputId="amountOfStakingInput_GoldenStaking"
        placeholder="Enter amount"
      />

      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="Nonce"
        inputId="nonceInput_GoldenStaking"
        placeholder="Enter nonce"
        showRandomBtn={priority !== "low"}
      />

      {priority === "low" && (
        <HelperInfo label="How to find my sync nonce?">
          <div>
            You can retrieve your next sync nonce from the EVVM contract using the{" "}
            <code>getNextCurrentSyncNonce</code> function.
          </div>
        </HelperInfo>
      )}

      <button onClick={makeSig} className={styles.submitButton} style={{ marginTop: "1rem" }}>
        Create signature
      </button>

      <DataDisplayWithClear dataToGet={dataToGet} onClear={() => setDataToGet(null)} onExecute={execute} />
    </div>
  );
}

// Presale Staking Component
function PresaleStakingComponent({
  evvmID,
  stakingAddress,
}: {
  evvmID: string;
  stakingAddress: `0x${string}`;
}) {
  const [isStaking, setIsStaking] = useState(true);
  const [priority, setPriority] = useState("low");
  const [dataToGet, setDataToGet] = useState<PresaleStakingData | null>(null);

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const getValue = (id: string) => (document.getElementById(id) as HTMLInputElement).value;

    const formData = {
      evvmID: evvmID,
      stakingAddress: stakingAddress,
      priorityFee_EVVM: getValue("priorityFeeInput_presaleStaking"),
      nonce_EVVM: getValue("nonceEVVMInput_presaleStaking"),
      nonce: getValue("nonceStakingInput_presaleStaking"),
      priorityFlag_EVVM: priority === "high",
    };

    const amountOfToken = (1 * 10 ** 18).toLocaleString("fullwide", {
      useGrouping: false,
    });

    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (StakingSignatureBuilder as any)(walletClient, walletData);

      const { paySignature, actionSignature } = await signatureBuilder.signPresaleStaking(
        BigInt(formData.evvmID),
        formData.stakingAddress as `0x${string}`,
        isStaking,
        BigInt(formData.nonce),
        BigInt(formData.priorityFee_EVVM),
        BigInt(amountOfToken),
        BigInt(formData.nonce_EVVM),
        formData.priorityFlag_EVVM
      );

      setDataToGet({
        PresaleStakingInputData: {
          isStaking: isStaking,
          user: walletData.address as `0x${string}`,
          nonce: BigInt(formData.nonce),
          signature: actionSignature,
          priorityFee_EVVM: BigInt(formData.priorityFee_EVVM),
          priorityFlag_EVVM: priority === "high",
          nonce_EVVM: BigInt(formData.nonce_EVVM),
          signature_EVVM: paySignature,
        },
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.stakingAddress as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: BigInt(amountOfToken),
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          priority: priority === "high",
          executor: formData.stakingAddress as `0x${string}`,
          signature: paySignature,
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

    const stakingAddress = dataToGet.PayInputData.to_address;

    executePresaleStaking(dataToGet.PresaleStakingInputData, stakingAddress)
      .then(() => {
        console.log("Presale staking executed successfully");
      })
      .catch((error) => {
        console.error("Error executing presale staking:", error);
      });
  };

  return (
    <div className={styles.stakingForm}>
      <TitleAndLink
        title="Presale Staking"
        link="https://www.evvm.info/docs/SignatureStructures/SMate/StakingUnstakingStructure"
      />
      <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
        A presale staker can stake/unstake one sMATE per transaction (1 MATE = 10^18 wei).
      </p>

      <StakingActionSelector onChange={setIsStaking} />

      <NumberInputWithGenerator
        label="Staking Nonce"
        inputId="nonceStakingInput_presaleStaking"
        placeholder="Enter nonce"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_presaleStaking"
        placeholder="Enter priority fee"
      />

      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_presaleStaking"
        placeholder="Enter nonce"
        showRandomBtn={priority !== "low"}
      />

      {priority === "low" && (
        <HelperInfo label="How to find my sync nonce?">
          <div>
            You can retrieve your next sync nonce from the EVVM contract using the{" "}
            <code>getNextCurrentSyncNonce</code> function.
          </div>
        </HelperInfo>
      )}

      <button onClick={makeSig} className={styles.submitButton} style={{ marginTop: "1rem" }}>
        Create Signature
      </button>

      <DataDisplayWithClear dataToGet={dataToGet} onClear={() => setDataToGet(null)} onExecute={execute} />
    </div>
  );
}

// Public Staking Component
function PublicStakingComponent({
  evvmID,
  stakingAddress,
}: {
  evvmID: string;
  stakingAddress: `0x${string}`;
}) {
  const [isStaking, setIsStaking] = useState(true);
  const [priority, setPriority] = useState("low");
  const [dataToGet, setDataToGet] = useState<PublicStakingData | null>(null);

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const getValue = (id: string) => (document.getElementById(id) as HTMLInputElement).value;

    const formData = {
      evvmID: evvmID,
      stakingAddress: stakingAddress,
      nonceEVVM: getValue("nonceEVVMInput_PublicStaking"),
      nonceStaking: getValue("nonceStakingInput_PublicStaking"),
      amountOfStaking: Number(getValue("amountOfStakingInput_PublicStaking")),
      priorityFee: getValue("priorityFeeInput_PublicStaking"),
    };

    if (!formData.stakingAddress) {
      alert("Please enter a staking address");
      return;
    }

    const amountOfToken = BigInt(formData.amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18));

    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (StakingSignatureBuilder as any)(walletClient, walletData);

      const { paySignature, actionSignature } = await signatureBuilder.signPublicStaking(
        BigInt(formData.evvmID),
        formData.stakingAddress as `0x${string}`,
        isStaking,
        BigInt(formData.amountOfStaking),
        BigInt(formData.nonceStaking),
        amountOfToken,
        BigInt(formData.priorityFee),
        BigInt(formData.nonceEVVM),
        priority === "high"
      );

      setDataToGet({
        PublicStakingInputData: {
          isStaking: isStaking,
          user: walletData.address as `0x${string}`,
          nonce: BigInt(formData.nonceStaking),
          amountOfStaking: BigInt(formData.amountOfStaking),
          signature: actionSignature,
          priorityFee_EVVM: BigInt(formData.priorityFee),
          priorityFlag_EVVM: priority === "high",
          nonce_EVVM: BigInt(formData.nonceEVVM),
          signature_EVVM: paySignature,
        },
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: formData.stakingAddress as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: BigInt(amountOfToken),
          priorityFee: BigInt(formData.priorityFee),
          nonce: BigInt(formData.nonceEVVM),
          priority: priority === "high",
          executor: formData.stakingAddress as `0x${string}`,
          signature: paySignature,
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

    const stakingAddress = dataToGet.PayInputData.to_address;

    executePublicStaking(dataToGet.PublicStakingInputData, stakingAddress)
      .then(() => {
        console.log("Public staking executed successfully");
      })
      .catch((error) => {
        console.error("Error executing public staking:", error);
      });
  };

  return (
    <div className={styles.stakingForm}>
      <TitleAndLink
        title="Public Staking"
        link="https://www.evvm.info/docs/SignatureStructures/SMate/StakingUnstakingStructure"
      />
      <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
        Public staking allows any user to stake variable amounts. Amount is multiplied by 5083.
      </p>

      <StakingActionSelector onChange={setIsStaking} />

      <NumberInputWithGenerator
        label="Staking Nonce"
        inputId="nonceStakingInput_PublicStaking"
        placeholder="Enter nonce"
      />

      <NumberInputField
        label={isStaking ? "Amount of MATE to stake" : "Amount of MATE to unstake (sMATE)"}
        inputId="amountOfStakingInput_PublicStaking"
        placeholder="Enter amount"
      />

      <NumberInputField
        label="Priority fee"
        inputId="priorityFeeInput_PublicStaking"
        placeholder="Enter priority fee"
      />

      <PrioritySelector onPriorityChange={setPriority} />

      <NumberInputWithGenerator
        label="EVVM Nonce"
        inputId="nonceEVVMInput_PublicStaking"
        placeholder="Enter nonce"
        showRandomBtn={priority !== "low"}
      />

      {priority === "low" && (
        <HelperInfo label="How to find my sync nonce?">
          <div>
            You can retrieve your next sync nonce from the EVVM contract using the{" "}
            <code>getNextCurrentSyncNonce</code> function.
          </div>
        </HelperInfo>
      )}

      <button onClick={makeSig} className={styles.submitButton} style={{ marginTop: "1rem" }}>
        Create Signature
      </button>

      <DataDisplayWithClear dataToGet={dataToGet} onClear={() => setDataToGet(null)} onExecute={execute} />
    </div>
  );
}
