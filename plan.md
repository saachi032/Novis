# DeFi Yield Optimizer Vault — Product Requirements Document

**Version:** 1.0 | **Status:** Draft | **Date:** April 2026  
**Target Network:** Base (L2) | **Stack:** Solidity + Next.js

---

## 1. Project Summary

A smart contract-based, non-custodial vault that automatically allocates user-deposited USDC across DeFi lending protocols (Aave v3 and Compound v3) to maximize yield. The system monitors real-time on-chain interest rates and rebalances capital only when expected profit exceeds gas cost.

> **Pitch:** "An on-chain robo-advisor that optimizes yield by dynamically allocating user funds across DeFi lending protocols. It continuously monitors on-chain interest rates and rebalances capital only when the expected profit exceeds transaction costs."

---

## 2. Goals

- Maximize user yield through automated, intelligent capital allocation
- Ensure every rebalance is net-positive (yield gain > gas cost)
- Provide a transparent, auditable, non-custodial vault
- Deliver a real-time dashboard showing APY, allocation, and user balance
- Keep the system extensible for new protocols and strategies

---

## 3. User Personas

### Primary — Passive DeFi Investor
- Wants best passive yield on USDC without daily management
- Intermediate DeFi experience (has used Aave/Compound)
- Needs: set-and-forget vault, real-time APY, safe withdrawal anytime

### Secondary — DeFi Power User
- Wants control over risk level and allocation strategy
- Advanced experience (familiar with ERC-4626, Chainlink, protocol APIs)
- Needs: risk selector, fee transparency, strategy auditability

---

## 4. Scope

### In Scope (MVP)
- ERC-4626 compliant USDC vault (deposit, withdraw, shares)
- Yield fetching from Aave v3 and Compound v3 (on-chain reads)
- Threshold-based automated rebalancing via Chainlink Automation
- Gas-profitability check before every rebalance
- Next.js frontend: real-time APY, allocation %, user balance
- Wallet connection via RainbowKit (MetaMask, WalletConnect)
- Hardhat deployment pipeline targeting Base mainnet

### In Scope (v1 Enhancements)
- `RiskRegistry.sol` — per-user risk level (Conservative / Balanced / Aggressive)
- `FeeCollector.sol` — 0.5% performance fee on yield only
- Emergency pause mechanism
- Rebalance history log (on-chain events)

### Out of Scope (v1)
- Cross-chain bridging or multi-chain vault
- Machine learning / predictive APY models
- Leveraged yield or liquidation mechanisms
- Volatile asset support (ETH, BTC) — USDC only
- Mobile native app

---

## 5. Smart Contract Architecture

### 5.1 `VaultManager.sol`
**Standard:** ERC-4626 (OpenZeppelin)  
**Responsibilities:**
- `deposit(uint256 assets, address receiver)` — accept USDC, mint shares
- `withdraw(uint256 assets, address receiver, address owner)` — burn shares, return USDC
- `totalAssets()` — return AUM across all protocols
- Emergency `pause()` / `unpause()` (OpenZeppelin Pausable)
- `onlyOwner` function to update `StrategyRouter` address

**Key rules:**
- Use `SafeERC20` for all token transfers
- Apply `ReentrancyGuard` on all state-mutating functions
- Emit `Deposit` and `Withdraw` events on every action
- Invariant: `totalAssets() >= sum of all user share claims` at all times

---

### 5.2 `StrategyRouter.sol`
**Responsibilities:**
- Fetch Aave v3 APY: call `IPool.getReserveData(USDC)` → read `liquidityRate`
- Fetch Compound v3 APY: call `cToken.supplyRatePerBlock()` → annualize
- Normalize both values to annualized percentage basis
- Compute weighted allocation: higher APY protocol receives proportionally more capital
- `investFunds(uint256 amount)` — split and deposit into Aave and Compound per allocation
- `redeemFunds(uint256 amount, address protocol)` — withdraw from specific protocol
- Optional: Uniswap v3 routing for token swaps if needed during rebalance

**Allocation example:**
```
Aave APY  = 5%  → 30% allocation
Compound APY = 8% → 70% allocation
```

---

### 5.3 `RebalanceExecutor.sol`
**Standard:** Chainlink Automation compatible  
**Responsibilities:**

```solidity
function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData) {
    // Returns true if ALL conditions are met:
    // 1. |aaveAPY - compoundAPY| > threshold (default: 3%)
    // 2. Estimated yield gain > estimated gas cost
    // 3. block.timestamp > lastRebalanceTime + cooldown (default: 24 hours)
}

function performUpkeep(bytes calldata performData) external {
    // 1. Withdraw from lower-APY protocol
    // 2. Optional: swap via Uniswap if needed
    // 3. Deposit into higher-APY protocol
    // 4. Update lastRebalanceTime
    // 5. Emit RebalanceTriggered(fromProtocol, toProtocol, amount, timestamp)
}
```

**Configurable parameters:**
- `threshold` — minimum APY gap to trigger rebalance (default: 300 = 3%)
- `cooldown` — minimum seconds between rebalances (default: 86400 = 24h)
- Manual fallback: `manualRebalance()` callable by owner if Chainlink is down

---

### 5.4 `RiskRegistry.sol` (v1)

```solidity
enum RiskLevel { Conservative, Balanced, Aggressive }
mapping(address => RiskLevel) public userRisk;

function setRiskLevel(RiskLevel level) external;
function getRiskLevel(address user) external view returns (RiskLevel);
```

**Allocation constraints per level:**
- `Conservative` — max 30% in lower-liquidity protocol; min 70% in Aave
- `Balanced` — 50/50 baseline, APY-driven deviation up to 70/30
- `Aggressive` — 100% to highest APY protocol

---

### 5.5 `FeeCollector.sol` (v1)
- Performance fee: 0.5% on yield generated (not on principal)
- Accrue fees to `treasuryAddress`
- No deposit or withdrawal fees
- `collectFees()` callable by owner; emits `FeesCollected(amount, recipient)`

---

## 6. External Protocol Integrations

### Aave v3
```solidity
IPool pool = IPool(AAVE_POOL_ADDRESS);
DataTypes.ReserveData memory data = pool.getReserveData(USDC_ADDRESS);
uint256 aaveAPY = data.currentLiquidityRate; // RAY units (1e27), annualize as needed

// Deposit
IERC20(USDC).approve(AAVE_POOL_ADDRESS, amount);
pool.supply(USDC_ADDRESS, amount, address(this), 0);

// Withdraw
pool.withdraw(USDC_ADDRESS, amount, address(this));
```

### Compound v3
```solidity
ICToken cToken = ICToken(CUSDC_ADDRESS);
uint256 ratePerBlock = cToken.supplyRatePerBlock();
uint256 compoundAPY = ratePerBlock * BLOCKS_PER_YEAR; // annualize

// Supply
IERC20(USDC).approve(CUSDC_ADDRESS, amount);
cToken.supply(USDC_ADDRESS, amount);

// Redeem
cToken.withdraw(USDC_ADDRESS, amount);
```

### Chainlink Automation
- Register `RebalanceExecutor` as an Automation-compatible contract on Base
- Fund upkeep with LINK
- `checkUpkeep` runs off-chain; `performUpkeep` executes on-chain only when needed

---

## 7. Frontend Requirements (Next.js)

### Tech Stack
```
Next.js 14 (App Router)
Tailwind CSS
wagmi v2 + viem
RainbowKit
```

### Pages & Components

#### `/` — Dashboard
- Connected wallet address + USDC balance
- Current vault APY (blended rate)
- Allocation breakdown: Aave % vs Compound % (bar or pie chart)
- User position: deposited amount, current value, yield earned to date
- Live protocol APYs side-by-side (Aave vs Compound)
- Last rebalance: timestamp + reason
- Data refresh: poll every 5 seconds (or WebSocket if backend exists)

#### Deposit Flow
1. Input USDC amount (with MAX button reading wallet balance)
2. Show preview: shares to receive, current share price
3. If allowance insufficient → trigger `approve()` tx
4. Trigger `VaultManager.deposit()` tx
5. Show pending → success/failure toast

#### Withdraw Flow
1. Input USDC amount or % slider of position
2. Show preview: shares burned, USDC received
3. Trigger `VaultManager.withdraw()` tx
4. Update dashboard on confirmation

#### Risk Level Selector
- Three toggle options: Conservative / Balanced / Aggressive
- On change: write to `RiskRegistry.setRiskLevel()`
- Display current strategy's allocation constraints below selector

### Contract Reads (wagmi hooks)
```typescript
useContractRead({ address: VAULT, abi: vaultABI, functionName: 'totalAssets' })
useContractRead({ address: VAULT, abi: vaultABI, functionName: 'balanceOf', args: [userAddress] })
useContractRead({ address: STRATEGY, abi: strategyABI, functionName: 'getCurrentAPYs' })
useContractRead({ address: STRATEGY, abi: strategyABI, functionName: 'getAllocation' })
```

---

## 8. System Data Flows

```
# Deposit
User → Frontend → VaultManager.deposit() → StrategyRouter.investFunds() → Aave + Compound

# Withdraw
User → Frontend → VaultManager.withdraw() → StrategyRouter.redeemFunds() → User

# Rebalance
Chainlink Node → RebalanceExecutor.checkUpkeep() → [if true] → performUpkeep()
                                                              → StrategyRouter.rebalance()
                                                              → Withdraw from Protocol A
                                                              → Deposit to Protocol B

# UI Data
Aave API + Compound API + on-chain reads → polling (5s) → Dashboard state update
```

---

## 9. Rebalance Logic (Detailed)

```
TRIGGER CONDITIONS (all must be true):
  1. abs(aaveAPY - compoundAPY) > threshold        // e.g. 5% - 4% = 1% < 3% → no trigger
  2. projectedYieldGain(7 days) > estimatedGasCost // net-positive check
  3. block.timestamp >= lastRebalance + cooldown    // 24h cooldown passed

EXECUTION:
  1. Call StrategyRouter.rebalance(fromProtocol, toProtocol, amount)
  2. Withdraw full position from lower-APY protocol
  3. Re-deposit into higher-APY protocol
  4. Update lastRebalanceTime = block.timestamp
  5. Emit RebalanceTriggered event

EXAMPLE:
  Aave APY     = 4%
  Compound APY = 9%
  Difference   = 5%  → exceeds 3% threshold
  Gas cost     = $2  → projected 7-day gain on $10,000 = $12 → net positive
  → Rebalance triggered: move funds from Aave to Compound
```

---

## 10. Folder Structure

```
defi-yield-optimizer/
├── contracts/
│   ├── VaultManager.sol
│   ├── StrategyRouter.sol
│   ├── RebalanceExecutor.sol
│   ├── RiskRegistry.sol
│   ├── FeeCollector.sol
│   └── interfaces/
│       ├── IAavePool.sol
│       ├── ICompoundToken.sol
│       └── IUniswapRouter.sol
├── scripts/
│   ├── deploy.js
│   └── verify.js
├── test/
│   ├── VaultManager.test.js
│   ├── StrategyRouter.test.js
│   └── RebalanceExecutor.test.js
├── hardhat.config.js
├── frontend/
│   ├── app/
│   │   ├── page.tsx           (dashboard)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── DepositForm.tsx
│   │   ├── WithdrawForm.tsx
│   │   ├── AllocationChart.tsx
│   │   ├── APYDisplay.tsx
│   │   └── RiskSelector.tsx
│   ├── hooks/
│   │   ├── useVault.ts
│   │   ├── useAPY.ts
│   │   └── useRebalanceHistory.ts
│   ├── lib/
│   │   ├── wagmi.ts
│   │   └── contracts.ts       (ABIs + addresses)
│   └── package.json
└── .env.example
```

---

## 11. Environment Variables

```bash
# .env
PRIVATE_KEY=
ALCHEMY_API_KEY=
INFURA_API_KEY=

# Base mainnet
BASE_RPC_URL=https://mainnet.base.org

# Contract addresses (fill after deploy)
NEXT_PUBLIC_VAULT_ADDRESS=
NEXT_PUBLIC_STRATEGY_ADDRESS=
NEXT_PUBLIC_REBALANCER_ADDRESS=

# Protocol addresses (Base)
AAVE_POOL_ADDRESS=
CUSDC_ADDRESS=
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Chainlink
CHAINLINK_AUTOMATION_REGISTRY=
```

---

## 12. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Rebalance gas cost | < 300,000 gas on Base |
| Dashboard data refresh | ≤ 5 seconds |
| Time-to-first-deposit (UX) | < 3 minutes |
| Smart contract test coverage | ≥ 80% |
| Chainlink Automation uptime | > 99.5% |
| Vault invariant | `totalAssets() >= sum(userShares * sharePrice)` always |

---

## 13. Security Requirements

- `ReentrancyGuard` on all state-mutating vault functions
- `SafeERC20` for all token transfers
- `onlyOwner` access control for configuration functions; no admin access to user funds
- Slippage protection on any Uniswap swap during rebalance
- Emergency `pause()` halts deposits/withdrawals; withdrawals re-enabled first on unpause
- No upgradeable proxy in v1 — immutable contracts
- External audit required before mainnet launch

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Gas cost > yield gain | Net-positive check in `checkUpkeep()` before every rebalance |
| Aave/Compound API downtime | Primary data source is on-chain reads; APIs are supplementary |
| Smart contract exploit | OpenZeppelin base contracts + reentrancy guards + audit |
| Chainlink node downtime | Manual `manualRebalance()` fallback callable by owner |
| APY oscillation (ping-pong) | 24-hour cooldown between rebalances |
| USDC depeg | Scope limited to USDC only in v1; optional Chainlink price feed guardian |

---

## 15. MVP Build Order

Build in this exact sequence to avoid integration blockers:

1. `VaultManager.sol` with mock `totalAssets()` → test deposit/withdraw/shares
2. `StrategyRouter.sol` with mock APY values → test allocation math
3. Wire `VaultManager` ↔ `StrategyRouter` → test full deposit→invest flow
4. Replace mock APY with live Aave + Compound on-chain reads (fork mainnet)
5. `RebalanceExecutor.sol` → test checkUpkeep/performUpkeep on forked mainnet
6. Register Chainlink Automation on Base testnet
7. Frontend: RainbowKit + deposit form + dashboard (read-only first, then writes)
8. `RiskRegistry.sol` + `FeeCollector.sol` → wire into frontend
9. Internal security review → external audit → mainnet deploy
