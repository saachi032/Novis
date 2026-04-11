// SPDX-License-Identifier: MIT
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

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant AAVE_RAY_TO_BPS_DIVISOR = 1e23;

    IERC20 public immutable assetToken;
    IAavePool public aavePool;
    ICompoundToken public compoundToken;

    address public vault;
    address public rebalanceOperator;
    IRiskRegistry public riskRegistry;
    IRiskRegistry.RiskLevel public defaultRiskLevel;

    uint256 public blocksPerYear = 2_628_000;
    uint256 public aaveManagedAssets;
    uint256 public compoundManagedAssets;

    event VaultUpdated(address indexed vault);
    event RebalanceOperatorUpdated(address indexed operator);
    event RiskRegistryUpdated(address indexed riskRegistry);
    event DefaultRiskLevelUpdated(IRiskRegistry.RiskLevel level);
    event ProtocolAddressesUpdated(address indexed aavePool, address indexed compoundToken);
    event Invested(uint256 amount, uint256 aaveAmount, uint256 compoundAmount);
    event Redeemed(Protocol indexed protocol, uint256 amount, address indexed recipient);
    event Rebalanced(Protocol indexed fromProtocol, Protocol indexed toProtocol, uint256 amount);

    error OnlyVault();
    error OnlyOperator();
    error InvalidAddress();
    error InvalidProtocol();

    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVault();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != owner() && msg.sender != rebalanceOperator) revert OnlyOperator();
        _;
    }

    constructor(
        address asset_,
        address aavePool_,
        address compoundToken_,
        address initialOwner_
    ) Ownable(initialOwner_) {
        if (asset_ == address(0) || aavePool_ == address(0) || compoundToken_ == address(0)) {
            revert InvalidAddress();
        }

        assetToken = IERC20(asset_);
        aavePool = IAavePool(aavePool_);
        compoundToken = ICompoundToken(compoundToken_);
        defaultRiskLevel = IRiskRegistry.RiskLevel.Balanced;
    }

    function setVault(address vault_) external onlyOwner {
        if (vault_ == address(0)) revert InvalidAddress();
        vault = vault_;
        emit VaultUpdated(vault_);
    }

    function setRebalanceOperator(address operator_) external onlyOwner {
        rebalanceOperator = operator_;
        emit RebalanceOperatorUpdated(operator_);
    }

    function setRiskRegistry(address riskRegistry_) external onlyOwner {
        riskRegistry = IRiskRegistry(riskRegistry_);
        emit RiskRegistryUpdated(riskRegistry_);
    }

    function setDefaultRiskLevel(IRiskRegistry.RiskLevel level) external onlyOwner {
        defaultRiskLevel = level;
        emit DefaultRiskLevelUpdated(level);
    }

    function setProtocolAddresses(address aavePool_, address compoundToken_) external onlyOwner {
        if (aavePool_ == address(0) || compoundToken_ == address(0)) revert InvalidAddress();
        aavePool = IAavePool(aavePool_);
        compoundToken = ICompoundToken(compoundToken_);
        emit ProtocolAddressesUpdated(aavePool_, compoundToken_);
    }

    function setBlocksPerYear(uint256 newBlocksPerYear) external onlyOwner {
        require(newBlocksPerYear > 0, "blocksPerYear=0");
        blocksPerYear = newBlocksPerYear;
    }

    function getCurrentAPYs() public view returns (uint256 aaveAPYBps, uint256 compoundAPYBps) {
        IAavePool.ReserveData memory reserveData = aavePool.getReserveData(address(assetToken));
        aaveAPYBps = uint256(reserveData.currentLiquidityRate) / AAVE_RAY_TO_BPS_DIVISOR;

        uint256 ratePerBlock = compoundToken.supplyRatePerBlock();
        compoundAPYBps = (ratePerBlock * blocksPerYear * BPS_DENOMINATOR) / 1e18;
    }

    function getAllocation() public view returns (uint256 aaveAllocationBps, uint256 compoundAllocationBps) {
        return getAllocationForRisk(defaultRiskLevel);
    }

    function getAllocationForRisk(
        IRiskRegistry.RiskLevel level
    ) public view returns (uint256 aaveAllocationBps, uint256 compoundAllocationBps) {
        (uint256 aaveAPYBps, uint256 compoundAPYBps) = getCurrentAPYs();

        if (level == IRiskRegistry.RiskLevel.Conservative) {
            if (aaveAPYBps >= compoundAPYBps) {
                return (BPS_DENOMINATOR, 0);
            }
            return (7_000, 3_000);
        }

        if (level == IRiskRegistry.RiskLevel.Aggressive) {
            if (aaveAPYBps == compoundAPYBps) {
                return (5_000, 5_000);
            }
            if (aaveAPYBps > compoundAPYBps) {
                return (BPS_DENOMINATOR, uint256(0));
            }
            return (uint256(0), BPS_DENOMINATOR);
        }

        (aaveAllocationBps, compoundAllocationBps) = _proportionalAllocation(aaveAPYBps, compoundAPYBps);

        if (aaveAllocationBps < 3_000) {
            return (3_000, 7_000);
        }
        if (compoundAllocationBps < 3_000) {
            return (7_000, 3_000);
        }
    }

    function protocolBalance(Protocol protocol) public view returns (uint256) {
        if (protocol == Protocol.Aave) {
            return aaveManagedAssets;
        }
        if (protocol == Protocol.Compound) {
            return compoundManagedAssets;
        }
        revert InvalidProtocol();
    }

    function totalManagedAssets() public view returns (uint256) {
        return aaveManagedAssets + compoundManagedAssets;
    }

    function investFunds(uint256 amount) external onlyVault nonReentrant {
        if (amount == 0) {
            return;
        }

        (uint256 aaveAllocationBps, ) = getAllocation();
        uint256 aaveAmount = (amount * aaveAllocationBps) / BPS_DENOMINATOR;
        uint256 compoundAmount = amount - aaveAmount;

        if (aaveAmount > 0) {
            _depositIntoAave(aaveAmount);
        }
        if (compoundAmount > 0) {
            _depositIntoCompound(compoundAmount);
        }

        emit Invested(amount, aaveAmount, compoundAmount);
    }

    function redeemFunds(uint256 amount, Protocol protocol) external onlyVault nonReentrant returns (uint256 withdrawn) {
        withdrawn = _withdrawProtocolFunds(protocol, amount);
        if (withdrawn > 0) {
            assetToken.safeTransfer(vault, withdrawn);
        }
        emit Redeemed(protocol, withdrawn, vault);
    }

    function withdrawToVault(uint256 amount) external onlyVault nonReentrant returns (uint256 withdrawn) {
        if (amount == 0) {
            return 0;
        }

        Protocol firstProtocol = aaveManagedAssets >= compoundManagedAssets ? Protocol.Aave : Protocol.Compound;
        Protocol secondProtocol = firstProtocol == Protocol.Aave ? Protocol.Compound : Protocol.Aave;

        uint256 firstAvailable = protocolBalance(firstProtocol);
        uint256 firstWithdrawal = firstAvailable >= amount ? amount : firstAvailable;

        if (firstWithdrawal > 0) {
            withdrawn += _withdrawProtocolFunds(firstProtocol, firstWithdrawal);
        }

        if (withdrawn < amount) {
            withdrawn += _withdrawProtocolFunds(secondProtocol, amount - withdrawn);
        }

        if (withdrawn > 0) {
            assetToken.safeTransfer(vault, withdrawn);
        }
    }

    function rebalance(Protocol fromProtocol, Protocol toProtocol, uint256 amount) external onlyOperator nonReentrant {
        require(fromProtocol != toProtocol, "same protocol");
        require(amount > 0, "amount=0");

        uint256 withdrawn = _withdrawProtocolFunds(fromProtocol, amount);
        if (toProtocol == Protocol.Aave) {
            _depositIntoAave(withdrawn);
        } else if (toProtocol == Protocol.Compound) {
            _depositIntoCompound(withdrawn);
        } else {
            revert InvalidProtocol();
        }

        emit Rebalanced(fromProtocol, toProtocol, withdrawn);
    }

    function _proportionalAllocation(
        uint256 aaveAPYBps,
        uint256 compoundAPYBps
    ) internal pure returns (uint256 aaveAllocationBps, uint256 compoundAllocationBps) {
        uint256 totalAPYBps = aaveAPYBps + compoundAPYBps;
        if (totalAPYBps == 0) {
            return (5_000, 5_000);
        }

        aaveAllocationBps = (aaveAPYBps * BPS_DENOMINATOR) / totalAPYBps;
        compoundAllocationBps = BPS_DENOMINATOR - aaveAllocationBps;
    }

    function _depositIntoAave(uint256 amount) internal {
        assetToken.forceApprove(address(aavePool), amount);
        aavePool.supply(address(assetToken), amount, address(this), 0);
        aaveManagedAssets += amount;
    }

    function _depositIntoCompound(uint256 amount) internal {
        assetToken.forceApprove(address(compoundToken), amount);
        compoundToken.supply(address(assetToken), amount);
        compoundManagedAssets += amount;
    }

    function _withdrawProtocolFunds(Protocol protocol, uint256 amount) internal returns (uint256 withdrawn) {
        uint256 available = protocolBalance(protocol);
        withdrawn = amount > available ? available : amount;

        if (withdrawn == 0) {
            return 0;
        }

        if (protocol == Protocol.Aave) {
            aavePool.withdraw(address(assetToken), withdrawn, address(this));
            aaveManagedAssets -= withdrawn;
            return withdrawn;
        }

        if (protocol == Protocol.Compound) {
            compoundToken.withdraw(address(assetToken), withdrawn);
            compoundManagedAssets -= withdrawn;
            return withdrawn;
        }

        revert InvalidProtocol();
    }
}
