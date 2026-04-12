// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAavePool} from "./interfaces/IAavePool.sol";
import {ICompoundToken} from "./interfaces/ICompoundToken.sol";
import {IMorpho} from "./interfaces/IMorpho.sol";
import {IRiskRegistry} from "./interfaces/IRiskRegistry.sol";

contract StrategyRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Protocol {
        Aave,
        Compound,
        Morpho
    }

    struct UserPosition {
        uint256 aaveBalance;
        uint256 compoundBalance;
        uint256 morphoBalance;
    }

    uint256 public constant PERCENTAGE_DENOMINATOR = 100;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant AAVE_RAY_TO_BPS_DIVISOR = 1e23;

    IERC20 public immutable assetToken;
    IAavePool public aavePool;
    ICompoundToken public compoundToken;
    IMorpho public morpho;
    /// @dev Loan token of the configured Morpho market; mirrors `morphoMarketParams.loanToken` for convenience.
    address public morphoMarket;
    IMorpho.MarketParams public morphoMarketParams;
    IRiskRegistry public immutable riskRegistry;

    address public vault;
    address public keeper;
    bool public demoMode = true;
    uint256 public mockAaveAPYBps = 480;
    uint256 public mockCompoundAPYBps = 610;
    uint256 public mockMorphoAPYBps = 550;
    /// @dev Off-chain / operator-updated Morpho supply yield hint (bps) when `demoMode` is false.
    uint256 public morphoLiveApyBps;

    uint256 public blocksPerYear = 2_628_000;
    uint256 public totalAaveManagedAssets;
    uint256 public totalCompoundManagedAssets;
    uint256 public totalMorphoManagedAssets;

    mapping(address user => UserPosition position) public userPositions;

    event VaultUpdated(address indexed vault);
    event KeeperUpdated(address indexed keeper);
    event DemoModeUpdated(bool enabled);
    event MockApysUpdated(uint256 aaveAPYBps, uint256 compoundAPYBps, uint256 morphoAPYBps);
    event ProtocolAddressesUpdated(address indexed aavePool, address indexed compoundToken);
    event MorphoUpdated(address indexed morpho, address indexed loanToken, address collateralToken, address oracle, address irm, uint256 lltv);
    event MorphoLiveApyUpdated(uint256 morphoLiveApyBps);
    event UserFundsInvested(address indexed user, uint256 amount, uint256 toAave, uint256 toCompound, uint256 toMorpho);
    event UserFundsRedeemed(address indexed user, uint256 amount, uint256 fromAave, uint256 fromCompound, uint256 fromMorpho);
    event UserRebalanced(address indexed user, Protocol fromProtocol, Protocol toProtocol, uint256 amount);

    error OnlyVault();
    error OnlyKeeper();
    error InvalidAddress();
    error StrategyNotSet();
    error InsufficientUserBalance();
    error RebalanceNotReady();
    error MorphoNotConfigured();
    error MorphoLoanTokenMismatch();

    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVault();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != owner() && msg.sender != keeper) revert OnlyKeeper();
        _;
    }

    constructor(
        address asset_,
        address aavePool_,
        address compoundToken_,
        address riskRegistry_,
        address initialOwner_
    ) Ownable(initialOwner_) {
        if (asset_ == address(0) || aavePool_ == address(0) || compoundToken_ == address(0) || riskRegistry_ == address(0)) {
            revert InvalidAddress();
        }

        assetToken = IERC20(asset_);
        aavePool = IAavePool(aavePool_);
        compoundToken = ICompoundToken(compoundToken_);
        riskRegistry = IRiskRegistry(riskRegistry_);
    }

    function setVault(address vault_) external onlyOwner {
        if (vault_ == address(0)) revert InvalidAddress();
        vault = vault_;
        emit VaultUpdated(vault_);
    }

    function setKeeper(address keeper_) external onlyOwner {
        if (keeper_ == address(0)) revert InvalidAddress();
        keeper = keeper_;
        emit KeeperUpdated(keeper_);
    }

    function setProtocolAddresses(address aavePool_, address compoundToken_) external onlyOwner {
        if (aavePool_ == address(0) || compoundToken_ == address(0)) revert InvalidAddress();
        aavePool = IAavePool(aavePool_);
        compoundToken = ICompoundToken(compoundToken_);
        emit ProtocolAddressesUpdated(aavePool_, compoundToken_);
    }

    /// @param morpho_ Morpho Blue singleton.
    /// @param marketParams_ Full market params; `loanToken` must match `assetToken`.
    function setMorpho(address morpho_, IMorpho.MarketParams calldata marketParams_) external onlyOwner {
        if (morpho_ == address(0)) revert InvalidAddress();
        if (marketParams_.loanToken != address(assetToken)) revert MorphoLoanTokenMismatch();

        morpho = IMorpho(morpho_);
        morphoMarketParams = marketParams_;
        morphoMarket = marketParams_.loanToken;
        emit MorphoUpdated(
            morpho_,
            marketParams_.loanToken,
            marketParams_.collateralToken,
            marketParams_.oracle,
            marketParams_.irm,
            marketParams_.lltv
        );
    }

    function setMorphoLiveApyBps(uint256 morphoLiveApyBps_) external onlyOwner {
        morphoLiveApyBps = morphoLiveApyBps_;
        emit MorphoLiveApyUpdated(morphoLiveApyBps_);
    }

    function setDemoMode(bool enabled) external onlyOwner {
        demoMode = enabled;
        emit DemoModeUpdated(enabled);
    }

    function setMockApys(uint256 aaveAPYBps, uint256 compoundAPYBps, uint256 morphoAPYBps) external onlyOwner {
        mockAaveAPYBps = aaveAPYBps;
        mockCompoundAPYBps = compoundAPYBps;
        mockMorphoAPYBps = morphoAPYBps;
        emit MockApysUpdated(aaveAPYBps, compoundAPYBps, morphoAPYBps);
    }

    function setBlocksPerYear(uint256 newBlocksPerYear) external onlyOwner {
        require(newBlocksPerYear > 0, "blocksPerYear=0");
        blocksPerYear = newBlocksPerYear;
    }

    function getAaveAPY() public view returns (uint256 aaveAPYBps) {
        if (demoMode) {
            return mockAaveAPYBps;
        }

        IAavePool.ReserveData memory reserveData = aavePool.getReserveData(address(assetToken));
        aaveAPYBps = uint256(reserveData.currentLiquidityRate) / AAVE_RAY_TO_BPS_DIVISOR;
    }

    function getCompoundAPY() public view returns (uint256 compoundAPYBps) {
        if (demoMode) {
            return mockCompoundAPYBps;
        }

        uint256 ratePerBlock = compoundToken.supplyRatePerBlock();
        compoundAPYBps = (ratePerBlock * blocksPerYear * BPS_DENOMINATOR) / 1e18;
    }

    function getMorphoAPY() public view returns (uint256 morphoAPYBps) {
        if (demoMode) {
            return mockMorphoAPYBps;
        }
        if (address(morpho) == address(0)) {
            return 0;
        }
        return morphoLiveApyBps;
    }

    function getCurrentAPYs() public view returns (uint256 aaveAPYBps, uint256 compoundAPYBps, uint256 morphoAPYBps) {
        aaveAPYBps = getAaveAPY();
        compoundAPYBps = getCompoundAPY();
        morphoAPYBps = getMorphoAPY();
    }

    function totalManagedAssets() public view returns (uint256) {
        return totalAaveManagedAssets + totalCompoundManagedAssets + totalMorphoManagedAssets;
    }

    function getUserProtocolBalances(address user)
        external
        view
        returns (uint256 aaveBalance, uint256 compoundBalance, uint256 morphoBalance)
    {
        UserPosition memory position = userPositions[user];
        return (position.aaveBalance, position.compoundBalance, position.morphoBalance);
    }

    function investFunds(uint256 amount, address user) external onlyVault nonReentrant {
        if (amount == 0) {
            return;
        }
        if (!riskRegistry.hasStrategy(user)) revert StrategyNotSet();

        (uint8 riskPercentage, ) = riskRegistry.getUserStrategy(user);
        (Protocol hi, Protocol md, Protocol lo) = _protocolsSortedByApy();

        uint256 toHigh = (amount * riskPercentage) / PERCENTAGE_DENOMINATOR;
        uint256 rest = amount - toHigh;
        uint256 toMid = rest / 2;
        uint256 toLow = rest - toMid;

        uint256 toAave = hi == Protocol.Aave ? toHigh : (md == Protocol.Aave ? toMid : toLow);
        uint256 toCompound = hi == Protocol.Compound ? toHigh : (md == Protocol.Compound ? toMid : toLow);
        uint256 toMorpho = hi == Protocol.Morpho ? toHigh : (md == Protocol.Morpho ? toMid : toLow);

        _investToProtocol(user, hi, toHigh);
        _investToProtocol(user, md, toMid);
        _investToProtocol(user, lo, toLow);

        emit UserFundsInvested(user, amount, toAave, toCompound, toMorpho);
    }

    function redeemFunds(uint256 amount, address user) external onlyVault nonReentrant returns (uint256 withdrawn) {
        UserPosition memory position = userPositions[user];
        uint256 userTotal = position.aaveBalance + position.compoundBalance + position.morphoBalance;
        if (amount > userTotal) revert InsufficientUserBalance();
        if (amount == 0) {
            return 0;
        }

        uint256 fromAave = userTotal == 0 ? 0 : (amount * position.aaveBalance) / userTotal;
        uint256 fromCompound = userTotal == 0 ? 0 : (amount * position.compoundBalance) / userTotal;
        uint256 fromMorpho = amount - fromAave - fromCompound;

        if (fromAave > 0) {
            _withdrawFromProtocol(Protocol.Aave, fromAave);
            userPositions[user].aaveBalance -= fromAave;
            totalAaveManagedAssets -= fromAave;
            withdrawn += fromAave;
        }

        if (fromCompound > 0) {
            _withdrawFromProtocol(Protocol.Compound, fromCompound);
            userPositions[user].compoundBalance -= fromCompound;
            totalCompoundManagedAssets -= fromCompound;
            withdrawn += fromCompound;
        }

        if (fromMorpho > 0) {
            _withdrawFromProtocol(Protocol.Morpho, fromMorpho);
            userPositions[user].morphoBalance -= fromMorpho;
            totalMorphoManagedAssets -= fromMorpho;
            withdrawn += fromMorpho;
        }

        if (withdrawn > 0) {
            assetToken.safeTransfer(vault, withdrawn);
        }

        emit UserFundsRedeemed(user, withdrawn, fromAave, fromCompound, fromMorpho);
    }

    function rebalance(address user) external onlyKeeper nonReentrant {
        if (!riskRegistry.canRebalance(user)) revert RebalanceNotReady();
        _rebalanceUser(user, true);
    }

    function forceRebalance(address user) external onlyKeeper nonReentrant {
        _rebalanceUser(user, false);
    }

    function _rebalanceUser(address user, bool updateTimestamp) internal {
        if (!riskRegistry.hasStrategy(user)) revert StrategyNotSet();

        UserPosition memory position = userPositions[user];
        uint256 userTotal = position.aaveBalance + position.compoundBalance + position.morphoBalance;
        if (userTotal == 0) {
            if (updateTimestamp) {
                riskRegistry.updateLastRebalanceTime(user);
            }
            return;
        }

        (uint8 riskPercentage, ) = riskRegistry.getUserStrategy(user);
        (Protocol hi, Protocol md, Protocol lo) = _protocolsSortedByApy();

        uint256 targetHigh = (userTotal * riskPercentage) / PERCENTAGE_DENOMINATOR;
        uint256 rest = userTotal - targetHigh;
        uint256 targetMid = rest / 2;
        uint256 targetLow = rest - targetMid;

        uint256[3] memory target;
        target[uint256(hi)] = targetHigh;
        target[uint256(md)] = targetMid;
        target[uint256(lo)] = targetLow;

        for (uint256 iter = 0; iter < 8; iter++) {
            if (!_rebalancePass(user, target)) break;
        }

        if (updateTimestamp) {
            riskRegistry.updateLastRebalanceTime(user);
        }
    }

    /// @dev One sweep over protocol pairs; returns true if any liquidity was moved.
    function _rebalancePass(address user, uint256[3] memory target) internal returns (bool progressed) {
        for (uint256 from = 0; from < 3; from++) {
            for (uint256 to = 0; to < 3; to++) {
                if (from == to) continue;
                Protocol fromP = Protocol(from);
                Protocol toP = Protocol(to);
                uint256 balFrom = _balanceOf(user, fromP);
                uint256 balTo = _balanceOf(user, toP);
                uint256 tgtFrom = target[from];
                uint256 tgtTo = target[to];
                if (balFrom <= tgtFrom || balTo >= tgtTo) continue;
                uint256 surplus = balFrom - tgtFrom;
                uint256 deficit = tgtTo - balTo;
                uint256 moveAmt = surplus < deficit ? surplus : deficit;
                if (moveAmt == 0) continue;
                _withdrawFromProtocol(fromP, moveAmt);
                _depositToProtocol(toP, moveAmt);
                _applyMove(user, fromP, toP, moveAmt);
                emit UserRebalanced(user, fromP, toP, moveAmt);
                progressed = true;
            }
        }
    }

    function _protocolsSortedByApy() internal view returns (Protocol hi, Protocol md, Protocol lo) {
        Protocol[3] memory ord = [Protocol.Aave, Protocol.Compound, Protocol.Morpho];
        uint256[3] memory apy = [getAaveAPY(), getCompoundAPY(), getMorphoAPY()];
        for (uint256 i = 0; i < 2; i++) {
            for (uint256 j = i + 1; j < 3; j++) {
                if (apy[j] > apy[i] || (apy[j] == apy[i] && uint256(ord[j]) < uint256(ord[i]))) {
                    (apy[i], apy[j]) = (apy[j], apy[i]);
                    (ord[i], ord[j]) = (ord[j], ord[i]);
                }
            }
        }
        return (ord[0], ord[1], ord[2]);
    }

    function _balanceOf(address user, Protocol protocol) internal view returns (uint256) {
        UserPosition memory position = userPositions[user];
        if (protocol == Protocol.Aave) return position.aaveBalance;
        if (protocol == Protocol.Compound) return position.compoundBalance;
        return position.morphoBalance;
    }

    function _applyMove(address user, Protocol fromP, Protocol toP, uint256 amount) internal {
        if (fromP == Protocol.Aave) {
            userPositions[user].aaveBalance -= amount;
            totalAaveManagedAssets -= amount;
        } else if (fromP == Protocol.Compound) {
            userPositions[user].compoundBalance -= amount;
            totalCompoundManagedAssets -= amount;
        } else {
            userPositions[user].morphoBalance -= amount;
            totalMorphoManagedAssets -= amount;
        }

        if (toP == Protocol.Aave) {
            userPositions[user].aaveBalance += amount;
            totalAaveManagedAssets += amount;
        } else if (toP == Protocol.Compound) {
            userPositions[user].compoundBalance += amount;
            totalCompoundManagedAssets += amount;
        } else {
            userPositions[user].morphoBalance += amount;
            totalMorphoManagedAssets += amount;
        }
    }

    function _investToProtocol(address user, Protocol protocol, uint256 amount) internal {
        if (amount == 0) return;
        _depositToProtocol(protocol, amount);
        if (protocol == Protocol.Aave) {
            userPositions[user].aaveBalance += amount;
            totalAaveManagedAssets += amount;
        } else if (protocol == Protocol.Compound) {
            userPositions[user].compoundBalance += amount;
            totalCompoundManagedAssets += amount;
        } else {
            userPositions[user].morphoBalance += amount;
            totalMorphoManagedAssets += amount;
        }
    }

    function supplyToMorpho(uint256 amount) internal {
        if (address(morpho) == address(0)) revert MorphoNotConfigured();
        assetToken.forceApprove(address(morpho), amount);
        morpho.supply(morphoMarketParams, amount, 0, address(this), bytes(""));
    }

    function withdrawFromMorpho(uint256 amount) internal {
        if (address(morpho) == address(0)) revert MorphoNotConfigured();
        morpho.withdraw(morphoMarketParams, amount, 0, address(this), address(this));
    }

    function _depositToProtocol(Protocol protocol, uint256 amount) internal {
        if (demoMode) {
            return;
        }

        if (protocol == Protocol.Aave) {
            assetToken.forceApprove(address(aavePool), amount);
            aavePool.supply(address(assetToken), amount, address(this), 0);
            return;
        }

        if (protocol == Protocol.Compound) {
            assetToken.forceApprove(address(compoundToken), amount);
            compoundToken.supply(address(assetToken), amount);
            return;
        }

        supplyToMorpho(amount);
    }

    function _withdrawFromProtocol(Protocol protocol, uint256 amount) internal {
        if (demoMode) {
            return;
        }

        if (protocol == Protocol.Aave) {
            aavePool.withdraw(address(assetToken), amount, address(this));
            return;
        }

        if (protocol == Protocol.Compound) {
            compoundToken.withdraw(address(assetToken), amount);
            return;
        }

        withdrawFromMorpho(amount);
    }
}
