// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import { Modifiers } from "../../protocol/configuration/Modifiers.sol";
import { OPTYStakingRateBalancerProxy } from "../../protocol/tokenization/OPTYStakingRateBalancerProxy.sol";
import { OPTYStakingRateBalancerStorage } from "../../protocol/tokenization/OPTYStakingRateBalancerStorage.sol";
import { TestStorageV2 } from "./TestStorageV2.sol";
import { IOPTYStakingRateBalancer } from "../../interfaces/opty/IOPTYStakingRateBalancer.sol";

contract TestOptyStakingRateBalancerNewImplementation is OPTYStakingRateBalancerStorage, TestStorageV2, Modifiers {
    uint256 public rateLock;

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /**
     * @dev Set TestOptyStakingRateBalancerNewImplementation to act as OPTYStakingRateBalancer
     * @param _optyStakingRateBalancerProxy contract address to act as OPTYStakingRateBalancer
     */
    function become(OPTYStakingRateBalancerProxy _optyStakingRateBalancerProxy) external onlyGovernance {
        require(_optyStakingRateBalancerProxy.acceptImplementation() == 0, "!unauthorized");
    }

    function isNewContract() external pure returns (bool) {
        return isNewVariable;
    }

    function updateStakedOPTY(address _optyStakingBalancer, uint256 _amount) public returns (bool) {
        return IOPTYStakingRateBalancer(_optyStakingBalancer).updateStakedOPTY(msg.sender, _amount);
    }

    function updateUnstakedOPTY(address _optyStakingBalancer, uint256 _amount) public returns (bool) {
        return IOPTYStakingRateBalancer(_optyStakingBalancer).updateUnstakedOPTY(msg.sender, _amount);
    }

    function updateOptyRates(address _optyStakingBalancer) public returns (bool) {
        return IOPTYStakingRateBalancer(_optyStakingBalancer).updateOptyRates();
    }

    function setOptyRatePerSecond(uint256 _rateLock) public returns (bool) {
        rateLock = _rateLock;
        return true;
    }

    function balanceOf(address) public view returns (uint256) {
        return 0;
    }
}
