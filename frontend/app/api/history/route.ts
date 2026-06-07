import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import dbConnect from "@/lib/db/mongodb";
import { SyncState } from "@/lib/db/models/SyncState";
import { OnChainEvent } from "@/lib/db/models/OnChainEvent";
import { BASE_SEPOLIA_ADDRESSES, DEPLOYMENT_BLOCK, RPC_URL } from "@/lib/contracts";
import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";
import { RISK_REGISTRY_ABI } from "@/lib/abis/RiskRegistry";
import { getContractEventsInChunks } from "@/lib/utils/chainEvents";
import { getLegacyVaultManagers } from "@/lib/utils/deploymentBlock";

const CONTRACT_SYNC_KEY = "base-sepolia-history-v1";
const SYNC_CHUNK_SIZE = 1_999n;

// Setup public client using the RPC_URL from our contracts config
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

/**
 * Ensures the database is synced up to the latest block.
 * This runs very fast after the first sync since it only scans delta blocks.
 */
async function syncEvents() {
  await dbConnect();

  let syncState = await SyncState.findOne({ contractName: CONTRACT_SYNC_KEY });
  if (!syncState) {
    syncState = await SyncState.create({
      contractName: CONTRACT_SYNC_KEY,
      lastSyncedBlock: Number(DEPLOYMENT_BLOCK),
    });
  } else if (syncState.lastSyncedBlock < Number(DEPLOYMENT_BLOCK)) {
    // Fast forward to the new deployment block to avoid rate limiting from scanning old blocks
    syncState.lastSyncedBlock = Number(DEPLOYMENT_BLOCK);
    await syncState.save();
  }

  const latestBlock = await publicClient.getBlockNumber();
  const startBlock = BigInt(syncState.lastSyncedBlock + 1);

  // If already up to date, just return
  if (startBlock > latestBlock) {
    return;
  }

  const vaultAddresses = [
    BASE_SEPOLIA_ADDRESSES.vaultManager,
    ...getLegacyVaultManagers(),
  ];

  // Helper to fetch and map logs to DB models
  const fetchAndSave = async (
    address: `0x${string}` | `0x${string}`[],
    abi: any,
    eventName: string,
    userArgKey: string,
    extractArgs: (args: any) => any
  ) => {
    const addresses = Array.isArray(address) ? address : [address];
    let allLogs: any[] = [];
    
    // We don't want the 50,000 max block cap here; we want ALL blocks from startBlock to latest
    for (const addr of addresses) {
      const logs = await getContractEventsInChunks({
        publicClient: publicClient as any,
        address: addr,
        abi,
        eventName,
        fromBlock: startBlock,
        chunkSize: SYNC_CHUNK_SIZE,
        maxBlocks: latestBlock - startBlock + 1n, // Uncapped for indexer
      });
      allLogs.push(...logs);
    }

    if (allLogs.length === 0) return;

    // Cache timestamps
    const blockTimestamps = new Map<number, number>();
    for (const log of allLogs) {
      const bNum = Number(log.blockNumber);
      if (!blockTimestamps.has(bNum)) {
        const block = await publicClient.getBlock({ blockNumber: BigInt(bNum) });
        blockTimestamps.set(bNum, Number(block.timestamp) * 1000);
      }
    }

    // Convert to Mongoose docs
    const docs = allLogs.map((log) => {
      const bNum = Number(log.blockNumber);
      return {
        eventName,
        contractAddress: log.address.toLowerCase(),
        userAddress: (log.args[userArgKey] as string).toLowerCase(),
        transactionHash: log.transactionHash,
        blockNumber: bNum,
        timestamp: blockTimestamps.get(bNum),
        args: extractArgs(log.args),
      };
    });

    // Bulk insert, ignoring duplicates (since txHash is unique in Schema)
    try {
      await OnChainEvent.insertMany(docs, { ordered: false });
    } catch (err: any) {
      // E11000 is duplicate key error, which is expected if overlapping syncs occur
      if (err.code !== 11000) {
        console.error(`[Indexer] Error saving ${eventName}:`, err);
      }
    }
  };

  // Run fetches in parallel for speed
  await Promise.all([
    // StrategySet
    fetchAndSave(
      BASE_SEPOLIA_ADDRESSES.riskRegistry,
      RISK_REGISTRY_ABI,
      "StrategySet",
      "user",
      (args) => ({
        riskProfile: Number(args.riskProfile),
        checkingDuration: Number(args.checkingDuration),
      })
    ),
    // Deposit
    fetchAndSave(
      vaultAddresses,
      VAULT_MANAGER_ABI,
      "Deposit",
      "owner",
      (args) => ({
        assets: args.assets.toString(),
        shares: args.shares.toString(),
      })
    ),
    // Withdraw
    fetchAndSave(
      vaultAddresses,
      VAULT_MANAGER_ABI,
      "Withdraw",
      "owner",
      (args) => ({
        assets: args.assets.toString(),
        shares: args.shares.toString(),
      })
    ),
    // UserFundsInvested
    fetchAndSave(
      BASE_SEPOLIA_ADDRESSES.strategyRouter,
      STRATEGY_ROUTER_ABI,
      "UserFundsInvested",
      "user",
      (args) => ({
        amount: args.amount.toString(),
        toAave: args.toAave.toString(),
        toCompound: args.toCompound.toString(),
        toMorpho: args.toMorpho.toString(),
      })
    ),
    // UserFundsRedeemed
    fetchAndSave(
      BASE_SEPOLIA_ADDRESSES.strategyRouter,
      STRATEGY_ROUTER_ABI,
      "UserFundsRedeemed",
      "user",
      (args) => ({
        fromAave: args.fromAave.toString(),
        fromCompound: args.fromCompound.toString(),
        fromMorpho: args.fromMorpho.toString(),
      })
    ),
    // UserRebalanced
    fetchAndSave(
      BASE_SEPOLIA_ADDRESSES.strategyRouter,
      STRATEGY_ROUTER_ABI,
      "UserRebalanced",
      "user",
      (args) => ({
        amount: args.amount.toString(),
        fromProtocol: Number(args.fromProtocol),
        toProtocol: Number(args.toProtocol),
      })
    ),
  ]);

  // Update sync state
  syncState.lastSyncedBlock = Number(latestBlock);
  syncState.lastUpdatedAt = new Date();
  await syncState.save();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address")?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // 1. Sync the chain to DB (on-demand)
    await syncEvents();

    // 2. Fetch from DB
    const userEvents = await OnChainEvent.find({ userAddress: address }).sort({ timestamp: 1 }).lean();
    
    // We also need all StrategySet logs for this user to reconstruct their history correctly
    // Wait, the above query already filters by userAddress, which includes StrategySet!
    
    return NextResponse.json({
      timestamp: Date.now(),
      events: userEvents,
    });
  } catch (error: any) {
    console.error("[API History] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
