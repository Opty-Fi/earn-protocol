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

    function runUserDepositVault(
        uint256 _userDepositUT,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        tokenAddr.approve(address(vaultAddr), _userDepositUT);
        vaultAddr.userDepositVault(_userDepositUT, _accountProofs, _codeProofs);
    }

    function runUserWithdrawVault(
        uint256 _userWithdrawVT,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        vaultAddr.userWithdrawVault(_userWithdrawVT, _accountProofs, _codeProofs);
    }

    function runTwoTxnUserDepositVault(
        uint256 _minAmountUT,
        uint256 _maxAmountUT,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        tokenAddr.approve(address(vaultAddr), (_minAmountUT + _maxAmountUT));
        vaultAddr.userDepositVault(_maxAmountUT, _accountProofs, _codeProofs);
        vaultAddr.userDepositVault(_minAmountUT, _accountProofs, _codeProofs);
    }

    function runTwoTxnUserWithdrawVault(
        uint256 _minAmount,
        uint256 _maxAmount,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        tokenAddr.approve(address(vaultAddr), (_minAmount + _maxAmount));
        tokenAddr.transfer(address(vaultAddr), _maxAmount);
        vaultAddr.userWithdrawVault(_maxAmount, _accountProofs, _codeProofs);
        tokenAddr.transfer(address(vaultAddr), _minAmount);
        vaultAddr.userWithdrawVault(_minAmount, _accountProofs, _codeProofs);
    }

    function runTwoTxnUserWithdrawVaultNoDeposit(
        uint256 _minAmountVT,
        uint256 _maxAmountVT,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        tokenAddr.approve(address(vaultAddr), (_minAmountVT + _maxAmountVT));
        tokenAddr.transfer(address(vaultAddr), _maxAmountVT);
        vaultAddr.userWithdrawVault(_maxAmountVT, _accountProofs, _codeProofs);
        tokenAddr.transfer(address(vaultAddr), _minAmountVT);
        vaultAddr.userWithdrawVault(_minAmountVT, _accountProofs, _codeProofs);
    }

    function runTwoTxnWithdrawAndDepositRebalance(
        uint256 _minAmount,
        uint256 _maxAmount,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        tokenAddr.approve(address(vaultAddr), _maxAmount);
        vaultAddr.userDepositVault(_maxAmount, _accountProofs, _codeProofs);
        tokenAddr.transfer(address(vaultAddr), _minAmount);
        vaultAddr.userWithdrawVault(_minAmount, _accountProofs, _codeProofs);
    }

    function getBalance() external view returns (uint256) {
        uint256 balance = vaultAddr.balanceUT();
        return balance;
    }
}
