// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { IOPTYStakingVault } from "../../interfaces/opty/IOPTYStakingVault.sol";
import { SafeERC20, IERC20, SafeMath } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { OPTYStakingRateBalancerStorage } from "./OPTYStakingRateBalancerStorage.sol";
import { OPTYStakingRateBalancerProxy } from "./OPTYStakingRateBalancerProxy.sol";
import { OPTYStakingRateBalancerProxy } from "./OPTYStakingRateBalancerProxy.sol";
import { Modifiers } from "../configuration/Modifiers.sol";
import { IOPTYStakingRateBalancer } from "../../interfaces/opty/IOPTYStakingRateBalancer.sol";

contract OPTYStakingRateBalancer is IOPTYStakingRateBalancer, OPTYStakingRateBalancerStorage, Modifiers {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /* solhint-disable no-empty-blocks */

    /**
     * @dev initialize the different stakingVaults
     *
     */
    function initialize(
        address _stakingVault1DLockingTerm,
        address _stakingVault30DLockingTerm,
        address _stakingVault60DLockingTerm,
        address _stakingVault180DLockingTerm
    ) public onlyGovernance {
        stakingVault1DLockingTerm = _stakingVault1DLockingTerm;
        stakingVault30DLockingTerm = _stakingVault30DLockingTerm;
        stakingVault60DLockingTerm = _stakingVault60DLockingTerm;
        stakingVault180DLockingTerm = _stakingVault180DLockingTerm;
        stakingVaults[stakingVault1DLockingTerm] = true;
        stakingVaults[stakingVault30DLockingTerm] = true;
        stakingVaults[stakingVault60DLockingTerm] = true;
        stakingVaults[stakingVault180DLockingTerm] = true;
    }

    /**
     * @dev Set OPTYStakingRateBalancerProxy to act as OPTYStakingRateBalancer
     *
     */
    function become(OPTYStakingRateBalancerProxy _optyStakingRateBalancerProxy) public onlyGovernance {
        require(_optyStakingRateBalancerProxy.acceptImplementation() == 0, "!unauthorized");
    }

    modifier onlyStakingVaults() {
        require(stakingVaults[msg.sender], "!stakingVaults");
        _;
    }

    function setStakingVaultMultipliers(address _stakingVault, uint256 _multiplier)
        public
        override
        onlyGovernance
        returns (bool)
    {
        stakingVaultMultipliers[_stakingVault] = _multiplier;
        return true;
    }

    function setStakingVaultOPTYAllocation(uint256 _stakingVaultOPTYAllocation)
        public
        override
        onlyGovernance
        returns (bool)
    {
        stakingVaultOPTYAllocation = _stakingVaultOPTYAllocation;
    }

    function updateOptyRates() public override onlyStakingVaults returns (bool) {
        uint256 _stakingVault1DLockingTermStakedOPTY = stakingVaultToStakedOPTY[stakingVault1DLockingTerm];
        uint256 _stakingVault30DLockingTermStakedOPTY = stakingVaultToStakedOPTY[stakingVault30DLockingTerm];
        uint256 _stakingVault60DLockingTermStakedOPTY = stakingVaultToStakedOPTY[stakingVault60DLockingTerm];
        uint256 _stakingVault180DLockingTermStakedOPTY = stakingVaultToStakedOPTY[stakingVault180DLockingTerm];

        uint256 _weighted1DLockingTermStakedOPTY =
            stakingVaultMultipliers[stakingVault1DLockingTerm].mul(_stakingVault1DLockingTermStakedOPTY);
        uint256 _weighted30DLockingTermStakedOPTY =
            stakingVaultMultipliers[stakingVault30DLockingTerm].mul(_stakingVault30DLockingTermStakedOPTY);
        uint256 _weighted60DLockingTermStakedOPTY =
            stakingVaultMultipliers[stakingVault60DLockingTerm].mul(_stakingVault60DLockingTermStakedOPTY);
        uint256 _weighted180DLockingTermStakedOPTY =
            stakingVaultMultipliers[stakingVault180DLockingTerm].mul(_stakingVault180DLockingTermStakedOPTY);

        uint256 _totalWeightedStakedOPTY =
            _weighted1DLockingTermStakedOPTY
                .add(_weighted30DLockingTermStakedOPTY)
                .add(_weighted60DLockingTermStakedOPTY)
                .add(_weighted180DLockingTermStakedOPTY);
        uint256 _rate1DLock;
        uint256 _rate30DLock;
        uint256 _rate60DLock;
        uint256 _rate180DLock;
        if (_totalWeightedStakedOPTY == uint256(0)) {
            _rate1DLock = uint256(0);
            _rate30DLock = uint256(0);
            _rate60DLock = uint256(0);
            _rate180DLock = uint256(0);
        } else {
            _rate1DLock = stakingVaultOPTYAllocation.mul(_weighted1DLockingTermStakedOPTY).div(
                _totalWeightedStakedOPTY
            );
            _rate30DLock = stakingVaultOPTYAllocation.mul(_weighted30DLockingTermStakedOPTY).div(
                _totalWeightedStakedOPTY
            );
            _rate60DLock = stakingVaultOPTYAllocation.mul(_weighted60DLockingTermStakedOPTY).div(
                _totalWeightedStakedOPTY
            );
            _rate180DLock = stakingVaultOPTYAllocation.mul(_weighted180DLockingTermStakedOPTY).div(
                _totalWeightedStakedOPTY
            );
        }

        require(
            IOPTYStakingVault(stakingVault1DLockingTerm).setOptyRatePerSecond(_rate1DLock),
            "updateOptyRates:1Dlockingterm"
        );
        require(
            IOPTYStakingVault(stakingVault30DLockingTerm).setOptyRatePerSecond(_rate30DLock),
            "updateOptyRates:30Dlockingterm"
        );
        require(
            IOPTYStakingVault(stakingVault60DLockingTerm).setOptyRatePerSecond(_rate60DLock),
            "updateOptyRates:160Dlockingterm"
        );
        require(
            IOPTYStakingVault(stakingVault180DLockingTerm).setOptyRatePerSecond(_rate180DLock),
            "updateOptyRates:180Dlockingterm"
        );
        return true;
    }

    function updateStakedOPTY(address _staker, uint256 _amount) public override onlyStakingVaults returns (bool) {
        stakingVaultToUserStakedOPTY[msg.sender][_staker] = stakingVaultToUserStakedOPTY[msg.sender][_staker].add(
            _amount
        );
        stakingVaultToStakedOPTY[msg.sender] = stakingVaultToStakedOPTY[msg.sender].add(_amount);
        return true;
    }

    function updateUnstakedOPTY(address _staker, uint256 _shares) public override onlyStakingVaults returns (bool) {
        uint256 _stakerStakedAmount = stakingVaultToUserStakedOPTY[msg.sender][_staker];
        uint256 _amount = _shares.mul(_stakerStakedAmount).div(stakingVaultToStakedOPTY[msg.sender]);
        if (_shares == IERC20(msg.sender).balanceOf(_staker)) {
            stakingVaultToUserStakedOPTY[msg.sender][_staker] = uint256(0);
        } else {
            stakingVaultToUserStakedOPTY[msg.sender][_staker] = stakingVaultToUserStakedOPTY[msg.sender][_staker].sub(
                _amount
            );
        }
        stakingVaultToStakedOPTY[msg.sender] = stakingVaultToStakedOPTY[msg.sender].sub(_amount);
        return true;
    }
}
