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
    <div className="card poll-card">
      <div className="poll-head">
        <h2>{poll.question}</h2>
        <span className={`badge ${open ? "open" : "closed"}`}>
          {open ? "Open" : "Closed"}
        </span>
      </div>

      <p className="poll-meta">
        {total} vote{total === 1 ? "" : "s"} · created by{" "}
        <span className="mono">{poll.admin.slice(0, 6)}…{poll.admin.slice(-4)}</span>
      </p>

      {/* Signal Chat Style Option Chips */}
      <div className="chips-wrap">
        {poll.options.map((option, i) => {
          const count = poll.votes[i] ?? 0;
          const winning = count === max && total > 0;
          return (
            <button
              key={i}
              className={`option-chip ${selected === i ? "selected" : ""}`}
              style={{ "--pct": `${pct(count)}%` } as React.CSSProperties}
              onClick={() => canVote && onSelect(i)}
              disabled={!canVote}
              aria-pressed={selected === i}
            >
              <span className="bar" />
              <span className="content">
                <span>{option}</span>
                {winning && <span className="leading-tag" title="Leading option">Leading</span>}
                <span className="stats">
                  {total === 0 ? "" : `${pct(count).toFixed(0)}%`}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Signal Chat Floating Action Bar */}
      {open && !hasVoted && (
        <div className={`floating-bar ${selected !== null ? "active" : ""}`}>
          <span className={`prompt-text ${selected !== null ? "selected" : ""}`}>
            {busy
              ? "Submitting transaction..."
              : !address
                ? "Connect a wallet to cast your vote..."
                : selected === null
                  ? "Select an option above to vote..."
                  : `Vote for "${poll.options[selected]}"`}
          </span>
          <button
            className="btn-submit-circle"
            onClick={onVote}
            disabled={busy || selected === null || !address}
            title={selected !== null ? `Submit vote for ${poll.options[selected]}` : "Select an option first"}
            aria-label="Submit vote"
          >
            ↑
          </button>
        </div>
      )}

      {hasVoted && open && (
        <div className="voted-note">✓ You have already voted on this poll</div>
      )}

      {!open && closedWithVotes && (
        <div className="voted-note">Poll closed — final results displayed above</div>
      )}

      {isAdmin && open && (
        <button
          className="btn btn-sm btn-danger"
          style={{ marginTop: 20 }}
          onClick={onClose}
          disabled={busy}
        >
          Close poll (admin)
        </button>
      )}
    </div>
  );
}
