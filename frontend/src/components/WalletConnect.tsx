import { useEffect, useState } from "react";

import { getSupportedWallets } from "../lib/wallets";

interface Props {
  address: string | null;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function WalletConnect({ address, connecting, onConnect, onDisconnect }: Props) {
  const [wallets, setWallets] = useState<{ name: string; available: boolean }[]>([]);

  useEffect(() => {
    getSupportedWallets()
      .then((list) =>
        setWallets(list.map((w) => ({ name: w.name, available: w.isAvailable }))),
      )
      .catch(() => setWallets([]));
  }, []);

  if (address) {
    return (
      <div className="wallet-box">
        <span className="addr mono">{shortAddress(address)}</span>
        <button className="btn btn-sm" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-box">
      <button className="btn btn-primary" onClick={onConnect} disabled={connecting}>
        {connecting ? "Waiting for wallet…" : "Connect wallet"}
      </button>
      {wallets.length > 0 && (
        <div className="wallets-row">
          {wallets.slice(0, 8).map((w) => (
            <span className="wallet-chip" key={w.name} title={w.available ? "Available" : "Not installed"}>
              <span className={w.available ? "ok" : "no"} />
              {w.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
