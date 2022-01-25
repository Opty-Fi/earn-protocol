// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

library Errors {
    string public constant USER_DEPOSIT_NOT_PERMITTED = "1";
    string public constant USER_WITHDRAW_INSUFFICIENT_VT = "2";
    string public constant VAULT_DEPOSIT = "3";
    string public constant VAULT_WITHDRAW = "4";
    string public constant EMPTY_STRING = "5";
    string public constant RISK_PROFILE_EXISTS = "6";
    string public constant NOT_A_CONTRACT = "7";
    string public constant TOKEN_NOT_APPROVED = "8";
    string public constant USER_NOT_WHITELISTED = "9";
    string public constant MINIMUM_USER_DEPOSIT_VALUE_UT = "10";
    string public constant TOTAL_VALUE_LOCKED_LIMIT_UT = "11";
    string public constant USER_DEPOSIT_CAP_UT = "12";
    string public constant VAULT_DISCONTINUED = "13";
    string public constant VAULT_PAUSED = "14";
    string public constant ADMIN_CALL = "15";
}
