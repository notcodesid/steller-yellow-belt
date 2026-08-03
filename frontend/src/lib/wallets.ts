import {
  StellarWalletsKit,
  Networks,
  KitEventType,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";

import { NETWORK_PASSPHRASE } from "../config";

export type { ISupportedWallet };

let initialized = false;

export function initKit(): void {
  if (initialized) return;
  StellarWalletsKit.init({
    modules: defaultModules(),
    network: Networks.TESTNET,
  });
  initialized = true;
}

export async function getStoredWalletAddress(): Promise<string> {
  const { address } = await StellarWalletsKit.getAddress();
  return address;
}

export async function connectWallet(): Promise<string> {
  initKit();
  const { address } = await StellarWalletsKit.authModal();
  return address;
}

export async function signTransactionXdr(txXdr: string, address: string): Promise<string> {
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  return signedTxXdr;
}

export async function disconnectWallet(): Promise<void> {
  await StellarWalletsKit.disconnect();
}

export function onKitStateChanged(callback: (address: string | undefined) => void): () => void {
  initKit();
  return StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event) => {
    callback(event.payload.address);
  });
}

export async function getSupportedWallets(): Promise<ISupportedWallet[]> {
  initKit();
  return StellarWalletsKit.refreshSupportedWallets();
}
