"use client";

import React, { useState, useEffect } from "react";
import { config } from "@/config/index";
import { getWalletClient, getAccount, writeContract } from "@wagmi/core";
import { usePublicClient } from "wagmi";
import {
  TitleAndLink,
  NumberInputWithGenerator,
  DataDisplayWithClear,
  HelperInfo,
  NumberInputField,
  StakingActionSelector,
  PrioritySelector,
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
  StakingABI,
} from "@evvm/viem-signature-library";
import { useEvvmDeployment } from "@/hooks/useEvvmDeployment";
import { NetworkWarning } from "@/components/NetworkWarning";
import { readBalance, readNextNonce } from "@/lib/evvmExecutors";
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

      <NetworkWarning deployment={deployment} />

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
          <GoldenStakingComponent evvmID={evvmID} stakingAddress={stakingAddress} deployment={deployment} />
        )}
        {activeTab === "presale" && (
          <PresaleStakingComponent evvmID={evvmID} stakingAddress={stakingAddress} deployment={deployment} />
        )}
        {activeTab === "public" && (
          <PublicStakingComponent evvmID={evvmID} stakingAddress={stakingAddress} deployment={deployment} />
        )}
      </div>
    </div>
  );
}

// Golden Staking Component
function GoldenStakingComponent({
  evvmID,
  stakingAddress,
  deployment,
}: {
  evvmID: string;
  stakingAddress: `0x${string}`;
  deployment: any;
}) {
  const [isStaking, setIsStaking] = useState(true);
  // Golden Staking ALWAYS uses sync (low priority) per documentation
  const priority = "low"; // Fixed - not changeable for Golden Staking
  const [dataToGet, setDataToGet] = useState<GoldenStakingData | null>(null);
  const [evvmBalance, setEvvmBalance] = useState<string | null>(null);
  const [currentNonce, setCurrentNonce] = useState<string | null>(null);
  const [nonceLoading, setNonceLoading] = useState(true);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const publicClient = usePublicClient();

  // Load user's EVVM balance and nonce
  useEffect(() => {
    async function loadUserData() {
      try {
        const walletData = await getAccountWithRetry(config);
        if (!walletData || !publicClient || !deployment) return;

        setAccount(walletData.address as `0x${string}`);

        // Read EVVM balance (MATE token)
        const mateToken = "0x0000000000000000000000000000000000000001" as `0x${string}`;
        const balance = await readBalance(publicClient, deployment.evvm as `0x${string}`, walletData.address as `0x${string}`, mateToken);

        console.log("📊 Balance Debug Info:");
        console.log("  Raw balance (wei):", balance.toString());
        console.log("  Balance > MAX_SAFE_INTEGER?", balance > BigInt(Number.MAX_SAFE_INTEGER));

        // Convert BigInt to string safely without Number overflow
        // Divide by 10^18 using BigInt arithmetic
        const balanceInMate = balance / BigInt(10 ** 18);
        const remainder = balance % BigInt(10 ** 18);
        const decimals = remainder.toString().padStart(18, '0').slice(0, 2);
        const formattedBalance = `${balanceInMate}.${decimals}`;

        console.log("  Formatted balance:", formattedBalance, "MATE");

        setEvvmBalance(formattedBalance);

        // Read next nonce
        const nonce = await readNextNonce(publicClient, deployment.evvm as `0x${string}`, walletData.address as `0x${string}`);
        setCurrentNonce(nonce.toString());
        setNonceLoading(false);
      } catch (error) {
        console.error("Failed to load user data:", error);
        setNonceLoading(false);
      }
    }

    loadUserData();
  }, [publicClient, deployment]);

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) {
      alert("Please connect your wallet first.");
      return;
    }

    // Golden Staking uses the auto-fetched sync nonce - it MUST match what contract will use
    if (!currentNonce) {
      alert("Nonce not loaded yet. Please wait for the nonce to be fetched.");
      return;
    }

    const getValue = (id: string) => (document.getElementById(id) as HTMLInputElement).value;

    const formData = {
      evvmID: evvmID,
      nonce: currentNonce, // Use auto-fetched sync nonce, not user input
      stakingAddress: stakingAddress,
      amountOfStaking: Number(getValue("amountOfStakingInput_GoldenStaking")),
    };

    // Validation
    if (!formData.amountOfStaking || formData.amountOfStaking <= 0) {
      alert("Please enter a valid number of Golden Fishers (at least 1).");
      return;
    }

    const amountOfToken = BigInt(formData.amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18));

    console.log("🔐 Golden Staking Signature Details:");
    console.log("  EVVM ID:", formData.evvmID);
    console.log("  Staking Address:", formData.stakingAddress);
    console.log("  Amount of Fishers:", formData.amountOfStaking);
    console.log("  Total MATE (wei):", amountOfToken.toString());
    console.log("  Sync Nonce (from contract):", formData.nonce);
    console.log("  Priority: sync (low) - fixed for Golden Staking");

    // Sign and set data
    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (StakingSignatureBuilder as any)(walletClient, walletData);

      // Golden Staking ALWAYS uses sync (false) for priority
      const signaturePay = await signatureBuilder.signGoldenStaking(
        BigInt(formData.evvmID),
        formData.stakingAddress as `0x${string}`,
        amountOfToken,
        BigInt(formData.nonce),
        false  // Always sync (low priority) for Golden Staking
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
          priority: false, // Golden Staking always uses sync (low priority)
          executor: formData.stakingAddress as `0x${string}`,
          signature: signaturePay,
        },
        GoldenStakingInputData: {
          isStaking: isStaking,
          amountOfStaking: BigInt(formData.amountOfStaking),  // Number of staking tokens (fishers), contract multiplies by PRICE_OF_STAKING
          signature_EVVM: signaturePay,
        },
      } as GoldenStakingData);
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
        title="Golden Staking (Become a Golden Fisher)"
        link="https://www.evvm.info/docs/SignatureStructures/SMate/StakingUnstakingStructure"
      />

      <div style={{
        marginBottom: "1.5rem",
        padding: "1rem",
        background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
        border: "2px solid #b91c1c",
        borderRadius: "8px",
        color: "#fff"
      }}>
        <h4 style={{ margin: "0 0 0.5rem 0", fontWeight: "700" }}>⚠️ Golden Fisher Only</h4>
        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>
          This function is <strong>EXCLUSIVE</strong> to the designated Golden Fisher address.
        </p>
        <p style={{ margin: "0", fontSize: "0.85rem" }}>
          Regular users should use <strong>Public Staking</strong> tab instead.
        </p>
      </div>

      <div style={{
        marginBottom: "1.5rem",
        padding: "1rem",
        background: "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)",
        border: "2px solid #ffa500",
        borderRadius: "8px",
        color: "#000"
      }}>
        <h4 style={{ margin: "0 0 0.5rem 0", fontWeight: "700" }}>🐟 Golden Fisher Staking</h4>
        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>
          Each <strong>Golden Fisher</strong> costs exactly <strong>5,083 MATE tokens</strong>.
        </p>
        <p style={{ margin: "0", fontSize: "0.85rem", fontStyle: "italic" }}>
          Enter the number of fishers (e.g., 1, 2, 3...), not the MATE amount.
        </p>
      </div>

      {/* User Balance and Nonce Info */}
      {account && (
        <div style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px"
        }}>
          <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem", fontWeight: "600" }}>Your EVVM Account</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                EVVM Balance (MATE)
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "700", color: evvmBalance && parseFloat(evvmBalance) < 5083 ? "#ef4444" : "#10b981" }}>
                {evvmBalance ? parseFloat(evvmBalance).toLocaleString() : "Loading..."}
              </div>
              {evvmBalance && parseFloat(evvmBalance) < 5083 && (
                <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.25rem" }}>
                  ⚠️ Insufficient for 1 fisher
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                Current Sync Nonce
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>
                {currentNonce !== null ? currentNonce : "Loading..."}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                For sync (low priority) transactions
              </div>
            </div>
          </div>
        </div>
      )}

      <StakingActionSelector onChange={setIsStaking} />

      <NumberInputField
        label={isStaking ? "Number of Golden Fishers to stake" : "Number of Golden Fishers to unstake"}
        inputId="amountOfStakingInput_GoldenStaking"
        placeholder="Enter number of fishers (e.g., 1, 2, 3)"
      />

      {/* Golden Staking info - nonce is auto-fetched */}
      <div style={{
        marginTop: "1rem",
        padding: "1rem",
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px"
      }}>
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
          Sync Nonce (auto-fetched from contract)
        </div>
        <div style={{ fontSize: "1.25rem", fontWeight: "700", fontFamily: "monospace" }}>
          {nonceLoading ? "Loading..." : currentNonce || "N/A"}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
          Golden Staking always uses sync (low priority). The nonce is fetched automatically.
        </div>
      </div>

      <button
        onClick={makeSig}
        className={styles.submitButton}
        style={{ marginTop: "1rem" }}
        disabled={nonceLoading || !currentNonce}
      >
        {nonceLoading ? "Loading nonce..." : "Create signature"}
      </button>

      <DataDisplayWithClear dataToGet={dataToGet} onClear={() => setDataToGet(null)} onExecute={execute} />
    </div>
  );
}

// Presale Staking Component
function PresaleStakingComponent({
  evvmID,
  stakingAddress,
  deployment,
}: {
  evvmID: string;
  stakingAddress: `0x${string}`;
  deployment: any;
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
  deployment,
}: {
  evvmID: string;
  stakingAddress: `0x${string}`;
  deployment: any;
}) {
  const [isStaking, setIsStaking] = useState(true);
  const [priority, setPriority] = useState("low");
  const [dataToGet, setDataToGet] = useState<PublicStakingData | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [publicStakingStatus, setPublicStakingStatus] = useState<{
    isEnabled: boolean;
    timeToAccept: bigint;
    isPending: boolean;
  } | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const publicClient = usePublicClient();

  // Check if connected wallet is admin
  const isAdmin = account && deployment.admin &&
    account.toLowerCase() === deployment.admin.toLowerCase();

  // Load account and public staking status
  useEffect(() => {
    async function loadData() {
      try {
        const walletData = await getAccountWithRetry(config);
        if (walletData?.address) {
          setAccount(walletData.address as `0x${string}`);
        }

        if (publicClient && stakingAddress) {
          // Check public staking status
          const status = await publicClient.readContract({
            address: stakingAddress,
            abi: StakingABI,
            functionName: 'getAllDataOfAllowPublicStaking',
          }) as { flag: boolean; timeToAccept: bigint };

          setPublicStakingStatus({
            isEnabled: status.flag,
            timeToAccept: status.timeToAccept,
            isPending: status.timeToAccept > 0n,
          });
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    }

    loadData();
  }, [publicClient, stakingAddress, deployment]);

  // Admin function to prepare public staking change
  const preparePublicStakingChange = async () => {
    if (!isAdmin) return;
    setAdminLoading(true);

    try {
      const hash = await writeContract(config, {
        abi: StakingABI,
        address: stakingAddress,
        functionName: 'prepareChangeAllowPublicStaking',
      });
      console.log("Prepare public staking change tx:", hash);
      alert("Public staking change prepared! Wait for timelock period, then confirm.");

      // Refresh status
      if (publicClient) {
        const status = await publicClient.readContract({
          address: stakingAddress,
          abi: StakingABI,
          functionName: 'getAllDataOfAllowPublicStaking',
        }) as { flag: boolean; timeToAccept: bigint };
        setPublicStakingStatus({
          isEnabled: status.flag,
          timeToAccept: status.timeToAccept,
          isPending: status.timeToAccept > 0n,
        });
      }
    } catch (error) {
      console.error("Failed to prepare public staking change:", error);
      alert(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setAdminLoading(false);
    }
  };

  // Admin function to confirm public staking change
  const confirmPublicStakingChange = async () => {
    if (!isAdmin) return;
    setAdminLoading(true);

    try {
      const hash = await writeContract(config, {
        abi: StakingABI,
        address: stakingAddress,
        functionName: 'confirmChangeAllowPublicStaking',
      });
      console.log("Confirm public staking change tx:", hash);
      alert("Public staking change confirmed!");

      // Refresh status
      if (publicClient) {
        const status = await publicClient.readContract({
          address: stakingAddress,
          abi: StakingABI,
          functionName: 'getAllDataOfAllowPublicStaking',
        }) as { flag: boolean; timeToAccept: bigint };
        setPublicStakingStatus({
          isEnabled: status.flag,
          timeToAccept: status.timeToAccept,
          isPending: status.timeToAccept > 0n,
        });
      }
    } catch (error) {
      console.error("Failed to confirm public staking change:", error);
      alert(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setAdminLoading(false);
    }
  };

  // Admin function to cancel public staking change
  const cancelPublicStakingChange = async () => {
    if (!isAdmin) return;
    setAdminLoading(true);

    try {
      const hash = await writeContract(config, {
        abi: StakingABI,
        address: stakingAddress,
        functionName: 'cancelChangeAllowPublicStaking',
      });
      console.log("Cancel public staking change tx:", hash);
      alert("Public staking change cancelled!");

      // Refresh status
      if (publicClient) {
        const status = await publicClient.readContract({
          address: stakingAddress,
          abi: StakingABI,
          functionName: 'getAllDataOfAllowPublicStaking',
        }) as { flag: boolean; timeToAccept: bigint };
        setPublicStakingStatus({
          isEnabled: status.flag,
          timeToAccept: status.timeToAccept,
          isPending: status.timeToAccept > 0n,
        });
      }
    } catch (error) {
      console.error("Failed to cancel public staking change:", error);
      alert(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setAdminLoading(false);
    }
  };

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

      {/* Public Staking Status */}
      <div style={{
        marginBottom: "1rem",
        padding: "1rem",
        background: publicStakingStatus?.isEnabled
          ? "linear-gradient(135deg, #10b981 0%, #34d399 100%)"
          : "linear-gradient(135deg, #ef4444 0%, #f87171 100%)",
        border: publicStakingStatus?.isEnabled ? "2px solid #059669" : "2px solid #dc2626",
        borderRadius: "8px",
        color: "#fff"
      }}>
        <h4 style={{ margin: "0 0 0.5rem 0", fontWeight: "700" }}>
          {publicStakingStatus?.isEnabled ? "✓ Public Staking Enabled" : "✗ Public Staking Disabled"}
        </h4>
        <p style={{ margin: "0", fontSize: "0.85rem" }}>
          {publicStakingStatus?.isEnabled
            ? "Public staking is currently enabled. Users can stake freely."
            : "Public staking is currently disabled. Only admin can enable it."}
        </p>
        {publicStakingStatus?.isPending && (
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", fontStyle: "italic" }}>
            ⏳ A change is pending. Time to accept: {new Date(Number(publicStakingStatus.timeToAccept) * 1000).toLocaleString()}
          </p>
        )}
      </div>

      {/* Admin Panel - Only visible to admin */}
      {isAdmin && (
        <div style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          background: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
          border: "2px solid #7c3aed",
          borderRadius: "8px",
          color: "#fff"
        }}>
          <h4 style={{ margin: "0 0 0.75rem 0", fontWeight: "700" }}>🔐 Admin Controls</h4>
          <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem" }}>
            As the contract admin, you can toggle public staking on/off.
            This is a 2-step process with a timelock for security.
          </p>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {!publicStakingStatus?.isPending ? (
              <button
                onClick={preparePublicStakingChange}
                disabled={adminLoading}
                style={{
                  background: "#1e293b",
                  color: "#fff",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: adminLoading ? "not-allowed" : "pointer",
                  opacity: adminLoading ? 0.6 : 1,
                }}
              >
                {adminLoading ? "Processing..." : publicStakingStatus?.isEnabled ? "Prepare to Disable" : "Prepare to Enable"}
              </button>
            ) : (
              <>
                <button
                  onClick={confirmPublicStakingChange}
                  disabled={adminLoading}
                  style={{
                    background: "#10b981",
                    color: "#fff",
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    border: "none",
                    cursor: adminLoading ? "not-allowed" : "pointer",
                    opacity: adminLoading ? 0.6 : 1,
                  }}
                >
                  {adminLoading ? "Processing..." : "Confirm Change"}
                </button>
                <button
                  onClick={cancelPublicStakingChange}
                  disabled={adminLoading}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    border: "none",
                    cursor: adminLoading ? "not-allowed" : "pointer",
                    opacity: adminLoading ? 0.6 : 1,
                  }}
                >
                  {adminLoading ? "Processing..." : "Cancel Change"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Warning for non-admin users */}
      {!isAdmin && !publicStakingStatus?.isEnabled && (
        <div style={{
          marginBottom: "1rem",
          padding: "1rem",
          background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
          border: "2px solid #d97706",
          borderRadius: "8px",
          color: "#000"
        }}>
          <h4 style={{ margin: "0 0 0.5rem 0", fontWeight: "700" }}>⚠️ Public Staking Disabled</h4>
          <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>
            Public staking is currently <strong>disabled</strong>. Only the contract admin can enable it.
          </p>
          {deployment.admin && (
            <p style={{ margin: "0", fontSize: "0.85rem" }}>
              Admin address: <code style={{ background: "rgba(0,0,0,0.1)", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>
                {deployment.admin.substring(0, 6)}...{deployment.admin.substring(38)}
              </code>
            </p>
          )}
          {!deployment.admin && (
            <p style={{ margin: "0", fontSize: "0.85rem", fontStyle: "italic" }}>
              Admin address not configured. Run <code>npm run wizard</code> to set it up.
            </p>
          )}
        </div>
      )}

      <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
        Public staking allows any user to stake variable amounts. Each unit = 5,083 MATE tokens.
      </p>

      <StakingActionSelector onChange={setIsStaking} />

      <NumberInputWithGenerator
        label="Staking Nonce"
        inputId="nonceStakingInput_PublicStaking"
        placeholder="Enter nonce"
      />

      <NumberInputField
        label={isStaking ? "Number of sMATE to stake" : "Number of sMATE to unstake"}
        inputId="amountOfStakingInput_PublicStaking"
        placeholder="Enter number of sMATE (e.g., 1, 2, 3)"
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
