// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";
import {IRiskRegistry} from "./interfaces/IRiskRegistry.sol";
import {IStrategyRouter} from "./interfaces/IStrategyRouter.sol";
import {IUniswapRouter} from "./interfaces/IUniswapRouter.sol";

/// @dev Base mainnet reference addresses (informative; deployment uses constructor args).
address constant UNISWAP_V3_SWAP_ROUTER_BASE = 0x2626664c2603336E57B271c5C0b26F421741e481;
address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

contract VaultManager is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    IRiskRegistry public immutable riskRegistry;
    IStrategyRouter public strategyRouter;
    IFeeCollector public feeCollector;

    /// @notice Uniswap V3 SwapRouter (same interface as ISwapRouter / IUniswapRouter.exactInputSingle)
    IUniswapRouter public immutable swapRouter;


    event StrategyRouterUpdated(address indexed strategyRouter);
    event FeeCollectorUpdated(address indexed feeCollector);
    event UserAssetsInvested(address indexed user, uint256 amount);
    event FeesTransferred(uint256 amount);

    error OnlyFeeCollector();
    error StrategyNotConfigured();
    error SwapRouterNotSet();
    error UnsupportedStablecoin();
    error ZeroAmount();

    modifier onlyFeeCollector() {
        if (msg.sender != address(feeCollector)) revert OnlyFeeCollector();
        _;
    }

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address riskRegistry_,
        address initialOwner_,
        address swapRouter_
    ) ERC20(name_, symbol_) ERC4626(asset_) Ownable(initialOwner_) {
        riskRegistry = IRiskRegistry(riskRegistry_);
        swapRouter = IUniswapRouter(swapRouter_);
    }

    function setStrategyRouter(address strategyRouter_) external onlyOwner {
        strategyRouter = IStrategyRouter(strategyRouter_);
        emit StrategyRouterUpdated(strategyRouter_);
    }

    function setFeeCollector(address feeCollector_) external onlyOwner {
        feeCollector = IFeeCollector(feeCollector_);
        emit FeeCollectorUpdated(feeCollector_);
    }

    function totalAssets() public view override returns (uint256) {
        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));
        uint256 investedAssets = address(strategyRouter) == address(0) ? 0 : strategyRouter.totalManagedAssets();
        return idleAssets + investedAssets;
    }


    function deposit(uint256 assets, address receiver) public override returns (uint256 shares) {
        // Simple USDC-only deposit - no strategy requirement
        shares = super.deposit(assets, receiver);

        if (address(strategyRouter) != address(0) && riskRegistry.hasStrategy(receiver)) {
            _investUserAssets(assets, receiver);
        }

        if (address(feeCollector) != address(0)) {
            try feeCollector.recordDeposit(assets) {} catch {}
        }
    }

    function mint(uint256 shares, address receiver) public override returns (uint256 assets) {
        // Simple USDC-only mint - no strategy requirement
        assets = super.mint(shares, receiver);

        if (address(strategyRouter) != address(0) && riskRegistry.hasStrategy(receiver)) {
            _investUserAssets(assets, receiver);
        }

        if (address(feeCollector) != address(0)) {
            try feeCollector.recordDeposit(assets) {} catch {}
        }
    }

    function depositAnyStablecoin(uint256 assets, address receiver) external returns (uint256 shares) {
        // Alias for standard ERC4626 deposit - USDC only
        return deposit(assets, receiver);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override returns (uint256 shares) {
        uint256 investedBalance = _userInvestedBalance(owner);
        if (investedBalance > 0) {
            uint256 amountToRedeem = assets < investedBalance ? assets : investedBalance;
            strategyRouter.redeemFunds(amountToRedeem, owner);
        }

        shares = super.withdraw(assets, receiver, owner);

        if (address(feeCollector) != address(0)) {
            try feeCollector.recordWithdrawal(assets) {} catch {}
        }
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override returns (uint256 assets) {
        assets = previewRedeem(shares);
        uint256 investedBalance = _userInvestedBalance(owner);
        if (investedBalance > 0) {
            uint256 amountToRedeem = assets < investedBalance ? assets : investedBalance;
            strategyRouter.redeemFunds(amountToRedeem, owner);
        }

        assets = super.redeem(shares, receiver, owner);

        if (address(feeCollector) != address(0)) {
            try feeCollector.recordWithdrawal(assets) {} catch {}
        }
    }

    function transferFeesToCollector(uint256 amount) external onlyFeeCollector {
        IERC20(asset()).safeTransfer(msg.sender, amount);
        emit FeesTransferred(amount);
    }

    function _investUserAssets(uint256 assets, address user) internal {
        IERC20(asset()).safeTransfer(address(strategyRouter), assets);
        strategyRouter.investFunds(assets, user);
        emit UserAssetsInvested(user, assets);
    }

    function _userInvestedBalance(address user) internal view returns (uint256 investedBalance) {
        if (address(strategyRouter) == address(0)) {
            return 0;
        }

        try strategyRouter.getUserProtocolBalances(user) returns (
            uint256 aaveBalance,
            uint256 compoundBalance,
            uint256 morphoBalance
        ) {
            return aaveBalance + compoundBalance + morphoBalance;
        } catch {
            return 0;
        }
    }

    /// @dev Mirrors OZ `deposit` share math while USDC is already in this contract (post-swap), without a second transfer.
    function _depositUsdcAlreadyInVault(uint256 assets, address receiver) internal {
        require(address(strategyRouter) != address(0), "strategy router not set");
        require(riskRegistry.hasStrategy(receiver), "strategy not set");

        uint256 supply = totalSupply();
        uint256 totalBeforeNew = totalAssets() - assets;
        uint256 shares = supply == 0
            ? assets
            : Math.mulDiv(assets, supply, totalBeforeNew, Math.Rounding.Floor);

        _mint(receiver, shares);
        emit Deposit(msg.sender, receiver, assets, shares);

        _investUserAssets(assets, receiver);

        if (address(feeCollector) != address(0)) {
            feeCollector.recordDeposit(assets);
        }
    }
}
