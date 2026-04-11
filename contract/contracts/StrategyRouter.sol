pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAavePool} from "./interfaces/IAavePool.sol";
import {ICompoundToken} from "./interfaces/ICompoundToken.sol";
import {IRiskRegistry} from "./interfaces/IRiskRegistry.sol";

contract StrategyRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Protocol {
        Aave,
        Compound
    }

    struct UserPosition {
        uint256 aaveBalance;
        uint256 compoundBalance;
    }

    uint256 public constant PERCENTAGE_DENOMINATOR = 100;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant AAVE_RAY_TO_BPS_DIVISOR = 1e23;

    IERC20 public immutable assetToken;
    IAavePool public aavePool;
    ICompoundToken public compoundToken;
    IRiskRegistry public immutable riskRegistry;

    address public vault;
    address public keeper;
    bool public demoMode = true;

    uint256 public blocksPerYear = 2_628_000;
    uint256 public totalAaveManagedAssets;
    uint256 public totalCompoundManagedAssets;

    mapping(address user => UserPosition position) public userPositions;

    event VaultUpdated(address indexed vault);
    event KeeperUpdated(address indexed keeper);
    event DemoModeUpdated(bool enabled);
    event ProtocolAddressesUpdated(address indexed aavePool, address indexed compoundToken);
    event UserFundsInvested(address indexed user, uint256 amount, uint256 toAave, uint256 toCompound);
    event UserFundsRedeemed(address indexed user, uint256 amount, uint256 fromAave, uint256 fromCompound);
    event UserRebalanced(address indexed user, Protocol fromProtocol, Protocol toProtocol, uint256 amount);

    error OnlyVault();
    error OnlyKeeper();
    error InvalidAddress();
    error StrategyNotSet();
    error InsufficientUserBalance();
    error RebalanceNotReady();

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

    function setDemoMode(bool enabled) external onlyOwner {
        demoMode = enabled;
        emit DemoModeUpdated(enabled);
    }

    function setBlocksPerYear(uint256 newBlocksPerYear) external onlyOwner {
        require(newBlocksPerYear > 0, "blocksPerYear=0");
        blocksPerYear = newBlocksPerYear;
    }

    function getAaveAPY() public view returns (uint256 aaveAPYBps) {
        IAavePool.ReserveData memory reserveData = aavePool.getReserveData(address(assetToken));
        aaveAPYBps = uint256(reserveData.currentLiquidityRate) / AAVE_RAY_TO_BPS_DIVISOR;
    }

    function getCompoundAPY() public view returns (uint256 compoundAPYBps) {
        uint256 ratePerBlock = compoundToken.supplyRatePerBlock();
        compoundAPYBps = (ratePerBlock * blocksPerYear * BPS_DENOMINATOR) / 1e18;
    }

    function getCurrentAPYs() public view returns (uint256 aaveAPYBps, uint256 compoundAPYBps) {
        aaveAPYBps = getAaveAPY();
        compoundAPYBps = getCompoundAPY();
    }

    function totalManagedAssets() public view returns (uint256) {
        return totalAaveManagedAssets + totalCompoundManagedAssets;
    }

    function getUserProtocolBalances(address user) external view returns (uint256 aaveBalance, uint256 compoundBalance) {
        UserPosition memory position = userPositions[user];
        return (position.aaveBalance, position.compoundBalance);
    }

    function investFunds(uint256 amount, address user) external onlyVault nonReentrant {
        if (amount == 0) {
            return;
        }
        if (!riskRegistry.hasStrategy(user)) revert StrategyNotSet();

        (uint8 riskPercentage, ) = riskRegistry.getUserStrategy(user);
        (Protocol higherYieldProtocol, ) = _getHigherAndLowerProtocols();

        uint256 toHigherYield = (amount * riskPercentage) / PERCENTAGE_DENOMINATOR;
        uint256 toLowerYield = amount - toHigherYield;

        uint256 toAave = higherYieldProtocol == Protocol.Aave ? toHigherYield : toLowerYield;
        uint256 toCompound = amount - toAave;

        if (toAave > 0) {
            _depositToProtocol(Protocol.Aave, toAave);
            userPositions[user].aaveBalance += toAave;
            totalAaveManagedAssets += toAave;
        }

        if (toCompound > 0) {
            _depositToProtocol(Protocol.Compound, toCompound);
            userPositions[user].compoundBalance += toCompound;
            totalCompoundManagedAssets += toCompound;
        }

        emit UserFundsInvested(user, amount, toAave, toCompound);
    }

    function redeemFunds(uint256 amount, address user) external onlyVault nonReentrant returns (uint256 withdrawn) {
        UserPosition memory position = userPositions[user];
        uint256 userTotal = position.aaveBalance + position.compoundBalance;
        if (amount > userTotal) revert InsufficientUserBalance();
        if (amount == 0) {
            return 0;
        }

        uint256 fromAave = userTotal == 0 ? 0 : (amount * position.aaveBalance) / userTotal;
        uint256 fromCompound = amount - fromAave;

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

        if (withdrawn > 0) {
            assetToken.safeTransfer(vault, withdrawn);
        }

        emit UserFundsRedeemed(user, withdrawn, fromAave, fromCompound);
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
        uint256 userTotal = position.aaveBalance + position.compoundBalance;
        if (userTotal == 0) {
            if (updateTimestamp) {
                riskRegistry.updateLastRebalanceTime(user);
            }
            return;
        }

        (uint8 riskPercentage, ) = riskRegistry.getUserStrategy(user);
        (Protocol higherYieldProtocol, ) = _getHigherAndLowerProtocols();

        (uint256 targetAave, uint256 targetCompound) = higherYieldProtocol == Protocol.Aave
            ? ((userTotal * riskPercentage) / PERCENTAGE_DENOMINATOR, userTotal - ((userTotal * riskPercentage) / PERCENTAGE_DENOMINATOR))
            : (userTotal - ((userTotal * riskPercentage) / PERCENTAGE_DENOMINATOR), (userTotal * riskPercentage) / PERCENTAGE_DENOMINATOR);

        if (position.aaveBalance < targetAave) {
            uint256 amountToMove = targetAave - position.aaveBalance;
            _withdrawFromProtocol(Protocol.Compound, amountToMove);
            _depositToProtocol(Protocol.Aave, amountToMove);
            userPositions[user].compoundBalance -= amountToMove;
            userPositions[user].aaveBalance += amountToMove;
            totalCompoundManagedAssets -= amountToMove;
            totalAaveManagedAssets += amountToMove;
            emit UserRebalanced(user, Protocol.Compound, Protocol.Aave, amountToMove);
        } else if (position.compoundBalance < targetCompound) {
            uint256 amountToMove = targetCompound - position.compoundBalance;
            _withdrawFromProtocol(Protocol.Aave, amountToMove);
            _depositToProtocol(Protocol.Compound, amountToMove);
            userPositions[user].aaveBalance -= amountToMove;
            userPositions[user].compoundBalance += amountToMove;
            totalAaveManagedAssets -= amountToMove;
            totalCompoundManagedAssets += amountToMove;
            emit UserRebalanced(user, Protocol.Aave, Protocol.Compound, amountToMove);
        }

        if (updateTimestamp) {
            riskRegistry.updateLastRebalanceTime(user);
        }
    }

    function _getHigherAndLowerProtocols() internal view returns (Protocol higherYieldProtocol, Protocol lowerYieldProtocol) {
        uint256 aaveAPYBps = getAaveAPY();
        uint256 compoundAPYBps = getCompoundAPY();

        if (aaveAPYBps >= compoundAPYBps) {
            return (Protocol.Aave, Protocol.Compound);
        }

        return (Protocol.Compound, Protocol.Aave);
    }

    function _depositToProtocol(Protocol protocol, uint256 amount) internal {
        if (demoMode) {
            return;
        }

        assetToken.forceApprove(protocol == Protocol.Aave ? address(aavePool) : address(compoundToken), amount);

        if (protocol == Protocol.Aave) {
            aavePool.supply(address(assetToken), amount, address(this), 0);
            return;
        }

        compoundToken.supply(address(assetToken), amount);
    }

    function _withdrawFromProtocol(Protocol protocol, uint256 amount) internal {
        if (demoMode) {
            return;
        }

        if (protocol == Protocol.Aave) {
            aavePool.withdraw(address(assetToken), amount, address(this));
            return;
        }

        compoundToken.withdraw(address(assetToken), amount);
    }
}
