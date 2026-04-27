// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockDAI
 * @notice Mock DAI token for Base Sepolia testnet
 * Allows anyone to mint tokens for testing purposes
 */
contract MockDAI is ERC20, Ownable {
    uint8 private _decimals = 18;

    constructor(address initialOwner) ERC20("Mock DAI Stablecoin", "DAI") Ownable(initialOwner) {}

    /**
     * @notice Mint tokens (anyone can call for testnet)
     * @param to Recipient address
     * @param amount Amount to mint (in wei)
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    /**
     * @notice Owner can mint additional tokens
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function ownerMint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
