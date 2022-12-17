// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

library Errors {
    string public constant USER_WITHDRAW_INSUFFICIENT_VT = "1";
    string public constant EMPTY_STRING = "2";
    string public constant RISK_PROFILE_EXISTS = "3";
    string public constant EOA_NOT_WHITELISTED = "4";
    string public constant MINIMUM_USER_DEPOSIT_VALUE_UT = "4";
    string public constant TOTAL_VALUE_LOCKED_LIMIT_UT = "5";
    string public constant USER_DEPOSIT_CAP_UT = "6";
    string public constant VAULT_EMERGENCY_SHUTDOWN = "7";
    string public constant VAULT_PAUSED = "8";
    string public constant EMERGENCY_BRAKE = "9";
    string public constant UNDERLYING_TOKENS_HASH_EXISTS = "10";
    string public constant TRANSFER_TO_THIS_CONTRACT = "11";
    string public constant UNDERLYING_TOKEN_APPROVED = "12";
    string public constant NOTHING_TO_CLAIM = "13";
    string public constant PERMIT_FAILED = "14";
    string public constant PERMIT_LEGACY_FAILED = "15";
    string public constant ZERO_ADDRESS_NOT_VALID = "16";
    string public constant INVALID_EXPIRATION = "17";
    string public constant INVALID_SIGNATURE = "18";
    string public constant LENGTH_MISMATCH = "19";
    string public constant STRATEGY_NOT_SET = "20";
    string public constant ADD_STRATEGY = "21";
    string public constant REMOVE_STRATEGY = "22";
}
