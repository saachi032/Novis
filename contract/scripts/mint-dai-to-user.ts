import "dotenv/config";
import { network } from "hardhat";
import { privateKeyToAccount } from "viem/accounts";
import type { Address } from "viem";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

async function main() {
  const daiAddress = "0x89d50c47066b207d68a1a0decff41ebbdda441a2" as Address;
  const userAddress = "0x73Fa5dBc79e5e9c46C2ce74763F697B6b7C8fD7a" as Address;
  const amount = BigInt("1000") * BigInt(10) ** BigInt(18);

  console.log("Minting MockDAI...");
  console.log(`DAI Contract: ${daiAddress}`);
  console.log(`Recipient: ${userAddress}`);
  console.log(`Amount: 1000 DAI`);

  try {
    const privateKey = requireEnv("PRIVATE_KEY");
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const { viem } = await network.connect();
    const publicClient = await viem.getPublicClient();
    
    // Create a wallet client with the account
    const walletClient = await viem.getWalletClient();
    const accountClient = walletClient.extend(() => ({
      account
    }));

    // Contract ABI for mint function
    const mintAbi = [
      {
        name: "mint",
        type: "function",
        stateMutability: "nonpayable" as const,
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" }
        ],
        outputs: []
      }
    ] as const;

    const txHash = await accountClient.writeContract({
      address: daiAddress,
      abi: mintAbi,
      functionName: "mint",
      args: [userAddress, amount],
      account
    });

    console.log(`\n⏳ Transaction sent: ${txHash}`);
    console.log("Waiting for confirmation...\n");

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    console.log("✅ SUCCESS!");
    console.log(`Transaction: ${receipt.transactionHash}`);
    console.log(`Block: ${receipt.blockNumber}`);
    console.log(`Status: ${receipt.status}`);
    console.log(`\n📊 Balance Update:`);
    console.log(`   Address: ${userAddress}`);
    console.log(`   Amount: 1000 DAI`);
    console.log(`\n🔗 View on Basescan:`);
    console.log(`   https://sepolia.basescan.org/tx/${receipt.transactionHash}`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
