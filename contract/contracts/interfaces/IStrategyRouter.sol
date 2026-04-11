pragma solidity ^0.8.28;

interface IStrategyRouter {
    function totalManagedAssets() external view returns (uint256);

    function investFunds(uint256 amount) external;

    function withdrawToVault(uint256 amount) external returns (uint256 withdrawn);
}
