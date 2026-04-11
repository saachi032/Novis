pragma solidity ^0.8.28;

interface IRiskRegistry {
    enum RiskLevel {
        Conservative,
        Balanced,
        Aggressive
    }

    function setRiskLevel(RiskLevel level) external;

    function getRiskLevel(address user) external view returns (RiskLevel);
}
