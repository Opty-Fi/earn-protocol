// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../interfaces/opty/IOPTYStakingPool.sol";
import "../libraries/SafeERC20.sol";
import "./OPTYStakingRateBalancerStorage.sol";
import "./OPTYStakingRateBalancerProxy.sol";
import "../libraries/SafeMath.sol";
import "../utils/Modifiers.sol";

contract OPTYStakingRateBalancer is Modifiers, OPTYStakingRateBalancerStorage {

    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    constructor(
        address _registry
    ) public Modifiers(_registry) {
    }

    /**
     * @dev initialize the different stakingPools 
     * 
     */
    function initialize(
        address _stakingPoolNoLockingPeriod,
        address _stakingPool30DLockingTerm,
        address _stakingPool60DLockingTerm,
        address _stakingPool180DLockingTerm
    ) public onlyGovernance {
        stakingPoolNoLockingTerm = _stakingPoolNoLockingPeriod;
        stakingPool30DLockingTerm = _stakingPool30DLockingTerm;
        stakingPool60DLockingTerm = _stakingPool60DLockingTerm;
        stakingPool180DLockingTerm = _stakingPool180DLockingTerm;
        stakingPools[stakingPoolNoLockingTerm] = true;
        stakingPools[stakingPool30DLockingTerm] = true;
        stakingPools[stakingPool60DLockingTerm] = true;
        stakingPools[stakingPool180DLockingTerm] = true;
    }

    /**
     * @dev Set OPTYStakingRateBalancerProxy to act as OPTYStakingRateBalancer
     * 
     */
    function become(OPTYStakingRateBalancerProxy _OPTYStakingRateBalancerProxy) public onlyGovernance {
        require(_OPTYStakingRateBalancerProxy.acceptImplementation() == 0, "!unauthorized");
    }

    modifier onlyStakingPools() {
        require(stakingPools[msg.sender],"!stakingPools");
        _;
    }

    function setStakingPoolMultipliers(address _stakingPool, uint256 _multiplier) public onlyGovernance returns(bool) {
        stakingPoolMultipliers[_stakingPool] = _multiplier;
        return true;
    }

    function setStakingPoolOPTYAllocation(uint256 _stakingPoolOPTYAllocation) public onlyGovernance returns(bool) {
        stakingPoolOPTYAllocation = _stakingPoolOPTYAllocation;
    }

    function updateOptyRates() public onlyStakingPools returns(bool) {
        uint256 _stakingPoolNoLockingTermStakedOPTY = stakingPoolToStakedOPTY[stakingPoolNoLockingTerm];
        uint256 _stakingPool30DLockingTermStakedOPTY = stakingPoolToStakedOPTY[stakingPool30DLockingTerm];
        uint256 _stakingPool60DLockingTermStakedOPTY = stakingPoolToStakedOPTY[stakingPool60DLockingTerm];
        uint256 _stakingPool180DLockingTermStakedOPTY = stakingPoolToStakedOPTY[stakingPool180DLockingTerm];
        
        uint256 _weightedNoLockingTermStakedOPTY = stakingPoolMultipliers[stakingPoolNoLockingTerm].mul(_stakingPoolNoLockingTermStakedOPTY);
        uint256 _weighted30DLockingTermStakedOPTY = stakingPoolMultipliers[stakingPool30DLockingTerm].mul(_stakingPool30DLockingTermStakedOPTY);
        uint256 _weighted60DLockingTermStakedOPTY = stakingPoolMultipliers[stakingPool60DLockingTerm].mul(_stakingPool60DLockingTermStakedOPTY);
        uint256 _weighted180DLockingTermStakedOPTY = stakingPoolMultipliers[stakingPool180DLockingTerm].mul(_stakingPool180DLockingTermStakedOPTY);
        
        uint256 _totalWeightedStakedOPTY =  _weightedNoLockingTermStakedOPTY.add(_weighted30DLockingTermStakedOPTY).add(_weighted60DLockingTermStakedOPTY).add(_weighted180DLockingTermStakedOPTY);
        uint256 _rateNoLock = stakingPoolOPTYAllocation.mul(_weightedNoLockingTermStakedOPTY).div(_totalWeightedStakedOPTY);
        uint256 _rate30DLock = stakingPoolOPTYAllocation.mul(_weighted30DLockingTermStakedOPTY).div(_totalWeightedStakedOPTY);
        uint256 _rate60DLock = stakingPoolOPTYAllocation.mul(_weighted60DLockingTermStakedOPTY).div(_totalWeightedStakedOPTY);
        uint256 _rate180DLock = stakingPoolOPTYAllocation.mul(_weighted180DLockingTermStakedOPTY).div(_totalWeightedStakedOPTY);
        require(IOPTYStakingPool(stakingPoolNoLockingTerm).setOptyRatePerBlock(_rateNoLock));
        require(IOPTYStakingPool(stakingPool30DLockingTerm).setOptyRatePerBlock(_rate30DLock));
        require(IOPTYStakingPool(stakingPool60DLockingTerm).setOptyRatePerBlock(_rate60DLock));
        require(IOPTYStakingPool(stakingPool180DLockingTerm).setOptyRatePerBlock(_rate180DLock));
        return true;
    }

    function updateStakedOPTY(address _staker, uint256 _amount) public onlyStakingPools returns(bool) {
        stakingPoolToUserStakedOPTY[msg.sender][_staker] = stakingPoolToUserStakedOPTY[msg.sender][_staker].add(_amount);
        stakingPoolToStakedOPTY[msg.sender] = stakingPoolToStakedOPTY[msg.sender].add(_amount);
        return true;
    }

    function updateUnstakedOPTY(address _staker, uint256 _shares) public onlyStakingPools returns(bool) {
        uint256 _stakerStakedAmount = stakingPoolToUserStakedOPTY[msg.sender][_staker];
        uint256 _amount = _shares.mul(_stakerStakedAmount).div(stakingPoolToStakedOPTY[msg.sender]);
        if (_shares == IERC20(msg.sender).balanceOf(_staker)) {
            stakingPoolToUserStakedOPTY[msg.sender][_staker] = uint256(0);
        } else {
            stakingPoolToUserStakedOPTY[msg.sender][_staker] = stakingPoolToUserStakedOPTY[msg.sender][_staker].sub(_amount);
        }
        stakingPoolToStakedOPTY[msg.sender] = stakingPoolToStakedOPTY[msg.sender].sub(_amount);
    }
}
