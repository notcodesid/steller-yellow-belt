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

  if (address) {
    return (
      <div className="wallet-box">
        <button
          className="btn-connect connected"
          onClick={onDisconnect}
          title="Click to disconnect wallet"
        >
          <span className="mono">{shortAddress(address)}</span>
          <span className="chevron">›</span>
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-box">
      <button
        className="btn-connect"
        onClick={onConnect}
        disabled={connecting}
      >
        <span>{connecting ? "connecting…" : "connect"}</span>
        <span className="chevron">›</span>
      </button>
    </div>
  );
}
