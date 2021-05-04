// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import { RiskManager } from "../configuration/RiskManager.sol";
import { OPTYMinter } from "./OPTYMinter.sol";

/**
 * @dev Control to store state variables of Staking pool
 */

contract StakingPoolStorage {
    mapping(address => uint256) public userLastUpdate;
    uint256 public lastPoolUpdate;
    uint256 public optyRatePerBlock;
    address public token; //  store the underlying token contract address (for example DAI)
    uint256 public poolValue;
    OPTYMinter public optyMinterContract;
    address public optyStakingRateBalancer;
}
