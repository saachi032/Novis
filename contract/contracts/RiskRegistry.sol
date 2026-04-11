// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRiskRegistry} from "./interfaces/IRiskRegistry.sol";

contract RiskRegistry is Ownable, IRiskRegistry {
    mapping(address user => RiskLevel level) public userRisk;
    mapping(address user => bool isSet) public userRiskConfigured;

    event RiskLevelUpdated(address indexed user, RiskLevel level);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setRiskLevel(RiskLevel level) external override {
        userRisk[msg.sender] = level;
        userRiskConfigured[msg.sender] = true;
        emit RiskLevelUpdated(msg.sender, level);
    }

    function getRiskLevel(address user) external view override returns (RiskLevel) {
        if (!userRiskConfigured[user]) {
            return RiskLevel.Balanced;
        }
        return userRisk[user];
    }
}
