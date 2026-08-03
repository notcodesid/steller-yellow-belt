import type { PollEvent } from "../lib/events";
import type { PollData } from "../lib/soroban";
import { explorerTx } from "../config";

interface Props {
  events: PollEvent[];
  poll: PollData | null;
}

export function ActivityFeed({ events, poll }: Props) {
  return (
    <div className="card">
      <p className="section-title">
        <span className="live-dot" />
        Live activity · contract events
      </p>
      {events.length === 0 ? (
        <p className="empty">Listening for events on {poll?.question ?? "the contract"}…</p>
      ) : (
        <div className="feed">
          {events.map((event) => (
            <div className="feed-item" key={event.id}>
              <span className="dot2" />
              <span>
                {event.kind === "created" && (
                  <>Poll created on-chain</>
                )}
                {event.kind === "vote_cast" && (
                  <>
                    <b className="mono">
                      {event.voter?.slice(0, 5)}…{event.voter?.slice(-4)}
                    </b>{" "}
                    voted for{" "}
                    <b>{poll?.options[event.optionIndex ?? -1] ?? `option ${event.optionIndex}`}</b>
                    {" "}· total {event.totalVotes}
                  </>
                )}
                {event.kind === "closed" && <>Poll closed by admin</>}
                {event.kind === "other" && <>Unknown event</>}
              </span>
              <span className="time">
                <a href={explorerTx(event.txHash)} target="_blank" rel="noreferrer">
                  tx
                </a>{" "}
                · ledger {event.ledger}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
