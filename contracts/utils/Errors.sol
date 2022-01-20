// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

library Errors {
    string public constant USER_DEPOSIT_NOT_PERMITTED = "1";
    string public constant USER_WITHDRAW_NOT_PERMITTED = "2";
    string public constant VAULT_DEPOSIT = "3";
    string public constant VAULT_WITHDRAW = "4";
    string public constant EMPTY_STRING = "5";
    string public constant RISK_PROFILE_EXISTS = "6";
    string public constant NOT_A_CONTRACT = "7";
    string public constant TOKEN_NOT_APPROVED = "8";
}
