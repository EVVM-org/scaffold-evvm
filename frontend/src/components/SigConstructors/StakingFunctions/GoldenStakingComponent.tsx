"use client";
import React, { useEffect } from "react";
import { config } from "@/config/index";
import { getWalletClient } from "@wagmi/core";
import { useAccount, useChainId } from "wagmi";

import {
  NumberInputWithGenerator,
  PrioritySelector,
  DataDisplayWithClear,
  HelperInfo,
  NumberInputField,
  StakingActionSelector,
} from "@/components/SigConstructors/InputsAndModules";

import { getAccountWithRetry } from "@/utils/getAccountWithRetry";
import { getPublicClient } from "@/lib/viemClients";
import { readGoldenFisher } from "@/lib/evvmExecutors";

import {
  StakingSignatureBuilder,
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
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();

  const [isStaking, setIsStaking] = React.useState(true);
  const [priority, setPriority] = React.useState("low");
  const [dataToGet, setDataToGet] = React.useState<InfoData | null>(null);
  const [goldenFisherAddress, setGoldenFisherAddress] = React.useState<`0x${string}` | null>(null);
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);
  const [authCheckLoading, setAuthCheckLoading] = React.useState(false);

  // Check if connected user is the golden fisher
  useEffect(() => {
    async function checkAuthorization() {
      if (!connectedAddress || !stakingAddress || !chainId) {
        setIsAuthorized(null);
        return;
      }

      setAuthCheckLoading(true);
      try {
        const publicClient = getPublicClient(chainId);
        const goldenFisher = await readGoldenFisher(publicClient, stakingAddress as `0x${string}`);

        setGoldenFisherAddress(goldenFisher);

        // Compare addresses (case-insensitive)
        const authorized = goldenFisher.toLowerCase() === connectedAddress.toLowerCase();
        setIsAuthorized(authorized);

        if (!authorized) {
          console.warn(`⚠️ User ${connectedAddress} is not authorized for golden staking. Golden fisher: ${goldenFisher}`);
        }
      } catch (error) {
        console.error("Failed to check golden fisher authorization:", error);
        setIsAuthorized(null);
      } finally {
        setAuthCheckLoading(false);
      }
    }

    checkAuthorization();
  }, [connectedAddress, stakingAddress, chainId]);

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
      } as InfoData);
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
    <div className="flex flex-1 flex-col justify-center items-center">
      <h1>Golden staking</h1>
      <br />

      {/* Authorization Check */}
      {authCheckLoading && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          backgroundColor: "#fef3c7",
          border: "1px solid #f59e0b",
          borderRadius: "0.375rem",
          width: "100%",
          maxWidth: "600px",
        }}>
          <p>Checking authorization...</p>
        </div>
      )}

      {!authCheckLoading && isAuthorized === false && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          backgroundColor: "#fee2e2",
          border: "2px solid #dc2626",
          borderRadius: "0.375rem",
          width: "100%",
          maxWidth: "600px",
        }}>
          <h3 style={{ color: "#dc2626", marginBottom: "0.5rem", fontWeight: "bold" }}>
            ⚠️ Unauthorized Access
          </h3>
          <p style={{ marginBottom: "0.5rem" }}>
            Golden staking is restricted to the designated golden fisher address only.
          </p>
          <p style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}>
            <strong>Your address:</strong> {connectedAddress}
          </p>
          <p style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}>
            <strong>Golden fisher:</strong> {goldenFisherAddress}
          </p>
          <p style={{ fontSize: "0.875rem", color: "#7f1d1d" }}>
            If you attempt to execute golden staking, the transaction will fail with error: <code>SenderIsNotGoldenFisher()</code>
          </p>
          <p style={{ marginTop: "1rem", fontWeight: "bold" }}>
            💡 Consider using <a href="/evvm/staking" style={{ color: "#2563eb", textDecoration: "underline" }}>Public Staking</a> instead.
          </p>
        </div>
      )}

      {!authCheckLoading && isAuthorized === true && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          backgroundColor: "#d1fae5",
          border: "1px solid #10b981",
          borderRadius: "0.375rem",
          width: "100%",
          maxWidth: "600px",
        }}>
          <p style={{ color: "#065f46" }}>
            ✅ Authorized: You are the golden fisher and can perform golden staking operations.
          </p>
        </div>
      )}

      {/* EVVM ID is now passed as a prop */}

      {/* stakingAddress is now passed as a prop */}

      {/* Configuration Section */}
      <StakingActionSelector onChange={setIsStaking} />

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
            </div>
          </HelperInfo>
        )}
      </div>

      {/* Create signature button */}
      <button
        onClick={makeSig}
        disabled={isAuthorized === false || authCheckLoading}
        style={{
          padding: "0.5rem",
          marginTop: "1rem",
          opacity: (isAuthorized === false || authCheckLoading) ? 0.5 : 1,
          cursor: (isAuthorized === false || authCheckLoading) ? "not-allowed" : "pointer",
        }}
        title={isAuthorized === false ? "You must be the golden fisher to use this function" : ""}
      >
        {authCheckLoading ? "Checking authorization..." : "Create signature"}
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
