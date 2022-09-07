// solhint-disable
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import { Vault } from "../../protocol/tokenization/Vault.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestDepositProtection {
    ERC20 tokenAddr;
    Vault vaultAddr;

    constructor(Vault _vault, ERC20 _erc20) public {
        vaultAddr = _vault;
        tokenAddr = _erc20;
    }

    function runUserDepositVault(
        uint256 _userDepositUT,
        bytes calldata _permit,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        tokenAddr.approve(address(vaultAddr), _userDepositUT);
        vaultAddr.userDepositVault(address(this), _userDepositUT, _permit, _accountProofs, _codeProofs);
    }

    function runUserWithdrawVault(
        uint256 _userWithdrawVT,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        vaultAddr.userWithdrawVault(address(this), _userWithdrawVT, _accountProofs, _codeProofs);
    }

    function runTwoTxnUserDepositVault(
        uint256 _userDepositUT,
        bytes calldata _permit,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        tokenAddr.approve(address(vaultAddr), (_userDepositUT + _userDepositUT));
        vaultAddr.userDepositVault(address(this), _userDepositUT, _permit, _accountProofs, _codeProofs);
        vaultAddr.userDepositVault(address(this), _userDepositUT, _permit, _accountProofs, _codeProofs);
    }

    function runTwoTxnUserWithdrawVault(
        uint256 _userDepositUT,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        tokenAddr.approve(address(vaultAddr), (_userDepositUT + _userDepositUT));
        tokenAddr.transfer(address(vaultAddr), (_userDepositUT + _userDepositUT));
        vaultAddr.userWithdrawVault(address(this), _userDepositUT, _accountProofs, _codeProofs);
        vaultAddr.userWithdrawVault(address(this), _userDepositUT, _accountProofs, _codeProofs);
    }

    function runTwoTxnDepositAndWithdraw(
        uint256 _userDepositUT,
        bytes calldata _permit,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        tokenAddr.approve(address(vaultAddr), _userDepositUT);
        vaultAddr.userDepositVault(address(this), _userDepositUT, _permit, _accountProofs, _codeProofs);
        vaultAddr.userWithdrawVault(address(this), _userDepositUT, _accountProofs, _codeProofs);
    }

    function runTwoTxnDepositAndTransfer(
        uint256 _userDepositUT,
        bytes calldata _permit,
        bytes32[] calldata _accountProofs,
        bytes32[] calldata _codeProofs
    ) external {
        tokenAddr.approve(address(vaultAddr), _userDepositUT);
        vaultAddr.userDepositVault(address(this), _userDepositUT, _permit, _accountProofs, _codeProofs);
        vaultAddr.transfer(msg.sender, _userDepositUT);
    }

    function getBalance() external view returns (uint256) {
        uint256 balance = vaultAddr.balanceUT();
        return balance;
    }
}
