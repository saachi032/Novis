// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAutomationCompatible} from "./interfaces/IAutomationCompatible.sol";
import {StrategyRouter} from "./StrategyRouter.sol";

contract RebalanceExecutor is Ownable, Pausable, ReentrancyGuard, IAutomationCompatible {
    StrategyRouter public immutable strategyRouter;

    event UserRebalanceRequested(address indexed user, bool forced, uint256 timestamp);

    constructor(address strategyRouter_, address initialOwner_) Ownable(initialOwner_) {
        require(strategyRouter_ != address(0), "strategyRouter=0");
        strategyRouter = StrategyRouter(strategyRouter_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function checkUpkeep(bytes calldata) external pure override returns (bool upkeepNeeded, bytes memory performData) {
        return (false, bytes(""));
    }

    function performUpkeep(bytes calldata) external pure override {
        revert("off-chain keeper only");
    }

    function manualRebalance(address user) external onlyOwner whenNotPaused nonReentrant {
        strategyRouter.rebalance(user);
        emit UserRebalanceRequested(user, false, block.timestamp);
    }

    function forceRebalance(address user) external onlyOwner whenNotPaused nonReentrant {
        strategyRouter.forceRebalance(user);
        emit UserRebalanceRequested(user, true, block.timestamp);
    }
}
