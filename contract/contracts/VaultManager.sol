pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";
import {IRiskRegistry} from "./interfaces/IRiskRegistry.sol";
import {IStrategyRouter} from "./interfaces/IStrategyRouter.sol";
import {IUniswapRouter} from "./interfaces/IUniswapRouter.sol";

/// @dev Base mainnet reference addresses (informative; deployment uses constructor args).
address constant UNISWAP_V3_SWAP_ROUTER_BASE = 0x2626664c2603336E57B271c5C0b26F421741e481;
address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

contract VaultManager is ERC4626, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IRiskRegistry public immutable riskRegistry;
    IStrategyRouter public strategyRouter;
    IFeeCollector public feeCollector;

    /// @notice Uniswap V3 SwapRouter (same interface as ISwapRouter / IUniswapRouter.exactInputSingle)
    IUniswapRouter public immutable swapRouter;
    /// @notice Accepted zapper inputs (e.g. Base mainnet USDT / DAI)
    address public immutable usdt;
    address public immutable dai;

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
        address swapRouter_,
        address usdt_,
        address dai_
    ) ERC20(name_, symbol_) ERC4626(asset_) Ownable(initialOwner_) {
        riskRegistry = IRiskRegistry(riskRegistry_);
        swapRouter = IUniswapRouter(swapRouter_);
        usdt = usdt_;
        dai = dai_;
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

    /// @notice Deposit USDT or DAI: swap to USDC via Uniswap V3 (0.01% fee tier), then same path as `deposit`.
    /// @dev Set `swapRouter` to address(0) at deploy time to disable this entrypoint.
    function depositAnyStablecoin(address tokenIn, uint256 amountIn) external whenNotPaused nonReentrant {
        if (address(swapRouter) == address(0)) revert SwapRouterNotSet();
        if (amountIn == 0) revert ZeroAmount();
        if (tokenIn != usdt && tokenIn != dai) revert UnsupportedStablecoin();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(swapRouter), amountIn);

        IERC20 usdc = IERC20(asset());
        uint256 amountOut = swapRouter.exactInputSingle(
            IUniswapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: address(usdc),
                fee: 100,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );

        IERC20(tokenIn).forceApprove(address(swapRouter), 0);

        _depositUsdcAlreadyInVault(amountOut, msg.sender);
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
