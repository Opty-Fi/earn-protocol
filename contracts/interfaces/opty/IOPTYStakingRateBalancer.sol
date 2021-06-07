// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

/**
 * @dev Interface of the Opty.fi staking rate balancer.
 */
interface IOPTYStakingRateBalancer {
    function setStakingVaultMultipliers(address _stakingVault, uint256 _multiplier) external returns (bool);

    function setStakingVaultOPTYAllocation(uint256 _stakingVaultOPTYAllocation) external returns (bool);

    function updateOptyRates() external returns (bool);

    function updateStakedOPTY(address _staker, uint256 _amount) external returns (bool);

    function updateUnstakedOPTY(address _staker, uint256 _shares) external returns (bool);
}
