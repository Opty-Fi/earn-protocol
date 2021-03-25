// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

/**
 * @dev Interface of the Opty.fi vaults.
 */
interface IVault {

    function setProfile(string memory _profile) external returns (bool _success);

    function setOPTYMinter(address _optyMinter) external returns (bool _success);

    function setRiskManager(address _riskManager) external returns (bool _success);
    
    function setToken(address _underlyingToken) external returns (bool _success);

    function setStrategyCodeProvider(address _strategyCodeProvider) external returns (bool _success);
    
    function setMaxPoolValueJump(uint256 _maxPoolValueJump) external returns (bool _success);
    
    // function _supplyAll() external;

    function rebalance() external;

    // function _calPoolValueInToken() external view returns (uint256);

    function balance() external view returns (uint256);

    // function _withdrawAll() external;

    function harvest(bytes32 _hash) external;
    
    function userDepositAll() external;

    function userDeposit(uint256 _amount) external returns (bool _success);
    
    function userDepositAndStake(uint256 _amount) external returns (bool _success);

    // function _batchMintAndBurn() external returns (bool _success);
    
    function userDepositAllRebalance() external;

    function userDepositRebalance(uint256 _amount) external returns (bool _success);

    function userDepositRebalanceAndStake(uint256 _amount) external returns (bool _success);
    
    function userWithdrawAllRebalance() external;

    function userWithdrawRebalance(uint256 _redeemAmount) external returns (bool);
    
    function userDepositWithCHI(uint256 _amount) external;
    
    function userDepositAndStakeWithCHI(uint256 _amount) external;
    
    function userDepositRebalanceWithCHI(uint256 _amount) external;
    
    function userDepositRebalanceAndStakeWithCHI(uint256 _amount) external;
    
    function userWithdrawRebalanceWithCHI(uint256 _redeemAmount) external;

    // function _emergencyBrake(uint256 _poolValue) external returns (bool);

    // function _abs(uint256 _a, uint256 _b) external pure returns (uint256);

    function isMaxPoolValueJumpAllowed(uint256 _diff, uint256 _currentPoolValue) external view returns (bool);

    // function _redeemAndBurn(
    //     address _account,
    //     uint256 _balance,
    //     uint256 _redeemAmount
    // ) external;

    // function _mintShares(
    //     address _account,
    //     uint256 _balance,
    //     uint256 _depositAmount
    // ) external;

    function getPricePerFullShare() external view returns (uint256);
    
    function discontinue() external;

    function setPaused(bool _paused) external;
}