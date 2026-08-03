# Setup & Project Structure

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
