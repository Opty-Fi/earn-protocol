// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import { RiskManagerStorage } from "../../protocol/configuration/RiskManagerStorage.sol";
import { RiskManagerProxy } from "../../protocol/configuration/RiskManagerProxy.sol";
import { Modifiers } from "../../protocol/configuration/Modifiers.sol";
import { NewImplementationStorage } from "./NewImplementationStorage.sol";

contract TestRiskManagerNewImplementation is RiskManagerStorage, NewImplementationStorage, Modifiers {
    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /**
     * @dev Set TestRiskManagerNewImplementation to act as RiskManager
     * @param _riskManagerProxy RiskManagerProxy contract address to act as RiskManager
     */
    function become(RiskManagerProxy _riskManagerProxy) external onlyGovernance {
        require(_riskManagerProxy.acceptImplementation() == 0, "!unauthorized");
    }

    function isNewContract() external view returns (bool) {
        return isNewVariable;
    }
}
