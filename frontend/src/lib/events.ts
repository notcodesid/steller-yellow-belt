import { rpc, scValToNative, xdr } from "@stellar/stellar-sdk";

import { CONTRACT_ID, RPC_URL, START_LEDGER } from "../config";

export interface PollEvent {
  id: string;
  txHash: string;
  ledger: number;
  kind: "created" | "vote_cast" | "closed" | "other";
  voter?: string;
  optionIndex?: number;
  totalVotes?: number;
}

const server = new rpc.Server(RPC_URL);

function symbolB64(name: string): string {
  return xdr.ScVal.scvSymbol(name).toXDR("base64");
}

const FILTERS: rpc.Api.EventFilter[] = [
  {
    type: "contract",
    contractIds: [CONTRACT_ID],
    topics: [[symbolB64("created")]],
  },
  {
    type: "contract",
    contractIds: [CONTRACT_ID],
    topics: [[symbolB64("vote_cast"), "*"]],
  },
  {
    type: "contract",
    contractIds: [CONTRACT_ID],
    topics: [[symbolB64("closed")]],
  },
];

/**
 * Fetch our contract's poll events. First call seeds from START_LEDGER; pass
 * the returned cursor to continue paging forwards in later polls.
 */
export async function fetchPollEvents(
  cursor?: string,
): Promise<{ events: PollEvent[]; cursor: string }> {
  let currentCursor = cursor;
  const allEvents: PollEvent[] = [];
  let iterations = 0;
  const maxIterations = 20;

  while (iterations < maxIterations) {
    iterations++;
    const request: rpc.Api.GetEventsRequest = currentCursor
      ? { filters: FILTERS, cursor: currentCursor, limit: 100 }
      : { filters: FILTERS, startLedger: START_LEDGER, limit: 100 };

    const response = await server.getEvents(request);

    if (response.events && response.events.length > 0) {
      for (const raw of response.events) {
        if (!raw.inSuccessfulContractCall) continue;
        const parsed = parseEvent(raw);
        if (parsed) allEvents.push(parsed);
      }
    }

    if (
      !response.cursor ||
      response.cursor === currentCursor ||
      !response.events ||
      response.events.length === 0
    ) {
      if (response.cursor) currentCursor = response.cursor;
      break;
    }

    currentCursor = response.cursor;
  }

  return { events: allEvents, cursor: currentCursor ?? cursor ?? "" };
}

function parseEvent(raw: rpc.Api.EventResponse): PollEvent | null {
  try {
    const [first, ...rest] = raw.topic;
    const name = scValToNative(first) as string;

    if (name === "vote_cast") {
      const optionIndex = Number(scValToNative(rest[0]));
      const [voter, totalVotes] = scValToNative(raw.value) as [string, number];
      return {
        id: raw.id,
        txHash: raw.txHash,
        ledger: raw.ledger,
        kind: "vote_cast",
        voter,
        optionIndex,
        totalVotes: Number(totalVotes),
      };
    }
    if (name === "created") {
      return { id: raw.id, txHash: raw.txHash, ledger: raw.ledger, kind: "created" };
    }
    if (name === "closed") {
      return { id: raw.id, txHash: raw.txHash, ledger: raw.ledger, kind: "closed" };
    }
    return null;
  } catch {
    return null;
  }
}
