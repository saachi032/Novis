// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IStrategyRouter {
    function totalManagedAssets() external view returns (uint256);

    function getUserProtocolBalances(address user)
        external
        view
        returns (uint256 aaveBalance, uint256 compoundBalance, uint256 morphoBalance);

    function investFunds(uint256 amount, address user) external;

    function redeemFunds(uint256 amount, address user) external returns (uint256 withdrawn);

    function rebalance(address user) external;

    function forceRebalance(address user) external;
}
