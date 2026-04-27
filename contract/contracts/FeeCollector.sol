// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IFeeVault {
    function totalAssets() external view returns (uint256);

    function transferFeesToCollector(uint256 amount) external;
}

contract FeeCollector is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable assetToken;
    IFeeVault public immutable vault;

    address public treasuryAddress;
    uint256 public feeBps = 50;
    uint256 public principalTracked;
    uint256 public highWaterMarkAssets;

    event TreasuryUpdated(address indexed treasuryAddress);
    event FeeBpsUpdated(uint256 feeBps);
    event PrincipalTracked(uint256 principalTracked, uint256 highWaterMarkAssets);
    event FeesCollected(uint256 amount, address indexed recipient);

    error OnlyVault();
    error InvalidAddress();

    modifier onlyVault() {
        if (msg.sender != address(vault)) revert OnlyVault();
        _;
    }

    constructor(address asset_, address vault_, address treasury_, address initialOwner_) Ownable(initialOwner_) {
        if (asset_ == address(0) || vault_ == address(0) || treasury_ == address(0)) revert InvalidAddress();
        assetToken = IERC20(asset_);
        vault = IFeeVault(vault_);
        treasuryAddress = treasury_;
    }

    function setTreasuryAddress(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert InvalidAddress();
        treasuryAddress = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 100, "fee too high");
        feeBps = newFeeBps;
        emit FeeBpsUpdated(newFeeBps);
    }

    function recordDeposit(uint256 assets) external onlyVault {
        principalTracked += assets;
        highWaterMarkAssets += assets;
        emit PrincipalTracked(principalTracked, highWaterMarkAssets);
    }

    function recordWithdrawal(uint256 assets) external onlyVault {
        principalTracked = assets >= principalTracked ? 0 : principalTracked - assets;
        highWaterMarkAssets = assets >= highWaterMarkAssets ? 0 : highWaterMarkAssets - assets;
        emit PrincipalTracked(principalTracked, highWaterMarkAssets);
    }

    function collectFees() external onlyOwner nonReentrant returns (uint256 feeAmount) {
        uint256 currentAssets = vault.totalAssets();
        if (currentAssets <= highWaterMarkAssets) {
            return 0;
        }

        uint256 gain = currentAssets - highWaterMarkAssets;
        feeAmount = (gain * feeBps) / BPS_DENOMINATOR;
        if (feeAmount == 0) {
            return 0;
        }

        vault.transferFeesToCollector(feeAmount);
        assetToken.safeTransfer(treasuryAddress, feeAmount);

        highWaterMarkAssets = currentAssets - feeAmount;
        emit FeesCollected(feeAmount, treasuryAddress);
    }
}
