// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import { DataTypes } from "../../libraries/types/DataTypes.sol";

interface IVaultBooster {
    /**
     * @notice Claim all the ODEFI accrued by holder in all markets
     * @param _holder The address to claim ODEFI for
     */
    function claimODEFI(address _holder) external returns (uint256);

    /**
     * @notice Claim all the ODEFI accrued by holder in the specified markets
     * @param _holder The address to claim ODEFI for
     * @param _odefiVaults The list of vaults to claim ODEFI in
     */
    function claimODEFI(address _holder, address[] memory _odefiVaults) external returns (uint256);

    /**
     * @notice Claim all odefi accrued by the holders
     * @param _holders The addresses to claim ODEFI for
     * @param _odefiVaults The list of vaults to claim ODEFI in
     */
    function claimODEFI(address[] memory _holders, address[] memory _odefiVaults) external returns (uint256);

    /**
     * @notice Calculate additional accrued ODEFI for a contributor since last accrual
     * @param _user The address to calculate contributor rewards for
     */
    function updateUserRewards(address _odefiVault, address _user) external;

    function updateUserStateInVault(address _odefiVault, address _user) external;

    /**
     * @notice Set the ODEFI rate for a specific pool
     * @return The amount of ODEFI which was NOT transferred to the user
     */
    function updateOdefiVaultRatePerSecondAndVaultToken(address _odefiVault) external returns (bool);

    /**
     * @notice Accrue ODEFI to the market by updating the supply index
     * @param _odefiVault The market whose index to update
     */
    function updateOdefiVaultIndex(address _odefiVault) external returns (uint224);

    /**
     * @notice Set the ODEFI rate for a specific pool
     * @return The amount of ODEFI which was NOT transferred to the user
     */
    function setRewardRate(address _odefiVault, uint256 _rate) external returns (bool);

    function setRewarder(address _odefiVault, address _rewarder) external returns (bool);

    function addOdefiVault(address _odefiVault) external returns (bool);

    function setOdefiVault(address _odefiVault, bool _enable) external returns (bool);

    /**
     * @notice Claim all the odefi accrued by holder in all markets
     * @param _holder The address to claim ODEFI for
     */
    function claimableODEFI(address _holder) external view returns (uint256);

    /**
     * @notice Claim all the odefi accrued by holder in the specified markets
     * @param _holder The address to claim ODEFI for
     * @param _odefiVaults The list of vaults to claim ODEFI in
     */
    function claimableODEFI(address _holder, address[] memory _odefiVaults) external view returns (uint256);

    function currentOdefiVaultIndex(address _odefiVault) external view returns (uint256);

    function balance() external view returns (uint256);

    function rewardDepletionSeconds(address _odefiVault) external view returns (uint256);

    function getOdefiAddress() external view returns (address);

    function getBlockTimestamp() external view returns (uint256);
}
