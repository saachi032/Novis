pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";
import {IRiskRegistry} from "./interfaces/IRiskRegistry.sol";
import {IStrategyRouter} from "./interfaces/IStrategyRouter.sol";

contract VaultManager is ERC4626, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IRiskRegistry public immutable riskRegistry;
    IStrategyRouter public strategyRouter;
    IFeeCollector public feeCollector;

    event StrategyRouterUpdated(address indexed strategyRouter);
    event FeeCollectorUpdated(address indexed feeCollector);
    event UserAssetsInvested(address indexed user, uint256 amount);
    event FeesTransferred(uint256 amount);

    error OnlyFeeCollector();
    error StrategyNotConfigured();

    modifier onlyFeeCollector() {
        if (msg.sender != address(feeCollector)) revert OnlyFeeCollector();
        _;
    }

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address riskRegistry_,
        address initialOwner_
    ) ERC20(name_, symbol_) ERC4626(asset_) Ownable(initialOwner_) {
        riskRegistry = IRiskRegistry(riskRegistry_);
    }

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

    function deposit(uint256 assets, address receiver) public override whenNotPaused nonReentrant returns (uint256 shares) {
        require(address(strategyRouter) != address(0), "strategy router not set");
        require(riskRegistry.hasStrategy(receiver), "strategy not set");

        shares = super.deposit(assets, receiver);
        _investUserAssets(assets, receiver);

        if (address(feeCollector) != address(0)) {
            feeCollector.recordDeposit(assets);
        }
    }

    function mint(uint256 shares, address receiver) public override whenNotPaused nonReentrant returns (uint256 assets) {
        require(address(strategyRouter) != address(0), "strategy router not set");
        require(riskRegistry.hasStrategy(receiver), "strategy not set");

        assets = super.mint(shares, receiver);
        _investUserAssets(assets, receiver);

        if (address(feeCollector) != address(0)) {
            feeCollector.recordDeposit(assets);
        }
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override nonReentrant returns (uint256 shares) {
        require(address(strategyRouter) != address(0), "strategy router not set");

        strategyRouter.redeemFunds(assets, owner);
        shares = super.withdraw(assets, receiver, owner);

        if (address(feeCollector) != address(0)) {
            feeCollector.recordWithdrawal(assets);
        }
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override nonReentrant returns (uint256 assets) {
        require(address(strategyRouter) != address(0), "strategy router not set");

        assets = previewRedeem(shares);
        strategyRouter.redeemFunds(assets, owner);
        assets = super.redeem(shares, receiver, owner);

        if (address(feeCollector) != address(0)) {
            feeCollector.recordWithdrawal(assets);
        }
    }

    function transferFeesToCollector(uint256 amount) external onlyFeeCollector nonReentrant {
        IERC20(asset()).safeTransfer(msg.sender, amount);
        emit FeesTransferred(amount);
    }

    function _investUserAssets(uint256 assets, address user) internal {
        IERC20(asset()).safeTransfer(address(strategyRouter), assets);
        strategyRouter.investFunds(assets, user);
        emit UserAssetsInvested(user, assets);
    }
}
