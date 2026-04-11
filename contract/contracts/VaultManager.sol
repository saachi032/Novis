// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";
import {IStrategyRouter} from "./interfaces/IStrategyRouter.sol";

contract VaultManager is ERC4626, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IStrategyRouter public strategyRouter;
    IFeeCollector public feeCollector;

    event StrategyRouterUpdated(address indexed strategyRouter);
    event FeeCollectorUpdated(address indexed feeCollector);
    event IdleAssetsDeployed(uint256 amount);
    event FeesTransferred(uint256 amount);

    error OnlyFeeCollector();

    modifier onlyFeeCollector() {
        if (msg.sender != address(feeCollector)) revert OnlyFeeCollector();
        _;
    }

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address initialOwner_
    ) ERC20(name_, symbol_) ERC4626(asset_) Ownable(initialOwner_) {}

    function setStrategyRouter(address strategyRouter_) external onlyOwner {
        strategyRouter = IStrategyRouter(strategyRouter_);
        emit StrategyRouterUpdated(strategyRouter_);
    }

    function setFeeCollector(address feeCollector_) external onlyOwner {
        feeCollector = IFeeCollector(feeCollector_);
        emit FeeCollectorUpdated(feeCollector_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function totalAssets() public view override returns (uint256) {
        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));
        uint256 investedAssets = address(strategyRouter) == address(0) ? 0 : strategyRouter.totalManagedAssets();
        return idleAssets + investedAssets;
    }

    function maxDeposit(address receiver) public view override returns (uint256) {
        return paused() ? 0 : super.maxDeposit(receiver);
    }

    function maxMint(address receiver) public view override returns (uint256) {
        return paused() ? 0 : super.maxMint(receiver);
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        return paused() ? 0 : super.maxWithdraw(owner);
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        return paused() ? 0 : super.maxRedeem(owner);
    }

    function deposit(uint256 assets, address receiver) public override whenNotPaused nonReentrant returns (uint256 shares) {
        shares = super.deposit(assets, receiver);

        if (address(feeCollector) != address(0)) {
            feeCollector.recordDeposit(assets);
        }

        _deployIdleAssets();
    }

    function mint(uint256 shares, address receiver) public override whenNotPaused nonReentrant returns (uint256 assets) {
        assets = super.mint(shares, receiver);

        if (address(feeCollector) != address(0)) {
            feeCollector.recordDeposit(assets);
        }

        _deployIdleAssets();
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override whenNotPaused nonReentrant returns (uint256 shares) {
        _ensureLiquidAssets(assets);
        shares = super.withdraw(assets, receiver, owner);

        if (address(feeCollector) != address(0)) {
            feeCollector.recordWithdrawal(assets);
        }
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override whenNotPaused nonReentrant returns (uint256 assets) {
        assets = previewRedeem(shares);
        _ensureLiquidAssets(assets);
        assets = super.redeem(shares, receiver, owner);

        if (address(feeCollector) != address(0)) {
            feeCollector.recordWithdrawal(assets);
        }
    }

    function transferFeesToCollector(uint256 amount) external onlyFeeCollector nonReentrant {
        _ensureLiquidAssets(amount);
        IERC20(asset()).safeTransfer(msg.sender, amount);
        emit FeesTransferred(amount);
    }

    function deployIdleAssets() external onlyOwner nonReentrant {
        _deployIdleAssets();
    }

    function _deployIdleAssets() internal {
        if (address(strategyRouter) == address(0)) {
            return;
        }

        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));
        if (idleAssets == 0) {
            return;
        }

        IERC20(asset()).safeTransfer(address(strategyRouter), idleAssets);
        strategyRouter.investFunds(idleAssets);
        emit IdleAssetsDeployed(idleAssets);
    }

    function _ensureLiquidAssets(uint256 assets) internal {
        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));
        if (idleAssets >= assets || address(strategyRouter) == address(0)) {
            return;
        }

        uint256 shortfall = assets - idleAssets;
        strategyRouter.withdrawToVault(shortfall);
    }
}
