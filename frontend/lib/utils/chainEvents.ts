import type { Abi, PublicClient } from "viem";

/** Max safe chunk for Base Sepolia's 2,000-block log range limit. */
const DEFAULT_CHUNK_SIZE = 1_999n;

/** Only scan the most recent N blocks by default to avoid hundreds of RPC calls. */
const DEFAULT_MAX_BLOCKS = 50_000n;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchChunkWithRetry(
  publicClient: PublicClient,
  params: {
    address: `0x${string}`;
    abi: Abi;
    eventName: string;
    args?: Record<string, unknown>;
    fromBlock: bigint;
    toBlock: bigint;
  }
) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await publicClient.getContractEvents({
        address: params.address,
        abi: params.abi,
        eventName: params.eventName as never,
        args: params.args as never,
        fromBlock: params.fromBlock,
        toBlock: params.toBlock,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      const retryable =
        message.includes("429") ||
        message.includes("limit") ||
        message.includes("range") ||
        message.includes("timeout") ||
        message.includes("failed");
      if (!retryable || attempt === 3) throw err;
      await sleep(800 * (attempt + 1));
    }
  }
  return [];
}

export async function getContractEventsInChunks<TAbi extends Abi>({
  publicClient,
  address,
  abi,
  eventName,
  args,
  fromBlock,
  chunkSize = DEFAULT_CHUNK_SIZE,
  maxBlocks = DEFAULT_MAX_BLOCKS,
  signal,
}: {
  publicClient: PublicClient;
  address: `0x${string}`;
  abi: TAbi;
  eventName: string;
  args?: Record<string, unknown>;
  fromBlock?: bigint;
  chunkSize?: bigint;
  /** Cap the total number of blocks to scan (prevents hundreds of RPC calls). */
  maxBlocks?: bigint;
  /** AbortSignal — if aborted, stops fetching early and returns what we have. */
  signal?: AbortSignal;
}) {
  const latest = await publicClient.getBlockNumber();

  // Determine the start block.  If fromBlock is provided use it, otherwise
  // scan backwards from latest (capped by maxBlocks).
  let start: bigint;
  if (fromBlock !== undefined) {
    start = fromBlock;
  } else {
    start = latest > maxBlocks ? latest - maxBlocks : 0n;
  }

  // Also cap so we never scan more than maxBlocks from the start.
  const cappedStart = latest - start > maxBlocks ? latest - maxBlocks : start;

  const events: any[] = [];
  let cursor = cappedStart;
  let rpcCalls = 0;

  while (cursor <= latest) {
    // Respect abort signal — return what we have so far.
    if (signal?.aborted) break;

    const end = cursor + chunkSize - 1n > latest ? latest : cursor + chunkSize - 1n;
    rpcCalls++;
    const chunk = await fetchChunkWithRetry(publicClient, {
      address,
      abi,
      eventName,
      args,
      fromBlock: cursor,
      toBlock: end,
    });
    events.push(...(chunk as any[]));
    if (end === latest) break;
    cursor = end + 1n;
    // Small delay to avoid rate-limiting, but shorter than before
    if (rpcCalls % 5 === 0) await sleep(50);
  }

  if (rpcCalls > 10) {
    console.debug(`[chainEvents] ${eventName} @ ${address.slice(0, 10)}… — ${rpcCalls} RPC calls, ${events.length} events`);
  }

  return events;
}

/** Fetch the same event from multiple contract addresses (e.g. legacy vaults). */
export async function getContractEventsFromAddresses<TAbi extends Abi>({
  publicClient,
  addresses,
  abi,
  eventName,
  args,
  fromBlock,
  signal,
}: {
  publicClient: PublicClient;
  addresses: `0x${string}`[];
  abi: TAbi;
  eventName: string;
  args?: Record<string, unknown>;
  fromBlock?: bigint;
  signal?: AbortSignal;
}) {
  const all: any[] = [];
  for (const address of addresses) {
    if (signal?.aborted) break;
    const logs = await getContractEventsInChunks({
      publicClient,
      address,
      abi,
      eventName,
      args,
      fromBlock,
      signal,
    });
    all.push(...logs);
  }
  return all;
}
