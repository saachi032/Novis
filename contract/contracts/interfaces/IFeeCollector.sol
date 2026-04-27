pragma solidity ^0.8.28;

interface IFeeCollector {
    function recordDeposit(uint256 assets) external;

    function recordWithdrawal(uint256 assets) external;
}
