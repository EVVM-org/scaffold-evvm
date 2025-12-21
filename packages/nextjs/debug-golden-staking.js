/**
 * Debug script to manually construct and verify golden staking signature
 * Run this in browser console at localhost:3000
 */

const evvmID = "1060";
const stakingAddress = "0x44dbe1335f239034a8c07c065fc64fb13f42e1de";
const mateToken = "0x0000000000000000000000000000000000000001";
const amountOfFishers = 1;
const amountOfMate = BigInt(amountOfFishers) * (BigInt(5083) * BigInt(10) ** BigInt(18));
const priorityFee = "0";
const nonce = "0";
const priorityFlag = "false";
const executor = stakingAddress;

// Construct the message exactly as the library should
const message = `${evvmID},pay,${stakingAddress.toLowerCase()},${mateToken},${amountOfMate.toString()},${priorityFee},${nonce},${priorityFlag},${executor.toLowerCase()}`;

console.log("=== GOLDEN STAKING DEBUG ===");
console.log("Message to sign:");
console.log(message);
console.log("\nExpected format:");
console.log("{evvmID},pay,{to},{token},{amount},{priorityFee},{nonce},{priorityFlag},{executor}");
console.log("\nBreakdown:");
console.log("- evvmID:", evvmID);
console.log("- action: pay");
console.log("- to (staking contract):", stakingAddress.toLowerCase());
console.log("- token (MATE):", mateToken);
console.log("- amount:", amountOfMate.toString(), "wei =", amountOfFishers * 5083, "MATE");
console.log("- priorityFee:", priorityFee);
console.log("- nonce:", nonce);
console.log("- priorityFlag:", priorityFlag);
console.log("- executor (staking contract):", executor.toLowerCase());
console.log("\nTo test in browser:");
console.log("1. Connect your wallet");
console.log("2. Run: await window.ethereum.request({ method: 'personal_sign', params: ['" + message + "', '0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45'] })");
