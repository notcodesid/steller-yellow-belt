import type { PollData } from "../lib/soroban";

interface Props {
  poll: PollData;
  address: string | null;
  selected: number | null;
  hasVoted: boolean;
  busy: boolean;
  onSelect: (index: number) => void;
  onVote: () => void;
  onClose: () => void;
}

export function PollCard({
  poll,
  address,
  selected,
  hasVoted,
  busy,
  onSelect,
  onVote,
  onClose,
}: Props) {
  const open = poll.status === "Open";
  const total = poll.total_votes;
  const isAdmin = address != null && poll.admin === address;

  const pct = (count: number) => (total === 0 ? 0 : (count / total) * 100);
  const max = Math.max(...poll.votes, 1);

  const canVote = open && !hasVoted && address != null;
  const closedWithVotes = !open && total > 0;

  return (
    <div className="card">
      <div className="poll-head">
        <h2>{poll.question}</h2>
        <span className={`badge ${open ? "open" : "closed"}`}>
          {open ? "Open" : "Closed"}
        </span>
      </div>

      <p className="poll-meta">
        {total} vote{total === 1 ? "" : "s"} · created by{" "}
        <span className="mono">{poll.admin.slice(0, 6)}…</span>
      </p>

      {poll.options.map((option, i) => {
        const count = poll.votes[i] ?? 0;
        const winning = count === max && total > 0;
        return (
          <button
            key={i}
            className={`option ${selected === i ? "selected" : ""}`}
            style={{ "--pct": `${pct(count)}%` } as React.CSSProperties}
            onClick={() => canVote && onSelect(i)}
            disabled={!canVote}
            aria-pressed={selected === i}
          >
            <span className="bar" />
            <span className="content">
              <span className="label">
                <span className="idx">{i + 1}</span>
                {option}
                {winning && <span title="Leading">👑</span>}
              </span>
              <span className="stats">
                <span className="count">{count}</span>
                <span className="pct">{total === 0 ? "—" : `${pct(count).toFixed(0)}%`}</span>
              </span>
            </span>
          </button>
        );
      })}

      <div className="vote-actions">
        {hasVoted && open && (
          <div className="voted-note">✓ You have already voted — thanks!</div>
        )}
        {!hasVoted && open && !address && (
          <div className="hint">Connect a wallet to cast your vote.</div>
        )}
        {open && !hasVoted && (
          <button
            className="btn btn-primary"
            onClick={onVote}
            disabled={busy || selected === null}
          >
            {busy
              ? "Submitting transaction…"
              : selected === null
                ? "Select an option to vote"
                : `Vote for ${poll.options[selected]}`}
          </button>
        )}
        {!open && closedWithVotes && (
          <div className="voted-note">Poll closed — final results above.</div>
        )}
        {isAdmin && open && (
          <button
            className="btn btn-sm btn-danger"
            onClick={onClose}
            disabled={busy}
          >
            Close poll (admin)
          </button>
        )}
      </div>
    </div>
  );
}
