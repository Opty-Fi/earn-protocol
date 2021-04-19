// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./controller/StrategyProvider.sol";

contract RiskManagerStorage {
    /**
     * @notice Active brains of Risk Manager
     */
    address public riskManagerImplementation;
    
    /**
     * @notice Pending brains of Risk Manager
     */
    address public pendingRiskManagerImplementation;
    
    StrategyProvider public strategyProvider;
}
