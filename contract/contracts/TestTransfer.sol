pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TestTransfer {
    using SafeERC20 for IERC20;

    function testSafeTransfer(address tokenIn, uint256 amountIn) external {
        require(amountIn > 0, "Amount must be > 0");
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
    }

    function tokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
