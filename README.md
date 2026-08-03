# Live Poll — Stellar Yellow Belt (Level 2)

A **real-time on-chain poll** built on Stellar (Soroban). Multi-wallet support,
a deployed testnet contract, live contract-event streaming, and full
transaction status tracking.

> Level 2 · Yellow Belt — multi-wallet integration, smart contract deployment,
> and real-time data synchronization.

---

## ✨ What it does

- **Multi-wallet integration** via [StellarWalletsKit v2](https://stellarwalletskit.dev) —
  Freighter, Albedo, xBull, Rabet, Lobstr, Hana, Hot Wallet, OneKey, Klever, Bitget and more,
  all through one API + one auth modal.
- **Deployed Soroban contract** on testnet (`live-poll`) — one question, up to 10
  options, one vote per wallet, admin can close.
- **Real-time event handling** — the frontend streams `created`, `vote_cast` and
  `closed` contract events via `getEvents` and syncs the poll state live.
- **Transaction status tracking** — every write goes through
  `pending → success / failed` with a link to Stellar Expert.

## ✅ Requirements coverage

| Requirement | Where |
| --- | --- |
| 3 error types handled | Wallet not found, user rejected, insufficient balance (+ contract errors, not connected, network) — see [Error handling](#-error-handling) |
| Contract deployed on testnet | `CCU26EA7ACSP2A7SRVPGKNSBEZ6OKOXWU4XIDYLCH73W34MFDUH5IJTZ` |
| Contract called from the frontend | `vote` / `close` writes + `get_poll` / `results` / `has_voted` reads via `rpc.Server` |
| Transaction status visible | Dedicated status panel: pending spinner → success / failed + explorer links |
| 2+ meaningful commits | This repo contains 4 feature commits |
| Multi-wallet app | StellarWalletsKit auth modal + wallet chips |
| Real-time event integration | Live activity feed streaming contract events |

---

## 🔗 Deployed on testnet

| Item | Value |
| --- | --- |
| **Contract** | `CCU26EA7ACSP2A7SRVPGKNSBEZ6OKOXWU4XIDYLCH73W34MFDUH5IJTZ` |
| Contract explorer | https://stellar.expert/explorer/testnet/contract/CCU26EA7ACSP2A7SRVPGKNSBEZ6OKOXWU4XIDYLCH73W34MFDUH5IJTZ |
| Poll admin | `GBZQH26BVZ3T7AFAPULBNFUSB6A2O2X6IBQ4AGOZHMYUSJSSRPJAWLMD` |
| Network | Test SDF Network ; September 2015 (testnet) |
| RPC | `https://soroban-testnet.stellar.org` |

### Verifiable transaction hashes

| Action | Transaction hash | Explorer |
| --- | --- | --- |
| Contract deploy | `96bf843af442d2e1e332cb2db64a719b629393201311a37cbb97b966eab4c7c9` | https://stellar.expert/explorer/testnet/tx/96bf843af442d2e1e332cb2db64a719b629393201311a37cbb97b966eab4c7c9 |
| `initialize` (poll created) | `e24477bbc3148265dd4acc59e80d880eaf76d6984384bba7ca39115ce59d3377` | https://stellar.expert/explorer/testnet/tx/e24477bbc3148265dd4acc59e80d880eaf76d6984384bba7ca39115ce59d3377 |
| `vote` (contract call from seed) | `048e8e6cbd102e275280708e27822656e952e354991f919d6871313f3580ed48` | https://stellar.expert/explorer/testnet/tx/048e8e6cbd102e275280708e27822656e952e354991f919d6871313f3580ed48 |
| `vote` (from the app via Freighter) | `37a59ed9e017c1216400f8d6a3b7aeba98ae38a720bee76236b7c38d5e7d6ba6` | https://stellar.expert/explorer/testnet/tx/37a59ed9e017c1216400f8d6a3b7aeba98ae38a720bee76236b7c38d5e7d6ba6 |

The `vote` hashes are contract calls made from the CLI and from the app. When you
vote from the app the transaction hash appears in the status panel and is
verifiable on Stellar Expert the same way.

### Live poll (as deployed)

> **Best Stellar track to build?** — Payments · DeFi · NFTs · Gaming

Current on-chain totals (verifiable via `get_poll`):

| Option | Votes |
| --- | --- |
| Payments | 0 |
| **DeFi** | **2** |
| NFTs | 0 |
| Gaming | 0 |

---

## 🖼 Screenshot: wallet options

Multi-wallet selection is provided by the StellarWalletsKit **auth modal** —
the `Connect wallet` button opens a wallet picker listing every supported wallet
(install label shown for ones not present). The header also shows availability
chips for the supported wallets.

> **To reproduce the required screenshot:** open the app → click **Connect wallet** →
> the auth modal with all wallet options appears.

![Wallet options modal](screenshots/wallet-options.png)

## 📸 Project structure

```
.
├── contract/                # Soroban smart contract (Rust)
│   ├── src/lib.rs           # live-poll contract + unit tests
│   ├── Cargo.toml
│   └── live_poll.wasm       # optimized build (deployed to testnet)
└── frontend/                # React + Vite + TypeScript app
    ├── src/
    │   ├── App.tsx          # state, real-time polling, tx tracking
    │   ├── config.ts        # contract id, RPC, explorer links
    │   ├── lib/
    │   │   ├── wallets.ts   # StellarWalletsKit setup (multi-wallet)
    │   │   ├── soroban.ts   # contract reads + writes via @stellar/stellar-sdk
    │   │   ├── events.ts    # contract event streaming (getEvents)
    │   │   └── errors.ts    # error classification (3+ types)
    │   └── components/      # PollCard, WalletConnect, TxStatus, ActivityFeed…
    └── package.json
```

---

## 🚀 Setup

### Prerequisites

- Node.js ≥ 20 and npm
- Rust ≥ 1.84 + `wasm32v1-none` target (only to build/deploy the contract)
- `stellar` CLI ≥ 25 (only to deploy/invoke)

### 1. Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Build for production:

```bash
npm run build
npm run preview
```

Optional env overrides (see `frontend/.env.example`):

```bash
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_CONTRACT_ID=CCU26EA7ACSP2A7SRVPGKNSBEZ6OKOXWU4XIDYLCH73W34MFDUH5IJTZ
VITE_ADMIN_ADDRESS=GBZQH26BVZ3T7AFAPULBNFUSB6A2O2X6IBQ4AGOZHMYUSJSSRPJAWLMD
```

### 2. Contract (build + test + redeploy)

```bash
cd contract
cargo test                            # run the 5 unit tests
stellar contract build --out-dir .   # produces optimized live_poll.wasm
```

To redeploy your own instance:

```bash
stellar keys generate my-admin --network testnet
stellar keys fund my-admin
stellar contract deploy \
  --wasm live_poll.wasm \
  --source my-admin \
  --network testnet
# → C… contract address

stellar contract invoke \
  --id <CONTRACT_ID> --source my-admin --network testnet -- \
  initialize --admin <MY_PUBLIC_KEY> \
  --question "Best Stellar track to build?" \
  --options '["Payments","DeFi","NFTs","Gaming"]'
```

Point `frontend/src/config.ts` (or env vars) at your new contract + admin, then
vote:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> --source my-admin --network testnet -- \
  vote --voter <MY_PUBLIC_KEY> --option_index 0
```

---

## ⚡ How it works

### Contract calls from the frontend (`src/lib/soroban.ts`)

- **Reads** use `server.queryContract(contractId, method, args)` (simulate-only, no fee).
- **Writes** (`vote`, `close`) build a `TransactionBuilder` + `Contract.call`,
  run `server.prepareTransaction` (simulation adds auth entries + resource fees),
  sign with the connected wallet via the kit, submit with `sendTransaction`, then
  wait with `pollTransaction`.

### Real-time events (`src/lib/events.ts`)

- Polls `server.getEvents` every 5 s filtered to our contract and the
  `created` / `vote_cast` / `closed` topics.
- First poll seeds from `START_LEDGER` (where the poll was initialized); later
  polls continue from the returned cursor.
- New events are deduped by event id and appended to the live feed; when a new
  `vote_cast` arrives, poll results are re-read so bars animate in real time.

### 🛑 Error handling (`src/lib/errors.ts`)

All errors are normalized into `AppError { type, title, message }`:

| Type | Trigger |
| --- | --- |
| `wallet-not-found` | No wallet installed / module unavailable |
| `wallet-rejected` | User closes the auth modal or declines the signature |
| `insufficient-balance` | Account below minimum balance / can't pay fees |
| `contract` | On-chain revert, e.g. `AlreadyVoted #5`, `InvalidOption #4`, `PollClosed #6`, `NotAdmin #2` |
| `not-connected` | Voting without a connected wallet |
| `network` | RPC unreachable / timeout |

Contract error codes are parsed from the simulation diagnostics and mapped to
human-readable messages.

---

## 📦 Tech stack

- **Contract:** Rust · Soroban SDK `25.1.0` · compiled to `wasm32v1-none`
- **Frontend:** React 19 · Vite · TypeScript
- **Blockchain SDK:** `@stellar/stellar-sdk` v16 (`rpc.Server`, `queryContract`, `getEvents`)
- **Wallets:** `@creit.tech/stellar-wallets-kit` v2 (multi-wallet auth modal)

## 🔗 Links

- Live demo: *(deploy `frontend/` to Vercel/Netlify and paste the URL here)*
- Repo: *(paste your GitHub URL here)*
- Stellar Expert: https://stellar.expert/explorer/testnet
