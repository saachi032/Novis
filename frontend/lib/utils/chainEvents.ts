import type { Abi, PublicClient } from "viem";

const DEFAULT_CHUNK_SIZE = 1_900n;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getContractEventsInChunks<TAbi extends Abi>({
  publicClient,
  address,
  abi,
  eventName,
  args,
  fromBlock,
  chunkSize = DEFAULT_CHUNK_SIZE,
}: {
  publicClient: PublicClient;
  address: `0x${string}`;
  abi: TAbi;
  eventName: string;
  args?: Record<string, unknown>;
  fromBlock?: bigint;
  chunkSize?: bigint;
}) {
  const latest = await publicClient.getBlockNumber();

  const start =
    fromBlock !== undefined
      ? fromBlock
      : latest > 2_000_000n
        ? latest - 2_000_000n
        : 0n;

  const events: any[] = [];
  let cursor = start;

  while (cursor <= latest) {
    const end = cursor + chunkSize - 1n > latest ? latest : cursor + chunkSize - 1n;
    let chunk: any[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        chunk = await publicClient.getContractEvents({
          address,
          abi,
          eventName: eventName as never,
          args: args as never,
          fromBlock: cursor,
          toBlock: end,
        });
        break;
      } catch (err) {
        const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
        const isRateLimit = message.includes("429") || message.includes("limit") || message.includes("range");
        if (!isRateLimit || attempt === 2) {
          throw err;
        }
        await sleep(1_000 * (attempt + 1));
      }
    }
    events.push(...(chunk as any[]));
    if (end === latest) break;
    cursor = end + 1n;
    await sleep(100);
  }

  return events;
}
