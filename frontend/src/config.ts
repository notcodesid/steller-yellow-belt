const env = import.meta.env as Record<string, string | undefined>;

export const RPC_URL = env.VITE_RPC_URL ?? "https://soroban-testnet.stellar.org";

export const CONTRACT_ID =
  env.VITE_CONTRACT_ID ??
  "CCU26EA7ACSP2A7SRVPGKNSBEZ6OKOXWU4XIDYLCH73W34MFDUH5IJTZ";

export const ADMIN_ADDRESS =
  env.VITE_ADMIN_ADDRESS ??
  "GBZQH26BVZ3T7AFAPULBNFUSB6A2O2X6IBQ4AGOZHMYUSJSSRPJAWLMD";

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export const NETWORK_NAME = "testnet";

/** Ledger in which the poll was initialized (seed for the live event stream). */
export const START_LEDGER = 3936354;

export const explorerTx = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;

export const explorerAccount = (address: string) =>
  `https://stellar.expert/explorer/testnet/account/${address}`;

export const explorerContract = (contractId: string) =>
  `https://stellar.expert/explorer/testnet/contract/${contractId}`;
