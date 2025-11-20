"use client";
import React from "react";
import { config } from "@/config/index";
import { getWalletClient, readContract } from "@wagmi/core";
import { useAccount } from "wagmi";

import {
  NumberInputWithGenerator,
  PrioritySelector,
  DataDisplayWithClear,
  HelperInfo,
  NumberInputField,
  StakingActionSelector,
} from "@/components/SigConstructors/InputsAndModules";

import { getAccountWithRetry } from "@/utils/getAccountWithRetry";

import {
  StakingSignatureBuilder,
  StakingABI,
  GoldenStakingInputData,
  PayInputData,
} from "@evvm/viem-signature-library";

import { executeGoldenStaking } from "@/utils/transactionExecuters/stakingExecuter";

type InfoData = {
  PayInputData: PayInputData;
  GoldenStakingInputData: GoldenStakingInputData;
};

interface GoldenStakingComponentProps {
  evvmID: string;
  stakingAddress: string;
}

export const GoldenStakingComponent = ({
  evvmID,
  stakingAddress,
}: GoldenStakingComponentProps) => {
  const { address } = useAccount();
  const [isStaking, setIsStaking] = React.useState(true);
  const [priority, setPriority] = React.useState("low");
  const [dataToGet, setDataToGet] = React.useState<InfoData | null>(null);
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);
  const [goldenFisherAddress, setGoldenFisherAddress] = React.useState<string>("");

  // Check if connected user is the golden fisher
  React.useEffect(() => {
    async function checkAuthorization() {
      if (!address) {
        setIsAuthorized(null);
        return;
      }

      try {
        const goldenFisher = await readContract(config, {
          address: stakingAddress as `0x${string}`,
          abi: StakingABI,
          functionName: "getGoldenFisher",
          args: [],
        });

        const goldenFisherAddr = goldenFisher as `0x${string}`;
        setGoldenFisherAddress(goldenFisherAddr);

        if (goldenFisherAddr.toLowerCase() === address.toLowerCase()) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Error checking golden fisher authorization:", error);
        setIsAuthorized(false);
      }
    }

    checkAuthorization();
  }, [address, stakingAddress]);

  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    const getValue = (id: string) =>
      (document.getElementById(id) as HTMLInputElement).value;

    const formData = {
      evvmID: evvmID,
      nonce: getValue("nonceInput_GoldenStaking"),
      stakingAddress: stakingAddress,
      amountOfStaking: Number(getValue("amountOfStakingInput_GoldenStaking")),
    };

    const amountOfToken =
      BigInt(formData.amountOfStaking) *
      (BigInt(5083) * BigInt(10) ** BigInt(18));

    // Sign and set data

    try {
      const walletClient = await getWalletClient(config);
      const signatureBuilder = new (StakingSignatureBuilder as any)(
        walletClient,
        walletData
      );

      console.log("=== GOLDEN STAKING SIGNATURE DEBUG ===");
      console.log("User address:", walletData.address);
      console.log("EVVM ID:", formData.evvmID);
      console.log("Staking address:", formData.stakingAddress);
      console.log("Is staking:", isStaking);
      console.log("Amount of staking:", formData.amountOfStaking);
      console.log("Amount of token (wei):", amountOfToken.toString());
      console.log("Nonce:", formData.nonce);
      console.log("Priority:", priority, "→ priorityFlag:", priority === "high");
      console.log("Expected signature message format:");
      console.log(`  ${formData.evvmID},pay,${formData.stakingAddress.toLowerCase()},0x0000000000000000000000000000000000000001,${amountOfToken.toString()},0,${formData.nonce},${priority === "high" ? "true" : "false"},${formData.stakingAddress.toLowerCase()}`);

      const signaturePay = await signatureBuilder.signGoldenStaking(
        BigInt(formData.evvmID),
        formData.stakingAddress as `0x${string}`,
        amountOfToken,
        BigInt(formData.nonce),
        priority === "high"
      );

      console.log("Signature created successfully:", signaturePay);
      console.log("=====================================");

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
      } as InfoData);
    } catch (error) {
      console.error("Error creating signature:", error);
      alert(`Failed to create signature: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const execute = async () => {
    if (!dataToGet) {
      console.error("No data to execute payment");
      alert("No signature data available. Please create a signature first.");
      return;
    }

    if (isAuthorized !== true) {
      alert("You are not authorized to execute golden staking. Only the Golden Fisher can perform this operation.");
      return;
    }

    const stakingAddress = dataToGet.PayInputData.to_address;

    console.log("=== EXECUTING GOLDEN STAKING ===");
    console.log("Golden Staking Input Data:", dataToGet.GoldenStakingInputData);
    console.log("Staking Address:", stakingAddress);
    console.log("================================");

    try {
      await executeGoldenStaking(dataToGet.GoldenStakingInputData, stakingAddress);
      console.log("✅ Golden staking executed successfully");
      alert("Golden staking transaction submitted successfully! Check your wallet for confirmation.");
      // Clear the form after successful execution
      setDataToGet(null);
    } catch (error) {
      console.error("❌ Error executing golden staking:", error);
      alert(`Transaction failed: ${error instanceof Error ? error.message : String(error)}\n\nCheck console for details.`);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <h1>Golden staking</h1>
      <br />

      {/* Authorization Status */}
      {isAuthorized === null && (
        <div style={{ padding: "1rem", marginBottom: "1rem", backgroundColor: "#f0f0f0", borderRadius: "0.5rem" }}>
          <p>⏳ Checking authorization...</p>
        </div>
      )}

      {isAuthorized === false && (
        <div style={{ padding: "1rem", marginBottom: "1rem", backgroundColor: "#ffe6e6", border: "1px solid #ff4444", borderRadius: "0.5rem" }}>
          <p style={{ fontWeight: "bold", color: "#cc0000" }}>⚠️ NOT AUTHORIZED</p>
          <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
            Only the designated Golden Fisher can use this function.
          </p>
          <p style={{ fontSize: "0.85rem", marginTop: "0.5rem", fontFamily: "monospace" }}>
            Golden Fisher: {goldenFisherAddress}
            <br />
            Your Address: {address}
          </p>
          <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
            Please use <strong>Presale Staking</strong> or <strong>Public Staking</strong> instead.
          </p>
        </div>
      )}

      {isAuthorized === true && (
        <div style={{ padding: "1rem", marginBottom: "1rem", backgroundColor: "#e6ffe6", border: "1px solid #44ff44", borderRadius: "0.5rem" }}>
          <p style={{ fontWeight: "bold", color: "#008800" }}>✅ AUTHORIZED</p>
          <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
            You are the Golden Fisher and can perform golden staking operations.
          </p>
        </div>
      )}

      {/* EVVM ID is now passed as a prop */}

      {/* stakingAddress is now passed as a prop */}

      {/* Configuration Section */}
      <StakingActionSelector onChange={setIsStaking} disabled={isAuthorized !== true} />

      {/* Basic input fields */}
      <NumberInputField
        label={
          isStaking
            ? "Amount of MATE to stake"
            : "Amount of MATE to unstake (sMATE)"
        }
        inputId="amountOfStakingInput_GoldenStaking"
        placeholder="Enter amount"
      />

      {/* Priority configuration */}
      <PrioritySelector onPriorityChange={setPriority} />

      {/* Nonce section with automatic generator */}

      <NumberInputWithGenerator
        label="Nonce"
        inputId="nonceInput_GoldenStaking"
        placeholder="Enter nonce"
        showRandomBtn={priority !== "low"}
      />

      <div>
        {priority === "low" && (
          <HelperInfo label="How to find my sync nonce?">
            <div>
              You can retrieve your next sync nonce from the EVVM contract using
              the <code>getNextCurrentSyncNonce</code> function.
              <br />
              <br />
              <strong>IMPORTANT:</strong> For sync (low priority) transactions, the nonce MUST match your current nextSyncUsedNonce at execution time. If you make another transaction before executing this golden staking, you will need to create a new signature with the updated nonce.
            </div>
          </HelperInfo>
        )}
      </div>

      {/* Create signature button */}
      <button
        onClick={makeSig}
        disabled={isAuthorized !== true}
        style={{
          padding: "0.5rem",
          marginTop: "1rem",
          opacity: isAuthorized !== true ? 0.5 : 1,
          cursor: isAuthorized !== true ? "not-allowed" : "pointer",
        }}
      >
        Create signature
      </button>

      {/* Results section */}
      <DataDisplayWithClear
        dataToGet={dataToGet}
        onClear={() => setDataToGet(null)}
        onExecute={execute}
      />
    </div>
  );
};
