export enum ErrorType {
  WALLET_NOT_FOUND = "wallet-not-found",
  WALLET_REJECTED = "wallet-rejected",
  INSUFFICIENT_BALANCE = "insufficient-balance",
  NOT_CONNECTED = "not-connected",
  CONTRACT = "contract",
  NETWORK = "network",
}

export interface ErrorMeta {
  type: ErrorType;
  title: string;
  message: string;
  original?: unknown;
}

export class AppError extends Error {
  type: ErrorType;
  title: string;
  original?: unknown;

  constructor(meta: ErrorMeta) {
    super(meta.message);
    this.name = "AppError";
    this.type = meta.type;
    this.title = meta.title;
    this.original = meta.original;
  }
}

const CONTRACT_ERROR_CODES: Record<number, string> = {
  0: "AlreadyInitialized - the poll already exists",
  1: "NotInitialized - no poll exists yet",
  2: "NotAdmin - only the poll admin can do this",
  3: "InvalidOptions - polls need between 2 and 10 options",
  4: "InvalidOption - that option does not exist",
  5: "AlreadyVoted - this wallet has already voted",
  6: "PollClosed - the poll is closed",
};

export function parseContractErrorCode(message: string): string | null {
  const match = /Error\(Contract,\s*#(\d+)\)/.exec(message);
  if (!match) return null;
  const code = Number(match[1]);
  return CONTRACT_ERROR_CODES[code] ?? `Contract error #${code}`;
}

const WALLET_NOT_FOUND =
  /wallet.*(not found|not installed|not available|not detected)|no wallet|module.*not.*(found|available|supported)|wallet.*unavailable|getPublicKey|freighter.*not|rabet.*not/i;

const WALLET_REJECTED =
  /(user|could not).*(declined|denied|reject|cancel)|rejected|denied|canceled|cancelled by user|request.*rejected|the user.*cancel|declined by user/i;

const INSUFFICIENT_BALANCE =
  /insufficient.*balance|insufficient funds|below.*minimum|account.*not.*funded|not funded|fee.*insufficient|txn_insufficient_balance|could not (pay|cover).*fee/i;

const NOT_CONNECTED =
  /no.*address|not connected|no active|no.*wallet.*connected|undefined address/i;

export function classifyError(error: unknown, fallbackType: ErrorType = ErrorType.CONTRACT): AppError {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);

  let type = fallbackType;
  let title = "Something went wrong";

  if (parseContractErrorCode(message)) {
    type = ErrorType.CONTRACT;
    title = "Contract rejected the call";
  } else if (INSUFFICIENT_BALANCE.test(message)) {
    type = ErrorType.INSUFFICIENT_BALANCE;
    title = "Insufficient balance";
  } else if (WALLET_REJECTED.test(message)) {
    type = ErrorType.WALLET_REJECTED;
    title = "Request rejected";
  } else if (WALLET_NOT_FOUND.test(message)) {
    type = ErrorType.WALLET_NOT_FOUND;
    title = "Wallet not found";
  } else if (NOT_CONNECTED.test(message)) {
    type = ErrorType.NOT_CONNECTED;
    title = "Wallet not connected";
  } else if (/network|fetch failed|failed to fetch|rpc|timeout|connect|offline|ECONN/i.test(message)) {
    type = ErrorType.NETWORK;
    title = "Network error";
  }

  const contractDetail = parseContractErrorCode(message);
  const detail = contractDetail ?? message;
  return new AppError({ type, title, message: detail, original: error });
}
