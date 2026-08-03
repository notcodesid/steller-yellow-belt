import { useCallback, useEffect, useRef, useState } from "react";

import { ActivityFeed } from "./components/ActivityFeed";
import { ErrorBanner } from "./components/ErrorBanner";
import { PollCard } from "./components/PollCard";
import { TxStatus, type TxRecord } from "./components/TxStatus";
import { WalletConnect } from "./components/WalletConnect";
import { CONTRACT_ID, explorerContract } from "./config";
import { fetchPollEvents, type PollEvent } from "./lib/events";
import { classifyError, ErrorType, type AppError } from "./lib/errors";
import { getPoll, hasVoted, invokeAndTrack, type PollData } from "./lib/soroban";
import {
  connectWallet,
  disconnectWallet,
  getStoredWalletAddress,
  onKitStateChanged,
} from "./lib/wallets";

const POLL_INTERVAL_MS = 5_000;

export default function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const [poll, setPoll] = useState<PollData | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hasVotedFlag, setHasVotedFlag] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  const [activeTab, setActiveTab] = useState<"activity" | "txs">("activity");
  const [feed, setFeed] = useState<PollEvent[]>([]);
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [error, setError] = useState<AppError | null>(null);

  const eventCursor = useRef<string | null>(null);
  const seenEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const refreshPoll = useCallback(async () => {
    const data = await getPoll();
    setPoll(data);
  }, []);

  const refreshHasVoted = useCallback(async (who: string) => {
    try {
      setHasVotedFlag(await hasVoted(who));
    } catch {
      setHasVotedFlag(false);
    }
  }, []);

  const pollEvents = useCallback(async () => {
    try {
      const { events, cursor } = await fetchPollEvents(eventCursor.current ?? undefined);
      eventCursor.current = cursor;
      const incoming: PollEvent[] = [];
      for (const event of events) {
        if (seenEvents.current.has(event.id)) continue;
        seenEvents.current.add(event.id);
        incoming.push(event);
      }
      if (incoming.length > 0) {
        setFeed((prev) => [...incoming.reverse(), ...prev].slice(0, 60));
        refreshPoll().catch(() => {});
      }
    } catch {
      /* transient RPC errors are ignored on the polling loop */
    }
  }, [refreshPoll]);

  // Restore a previous kit session (if the wallet persisted one).
  useEffect(() => {
    let cancelled = false;
    getStoredWalletAddress()
      .then((addr) => {
        if (!cancelled) setAddress(addr);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // React to kit state changes (wallet switched / disconnected).
  useEffect(() => {
    return onKitStateChanged((addr) => {
      setAddress(addr ?? null);
      if (!addr) {
        setHasVotedFlag(false);
        setSelected(null);
      }
    });
  }, []);

  // Refresh the user's vote state whenever the connected account changes.
  useEffect(() => {
    if (address) refreshHasVoted(address);
    else setHasVotedFlag(false);
  }, [address, refreshHasVoted]);

  // Load poll + start the real-time loops (poll refresh + event stream).
  useEffect(() => {
    refreshPoll().catch(() => {});
    pollEvents().catch(() => {});

    const pollTimer = setInterval(() => refreshPoll().catch(() => {}), POLL_INTERVAL_MS);
    const eventTimer = setInterval(() => pollEvents().catch(() => {}), POLL_INTERVAL_MS);
    return () => {
      clearInterval(pollTimer);
      clearInterval(eventTimer);
    };
  }, [refreshPoll, pollEvents]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      setSelected(null);
    } catch (err) {
      setError(classifyError(err, ErrorType.WALLET_NOT_FOUND));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
    } catch {
      /* ignore */
    }
    setAddress(null);
    setHasVotedFlag(false);
    setSelected(null);
  };

  const markTx = (hash: string, action: string, status: TxRecord["status"]) => {
    setTxs((prev) => {
      const existing = prev.some((t) => t.hash === hash);
      if (existing) {
        return prev.map((t) => (t.hash === hash ? { ...t, status } : t));
      }
      return [{ hash, action, status, at: Date.now() }, ...prev].slice(0, 20);
    });
  };

  const handleVote = async () => {
    if (!address) {
      setError(classifyError(new Error("Connect a wallet before voting."), ErrorType.NOT_CONNECTED));
      return;
    }
    if (selected === null) return;

    setBusy(true);
    setError(null);
    let hash: string | null = null;
    try {
      await invokeAndTrack("vote", [address, selected], address, (h) => {
        hash = h;
        markTx(h, `vote → ${poll?.options[selected] ?? selected}`, "pending");
      });
      if (hash) markTx(hash, `vote → ${poll?.options[selected] ?? selected}`, "success");
      setSelected(null);
      await refreshPoll();
      await refreshHasVoted(address);
    } catch (err) {
      const appError = classifyError(err);
      setError(appError);
      if (hash) markTx(hash, "vote", "failed");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!address) {
      setError(classifyError(new Error("Connect a wallet first."), ErrorType.NOT_CONNECTED));
      return;
    }
    setBusy(true);
    setError(null);
    let hash: string | null = null;
    try {
      await invokeAndTrack("close", [address], address, (h) => {
        hash = h;
        markTx(h, "close poll", "pending");
      });
      if (hash) markTx(hash, "close poll", "success");
      await refreshPoll();
    } catch (err) {
      const appError = classifyError(err);
      setError(appError);
      if (hash) markTx(hash, "close poll", "failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">live poll</span>
        </div>
        <div className="header-actions">
          <button
            className="btn-connect"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <span>{theme === "dark" ? "light" : "dark"}</span>
          </button>
          <WalletConnect
            address={address}
            connecting={connecting}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </header>

      <div className="hero-section">
        <div className="hero-badge">✦</div>
        <h1 className="hero-title">real-time on-chain voting</h1>
        <p className="hero-subtitle">
          built on stellar soroban — vote live, stream contract events.
        </p>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <main className="grid">
        {poll ? (
          <PollCard
            poll={poll}
            address={address}
            selected={selected}
            hasVoted={hasVotedFlag}
            busy={busy}
            onSelect={setSelected}
            onVote={handleVote}
            onClose={handleClose}
          />
        ) : (
          <div className="card">
            <p className="empty">Loading poll from the contract…</p>
          </div>
        )}

        <div className="tab-section">
          <div className="tab-nav">
            <button
              className={`tab-item ${activeTab === "activity" ? "active" : ""}`}
              onClick={() => setActiveTab("activity")}
            >
              Activity feed ({feed.length})
            </button>
            <button
              className={`tab-item ${activeTab === "txs" ? "active" : ""}`}
              onClick={() => setActiveTab("txs")}
            >
              Transactions ({txs.length})
            </button>
          </div>

          {activeTab === "activity" ? (
            <ActivityFeed events={feed} poll={poll} />
          ) : (
            <TxStatus txs={txs} />
          )}
        </div>
      </main>

      <footer className="footer">
        <div>
          <strong>Contract</strong>{" "}
          <a href={explorerContract(CONTRACT_ID)} target="_blank" rel="noreferrer">
            {CONTRACT_ID}
          </a>
        </div>
        <div className="kbd">
          Level 2 · Yellow Belt — multi-wallet integration, Soroban contract, real-time events.
        </div>
      </footer>
    </div>
  );
}
