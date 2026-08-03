import {
  Address,
  Contract,
  rpc,
  SorobanDataBuilder,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";

import { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL } from "../config";
import { classifyError } from "./errors";
import { signTransactionXdr } from "./wallets";

export interface PollData {
  admin: string;
  question: string;
  options: string[];
  votes: number[];
  total_votes: number;
  status: "Open" | "Closed";
}

export interface TxReceipt {
  hash: string;
  status: "SUCCESS" | "FAILED";
}

const server = new rpc.Server(RPC_URL);
const contract = new Contract(CONTRACT_ID);

function scvU32(value: number) {
  return nativeToScVal(value, { type: "u32" });
}

export async function getPoll(): Promise<PollData> {
  try {
    const { result } = await server.queryContract<PollData>(
      CONTRACT_ID,
      "get_poll",
      undefined,
      NETWORK_PASSPHRASE,
    );
    return normalizePoll(result);
  } catch (error) {
    throw classifyError(error);
  }
}

export async function hasVoted(address: string): Promise<boolean> {
  try {
    const { result } = await server.queryContract<boolean>(
      CONTRACT_ID,
      "has_voted",
      { voter: address },
      NETWORK_PASSPHRASE,
    );
    return Boolean(result);
  } catch (error) {
    throw classifyError(error);
  }
}

/**
 * Invoke a state-changing contract method: build -> simulate -> wallet-sign ->
 * submit -> wait for final status. Returns the final transaction receipt.
 */
export async function invokeAndTrack(
  method: "vote" | "close",
  args: [voter: string, optionIndex: number] | [admin: string],
  sourceAddress: string,
  onPending?: (hash: string) => void,
): Promise<TxReceipt> {
  try {
    const account = await server.getAccount(sourceAddress);
    const builder = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
      sorobanData: new SorobanDataBuilder().build(),
    });

    if (method === "vote") {
      const [voter, optionIndex] = args as [string, number];
      builder.addOperation(
        contract.call("vote", new Address(voter).toScVal(), scvU32(optionIndex)),
      );
    } else {
      const [admin] = args as [string];
      builder.addOperation(contract.call("close", new Address(admin).toScVal()));
    }

    const base = builder.setTimeout(0).build();
    const prepared = await server.prepareTransaction(base);
    const signedXdr = await signTransactionXdr(prepared.toXDR(), sourceAddress);
    const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    const sendResponse = await server.sendTransaction(tx);
    if (sendResponse.status === "ERROR") {
      throw new Error("Transaction was rejected by the network before submission");
    }

    const hash = sendResponse.hash;
    onPending?.(hash);

    const result = await server.pollTransaction(hash, { attempts: 40 });
    if (result.status === "FAILED") {
      throw new Error(
        "Transaction failed on-chain. The simulate step passed, but execution reverted — check the explorer for details.",
      );
    }
    if (result.status !== "SUCCESS") {
      throw new Error(`Transaction ended with status ${result.status}`);
    }
    return { hash, status: result.status };
  } catch (error) {
    throw classifyError(error);
  }
}

function normalizePoll(raw: PollData): PollData {
  const statusRaw = raw.status as unknown;
  const status =
    statusRaw !== null && typeof statusRaw === "object" && "tag" in (statusRaw as object)
      ? ((statusRaw as { tag: string }).tag as PollData["status"])
      : (statusRaw as PollData["status"]);

  return {
    admin: raw.admin,
    question: raw.question,
    options: raw.options ?? [],
    votes: Array.isArray(raw.votes) ? raw.votes.map(Number) : [],
    total_votes: Number(raw.total_votes ?? 0),
    status: status === "Closed" ? "Closed" : "Open",
  };
}
