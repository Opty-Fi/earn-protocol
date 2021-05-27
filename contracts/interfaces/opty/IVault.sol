// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

/**
 * @dev Interface of the Opty.fi Vaults.
 */
interface IVault {
    function setProfile(string memory _profile) external returns (bool _success);

    function setOPTYMinter(address _optyMinter) external returns (bool _success);

    function setRiskManager(address _riskManager) external returns (bool _success);

    function setToken(address _underlyingToken) external returns (bool _success);

    function setStrategyManager(address _strategyCodeProvider) external returns (bool _success);

    function setMaxVaultValueJump(uint256 _maxVaultValueJump) external returns (bool _success);

    function rebalance() external;

    function balance() external view returns (uint256);

    function harvest(bytes32 _hash) external;

    function isMaxVaultValueJumpAllowed(uint256 _diff, uint256 _currentVaultValue) external view returns (bool);

    function getPricePerFullShare() external view returns (uint256);

    function discontinue() external;

    function setUnpaused(bool _unpaused) external;

    // no CHI functions

    function userDepositAll() external;

    function userDepositAllAndStake(address _stakingVault) external returns (bool _success);

    function userDeposit(uint256 _amount) external returns (bool _success);

    function userDepositAndStake(uint256 _amount, address _stakingVault) external returns (bool _success);

    function userDepositAllRebalance() external;

    function userDepositAllRebalanceAndStake(address _stakingVault) external returns (bool _success);

    function userDepositRebalance(uint256 _amount) external returns (bool _success);

    function userDepositRebalanceAndStake(uint256 _amount, address _stakingVault) external returns (bool _success);

    function userWithdrawAllRebalance() external;

    function userWithdrawRebalance(uint256 _redeemAmount) external returns (bool);

    // CHI token functions

    function userDepositAllWithCHI() external;

    function userDepositAllAndStakeWithCHI(address _stakingVault) external;

    function userDepositWithCHI(uint256 _amount) external;

    function userDepositAndStakeWithCHI(uint256 _amount, address _stakingVault) external;

    function userDepositAllRebalanceWithCHI() external;

    function userDepositAllRebalanceAndStakeWithCHI(address _stakingVault) external;

    function userDepositRebalanceWithCHI(uint256 _amount) external;

    function userDepositRebalanceAndStakeWithCHI(uint256 _amount, address _stakingVault) external;

    function userWithdrawAllRebalanceWithCHI() external;

    function userWithdrawRebalanceWithCHI(uint256 _redeemAmount) external;
}
