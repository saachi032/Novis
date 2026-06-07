# On-Chain HACKX: DeFi Yield Optimizer & Robo-Advisor

A non-custodial, intelligent yield optimizer built on **Base Sepolia**. This protocol automates USDC yield generation by dynamically routing liquidity across leading lending markets (Aave v3, Compound v3, Morpho Blue) based on individual user risk profiles.

## Architecture

The project consists of three main pillars: Smart Contracts, the Frontend Dashboard, and the Internal Indexer.

### 1. Smart Contracts
The protocol is powered by a set of modular smart contracts deployed on Base Sepolia:

- **`VaultManager` (ERC-4626)**: The primary entry point for users. It accepts USDC deposits, mints vault shares, and handles withdrawals/redemptions. 
- **`StrategyRouter`**: The core yield engine. It takes idle USDC from the vault and deploys it into underlying protocols (Aave, Compound, Morpho). It exposes a `rebalance()` function that keepers can call to move funds between protocols if APY rates shift.
- **`RiskRegistry`**: A registry that stores user-selected risk profiles (Conservative, Balanced, Aggressive) and desired rebalancing frequencies.
- **`FeeCollector`**: A standalone contract to manage protocol revenue.

### 2. Frontend Application
A stunning, fully responsive dashboard built with **Next.js 14 (App Router)**, **Tailwind CSS**, and **wagmi/viem**.

- **Dynamic Allocations**: Real-time visualization of where funds are deployed, split by percentage and actual dollar value, alongside live protocol APYs.
- **Risk-Grouped Deposits**: The portfolio groups historical deposits into risk buckets, making it easy to track performance based on strategy.
- **Rebalance History**: A detailed table tracking automated on-chain rebalances (e.g., when the protocol keeper moves funds from Aave to Morpho to chase better yields).
- **Graceful Fallbacks**: Features a robust withdrawal flow that attempts standard ERC-4626 withdrawals and automatically falls back to share redemptions if protocol liquidity constraints (demo mode) are encountered.

### 3. Internal MongoDB Indexer
Fetching raw blockchain event history via an RPC node for every page load is slow and triggers rate limits ("RPC hammering"). To solve this, the application features a custom, blazing-fast indexer built entirely inside Next.js using **MongoDB** and **Mongoose**.

- **On-Demand Sync**: When the frontend requests history via `/api/history`, the API checks the database's `SyncState`. It only asks the Base RPC for blocks that were minted *after* the last sync.
- **Raw Event Storage**: New events (`Deposit`, `Withdraw`, `UserFundsInvested`, `UserRebalanced`, etc.) are bulk-inserted into the `OnChainEvent` collection.
- **Instant Loads**: The frontend context (`OnChainHistoryContext.tsx`) reconstructs complex investment timelines, yield calculations, and split breakdowns instantly using the JSON provided by the database.

---

## Setup & Local Development

### Prerequisites
- Node.js (v18+)
- MongoDB running locally (or a free cluster on MongoDB Atlas)

### Installation

1. **Clone and Install**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Variables**
   Create a `.env.local` file in the `frontend` directory and provide your MongoDB connection string. For a local setup, use:
   ```env
   MONGODB_URI="mongodb://127.0.0.1:27017/on-chain-hackx"
   ```

3. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser. The first time you load the dashboard, the indexer will automatically scan Base Sepolia from block `40,085,385` to populate your database. Subsequent loads will be nearly instantaneous.

---

## Contract Addresses (Base Sepolia)
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **VaultManager**: `0x1694D4451Cf9463F998773C343d42342445F43eC`
- **StrategyRouter**: `0xA75a715818Aef85C3A5850cdF70C82C30C2487Cd`
- **RiskRegistry**: `0x745936b6ec8e9037C042623029Cd473B7aE01144`
- **FeeCollector**: `0x9Fde5B14A0e164edB333843Bf30b9f12DA0F0841`

## Built With
- **Next.js** (React Framework)
- **wagmi & viem** (Ethereum Hooks & RPC Client)
- **TailwindCSS** (Styling & Dark Mode)
- **MongoDB & Mongoose** (Database Indexer)
- **Base** (L2 Deployment)
