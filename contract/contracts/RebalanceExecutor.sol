// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAutomationCompatible} from "./interfaces/IAutomationCompatible.sol";
import {StrategyRouter} from "./StrategyRouter.sol";

contract RebalanceExecutor is Ownable, Pausable, ReentrancyGuard, IAutomationCompatible {
    uint256 public constant BPS_DENOMINATOR = 10_000;

    StrategyRouter public immutable strategyRouter;

    uint256 public thresholdBps = 300;
    uint256 public cooldown = 1 days;
    uint256 public lookaheadWindow = 7 days;
    uint256 public estimatedGasCostInAsset = 2e6;
    uint256 public lastRebalanceTime;

    event ThresholdUpdated(uint256 thresholdBps);
    event CooldownUpdated(uint256 cooldown);
    event LookaheadWindowUpdated(uint256 lookaheadWindow);
    event EstimatedGasCostUpdated(uint256 estimatedGasCostInAsset);
    event RebalanceTriggered(
        StrategyRouter.Protocol indexed fromProtocol,
        StrategyRouter.Protocol indexed toProtocol,
        uint256 amount,
        uint256 timestamp
    );

    constructor(address strategyRouter_, address initialOwner_) Ownable(initialOwner_) {
        require(strategyRouter_ != address(0), "strategyRouter=0");
        strategyRouter = StrategyRouter(strategyRouter_);
    }

    function setThresholdBps(uint256 newThresholdBps) external onlyOwner {
        thresholdBps = newThresholdBps;
        emit ThresholdUpdated(newThresholdBps);
    }

    function setCooldown(uint256 newCooldown) external onlyOwner {
        cooldown = newCooldown;
        emit CooldownUpdated(newCooldown);
    }

    function setLookaheadWindow(uint256 newLookaheadWindow) external onlyOwner {
        require(newLookaheadWindow > 0, "window=0");
        lookaheadWindow = newLookaheadWindow;
        emit LookaheadWindowUpdated(newLookaheadWindow);
    }

    function setEstimatedGasCostInAsset(uint256 newEstimatedGasCostInAsset) external onlyOwner {
        estimatedGasCostInAsset = newEstimatedGasCostInAsset;
        emit EstimatedGasCostUpdated(newEstimatedGasCostInAsset);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        return _previewRebalance();
    }

    function performUpkeep(bytes calldata) external override whenNotPaused nonReentrant {
        (
            bool upkeepNeeded,
            bytes memory performData
        ) = _previewRebalance();
        require(upkeepNeeded, "upkeep not needed");

        (
            StrategyRouter.Protocol fromProtocol,
            StrategyRouter.Protocol toProtocol,
            uint256 amount,
            ,
            uint256 projectedGain
        ) = abi.decode(
                performData,
                (StrategyRouter.Protocol, StrategyRouter.Protocol, uint256, uint256, uint256)
            );

        require(projectedGain > estimatedGasCostInAsset, "not profitable");

        strategyRouter.rebalance(fromProtocol, toProtocol, amount);
        lastRebalanceTime = block.timestamp;

        emit RebalanceTriggered(fromProtocol, toProtocol, amount, block.timestamp);
    }

    function manualRebalance() external onlyOwner whenNotPaused nonReentrant {
        (
            bool upkeepNeeded,
            bytes memory performData
        ) = _previewRebalance();
        require(upkeepNeeded, "rebalance not needed");

        (
            StrategyRouter.Protocol fromProtocol,
            StrategyRouter.Protocol toProtocol,
            uint256 amount,
            ,
            uint256 projectedGain
        ) = abi.decode(
                performData,
                (StrategyRouter.Protocol, StrategyRouter.Protocol, uint256, uint256, uint256)
            );

        require(projectedGain > estimatedGasCostInAsset, "not profitable");

        strategyRouter.rebalance(fromProtocol, toProtocol, amount);
        lastRebalanceTime = block.timestamp;

        emit RebalanceTriggered(fromProtocol, toProtocol, amount, block.timestamp);
    }

    function _previewRebalance() internal view returns (bool upkeepNeeded, bytes memory performData) {
        if (paused() || block.timestamp < lastRebalanceTime + cooldown) {
            return (false, bytes(""));
        }

        (uint256 aaveAPYBps, uint256 compoundAPYBps) = strategyRouter.getCurrentAPYs();
        if (aaveAPYBps == compoundAPYBps) {
            return (false, bytes(""));
        }

        uint256 apyGapBps = aaveAPYBps > compoundAPYBps ? aaveAPYBps - compoundAPYBps : compoundAPYBps - aaveAPYBps;
        if (apyGapBps <= thresholdBps) {
            return (false, bytes(""));
        }

        StrategyRouter.Protocol fromProtocol = aaveAPYBps > compoundAPYBps
            ? StrategyRouter.Protocol.Compound
            : StrategyRouter.Protocol.Aave;
        StrategyRouter.Protocol toProtocol = aaveAPYBps > compoundAPYBps
            ? StrategyRouter.Protocol.Aave
            : StrategyRouter.Protocol.Compound;

        uint256 amount = strategyRouter.protocolBalance(fromProtocol);
        if (amount == 0) {
            return (false, bytes(""));
        }

        uint256 projectedGain = (amount * apyGapBps * lookaheadWindow) / (365 days * BPS_DENOMINATOR);
        if (projectedGain <= estimatedGasCostInAsset) {
            return (false, bytes(""));
        }

        performData = abi.encode(fromProtocol, toProtocol, amount, apyGapBps, projectedGain);
        return (true, performData);
    }
}
