
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

interface ICompoundToken {
    function supplyRatePerBlock() external view returns (uint256);

    function supply(address asset, uint256 amount) external;

    function withdraw(address asset, uint256 amount) external;
}
