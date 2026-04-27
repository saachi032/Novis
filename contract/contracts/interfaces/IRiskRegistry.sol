pragma solidity ^0.8.28;

interface IRiskRegistry {
    enum RiskProfile {
        Low,
        Medium,
        High
    }

    enum CheckingDuration {
        Daily,
        Weekly,
        Monthly,
        Quarterly,
        HalfYearly
    }

    function setStrategy(RiskProfile risk, CheckingDuration duration) external;

    function getUserStrategy(address user) external view returns (uint8 riskPercentage, uint256 durationSeconds);

    function getStrategyDetails(
        address user
    ) external view returns (RiskProfile riskProfile, CheckingDuration checkingDuration, uint256 lastRebalanceTime, bool exists);

    function canRebalance(address user) external view returns (bool);

    function updateLastRebalanceTime(address user) external;

    function hasStrategy(address user) external view returns (bool);

    function setAuthorizedCaller(address caller, bool isAuthorized) external;
}
