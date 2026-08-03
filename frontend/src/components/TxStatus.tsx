import { explorerTx } from "../config";

export interface TxRecord {
  hash: string;
  action: string;
  status: "pending" | "success" | "failed";
  at: number;
}

interface Props {
  txs: TxRecord[];
}

export function TxStatus({ txs }: Props) {
  if (txs.length === 0) {
    return (
      <div className="card">
        <p className="section-title">Transaction status</p>
        <p className="empty">No transactions yet. Cast a vote to see live status.</p>
      </div>
    );
  }

  const pending = txs.filter((t) => t.status === "pending").length;

  return (
    <div className="card">
      <p className="section-title">
        Transaction status
        {pending > 0 && <span className="live-dot" title="Tx in flight" />}
      </p>
      <div className="tx-list">
        {txs.map((tx) => (
          <div className="tx-item" key={`${tx.hash}-${tx.at}`}>
            {tx.status === "pending" ? (
              <span className="spinner" />
            ) : (
              <span className={`tx-status ${tx.status}`}>{tx.status}</span>
            )}
            <span className="hash mono">{tx.action}</span>
            <a href={explorerTx(tx.hash)} target="_blank" rel="noreferrer">
              view →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
