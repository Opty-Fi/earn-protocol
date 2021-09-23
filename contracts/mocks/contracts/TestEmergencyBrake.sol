// solhint-disable
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import { Vault } from "../../protocol/tokenization/Vault.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestEmergencyBrake {
    ERC20 tokenAddr;
    Vault vaultAddr;

    constructor(Vault _vault, ERC20 _erc20) public {
        vaultAddr = _vault;
        tokenAddr = _erc20;
    }

    function runDepositRebalance(uint256 amount) external {
        tokenAddr.approve(address(vaultAddr), amount);
        vaultAddr.userDepositRebalance(amount);
    }

    function runWithdrawAllRebalance() external {
        vaultAddr.userWithdrawAllRebalance();
    }

    function runTwoTxnDepositRebalance(uint256 minAmount, uint256 maxAmount) external {
        tokenAddr.approve(address(vaultAddr), (minAmount + maxAmount));
        vaultAddr.userDepositRebalance(maxAmount);
        vaultAddr.userDepositRebalance(minAmount);
    }

    function runTwoTxnWithdrawRebalance(uint256 minAmount, uint256 maxAmount) external {
        tokenAddr.approve(address(vaultAddr), (minAmount + maxAmount));
        tokenAddr.transfer(address(vaultAddr), maxAmount);
        vaultAddr.userWithdrawRebalance(maxAmount);
        tokenAddr.transfer(address(vaultAddr), minAmount);
        vaultAddr.userWithdrawRebalance(minAmount);
    }

    function runTwoTxnWithdrawRebalanceNoDeposit(uint256 minAmount, uint256 maxAmount) external {
        tokenAddr.approve(address(vaultAddr), (minAmount + maxAmount));
        tokenAddr.transfer(address(vaultAddr), maxAmount);
        vaultAddr.userWithdrawRebalance(maxAmount);
        tokenAddr.transfer(address(vaultAddr), minAmount);
        vaultAddr.userWithdrawRebalance(minAmount);
    }

    function runTwoTxnRebalance(uint256 minAmount, uint256 maxAmount) external {
        tokenAddr.approve(address(vaultAddr), (minAmount + maxAmount));
        tokenAddr.transfer(address(vaultAddr), maxAmount);
        vaultAddr.rebalance();
        tokenAddr.transfer(address(vaultAddr), minAmount);
        vaultAddr.rebalance();
    }

    function runTwoTxnWithdrawAndDepositRebalance(uint256 minAmount, uint256 maxAmount) external {
        tokenAddr.approve(address(vaultAddr), (maxAmount));
        vaultAddr.userDepositRebalance(maxAmount);
        tokenAddr.transfer(address(vaultAddr), minAmount);
        vaultAddr.userWithdrawRebalance(minAmount);
    }

    function getBalance() external view returns (uint256) {
        uint256 balance = vaultAddr.balance();
        return balance;
    }
}
