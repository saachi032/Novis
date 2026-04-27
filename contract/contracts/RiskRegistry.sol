pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRiskRegistry} from "./interfaces/IRiskRegistry.sol";

contract RiskRegistry is Ownable, IRiskRegistry {
    struct UserStrategy {
        RiskProfile riskProfile;
        CheckingDuration checkingDuration;
        uint256 lastRebalanceTime;
        bool exists;
    }

    mapping(address user => UserStrategy strategy) public userStrategies;
    mapping(RiskProfile risk => uint8 percentage) public riskToPercentage;
    mapping(CheckingDuration duration => uint256 secondsValue) public durationToSeconds;
    mapping(address caller => bool isAuthorized) public authorizedCallers;

    event StrategySet(address indexed user, RiskProfile riskProfile, CheckingDuration checkingDuration);
    event AuthorizedCallerUpdated(address indexed caller, bool isAuthorized);

    error UnauthorizedCaller();

    modifier onlyAuthorized() {
        if (msg.sender != owner() && !authorizedCallers[msg.sender]) revert UnauthorizedCaller();
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        riskToPercentage[RiskProfile.Low] = 40;
        riskToPercentage[RiskProfile.Medium] = 60;
        riskToPercentage[RiskProfile.High] = 80;

        durationToSeconds[CheckingDuration.Daily] = 1 days;
        durationToSeconds[CheckingDuration.Weekly] = 7 days;
        durationToSeconds[CheckingDuration.Monthly] = 30 days;
        durationToSeconds[CheckingDuration.Quarterly] = 90 days;
        durationToSeconds[CheckingDuration.HalfYearly] = 180 days;
    }

    function setStrategy(RiskProfile risk, CheckingDuration duration) external override {
        userStrategies[msg.sender] = UserStrategy({
            riskProfile: risk,
            checkingDuration: duration,
            lastRebalanceTime: block.timestamp,
            exists: true
        });

        emit StrategySet(msg.sender, risk, duration);
    }

    function getUserStrategy(address user) external view override returns (uint8 riskPercentage, uint256 durationSeconds) {
        UserStrategy memory strategy = userStrategies[user];
        if (!strategy.exists) {
            return (0, 0);
        }

        riskPercentage = riskToPercentage[strategy.riskProfile];
        durationSeconds = durationToSeconds[strategy.checkingDuration];
    }

    function getStrategyDetails(
        address user
    ) external view override returns (RiskProfile riskProfile, CheckingDuration checkingDuration, uint256 lastRebalanceTime, bool exists) {
        UserStrategy memory strategy = userStrategies[user];
        return (strategy.riskProfile, strategy.checkingDuration, strategy.lastRebalanceTime, strategy.exists);
    }

    function canRebalance(address user) external view override returns (bool) {
        UserStrategy memory strategy = userStrategies[user];
        if (!strategy.exists) {
            return false;
        }

        uint256 requiredDuration = durationToSeconds[strategy.checkingDuration];
        return block.timestamp >= strategy.lastRebalanceTime + requiredDuration;
    }

    function updateLastRebalanceTime(address user) external override onlyAuthorized {
        if (!userStrategies[user].exists) {
            return;
        }
        userStrategies[user].lastRebalanceTime = block.timestamp;
    }

    function hasStrategy(address user) external view override returns (bool) {
        return userStrategies[user].exists;
    }

    function setAuthorizedCaller(address caller, bool isAuthorized) external override onlyOwner {
        authorizedCallers[caller] = isAuthorized;
        emit AuthorizedCallerUpdated(caller, isAuthorized);
    }
}
