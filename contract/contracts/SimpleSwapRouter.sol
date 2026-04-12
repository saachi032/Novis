// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IUniswapRouter} from "./interfaces/IUniswapRouter.sol";

contract SimpleSwapRouter is IUniswapRouter {
    using SafeERC20 for IERC20;

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut) {
        // Transfer tokenIn from sender to this contract
        IERC20(params.tokenIn).safeTransferFrom(
            msg.sender,
            address(this),
            params.amountIn
        );
        amountOut = params.amountIn;
        require(amountOut >= params.amountOutMinimum, "SimpleSwapRouter: insufficient output");
        IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);
        return amountOut;
    }
}
