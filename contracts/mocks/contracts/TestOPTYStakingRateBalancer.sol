// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// helper contracts
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { OPTYStakingRateBalancerStorage } from "../../protocol/tokenization/OPTYStakingRateBalancerStorage.sol";
import { OPTYStakingRateBalancerProxy } from "../../protocol/tokenization/OPTYStakingRateBalancerProxy.sol";
import { Modifiers } from "../../protocol/earn-protocol-configuration/contracts/Modifiers.sol";

// libraries
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

// interfaces
import { IOPTYStakingVault } from "../../interfaces/opty/IOPTYStakingVault.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IOPTYStakingRateBalancer } from "../../interfaces/opty/IOPTYStakingRateBalancer.sol";

/**
 * @title OPTY staking rate balancer
 * @author opty.fi
 * @dev Implementation of the $OPTY staking rate balancer
 */

contract TestOPTYStakingRateBalancer is IOPTYStakingRateBalancer, OPTYStakingRateBalancerStorage, Modifiers {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    receive() external payable {}

    modifier onlyStakingVaults() {
        require(stakingVaults[msg.sender], "!stakingVaults");
        _;
    }

    /* solhint-disable no-empty-blocks */

    /**
     * @dev Initialize the different stakingVaults
     * @param _stakingVault1DLockingTerm  staking vault address for 1 day locking period
     * @param _stakingVault30DLockingTerm staking vault address for 30 days locking period
     * @param _stakingVault60DLockingTerm staking vault address for 60 days locking period
     * @param _stakingVault180DLockingTerm staking vault address for 180 days locking period
     */
    function initialize(
        address _stakingVault1DLockingTerm,
        address _stakingVault30DLockingTerm,
        address _stakingVault60DLockingTerm,
        address _stakingVault180DLockingTerm
    ) external onlyGovernance {
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
    function become(OPTYStakingRateBalancerProxy _optyStakingRateBalancerProxy) external onlyGovernance {
        require(_optyStakingRateBalancerProxy.acceptImplementation() == 0, "!unauthorized");
    }

    /**
     * @inheritdoc IOPTYStakingRateBalancer
     */
    function setStakingVaultMultipliers(address _stakingVault, uint256 _multiplier)
        external
        override
        onlyFinanceOperator
        returns (bool)
    {
        stakingVaultMultipliers[_stakingVault] = _multiplier;
        return true;
    }

    /**
     * @inheritdoc IOPTYStakingRateBalancer
     */
    function setStakingVaultOPTYAllocation(uint256 _stakingVaultOPTYAllocation)
        external
        override
        onlyFinanceOperator
        returns (bool)
    {
        stakingVaultOPTYAllocation = _stakingVaultOPTYAllocation;
        return true;
    }

    /**
     * @inheritdoc IOPTYStakingRateBalancer
     */
    function updateOptyRates() external override onlyStakingVaults returns (bool) {
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

    /**
     * @inheritdoc IOPTYStakingRateBalancer
     */
    function updateStakedOPTY(address _staker, uint256 _amount) external override onlyStakingVaults returns (bool) {
        stakingVaultToUserStakedOPTY[msg.sender][_staker] = stakingVaultToUserStakedOPTY[msg.sender][_staker].add(
            _amount
        );
        stakingVaultToStakedOPTY[msg.sender] = stakingVaultToStakedOPTY[msg.sender].add(_amount);
        return true;
    }

    /**
     * @inheritdoc IOPTYStakingRateBalancer
     */
    function updateUnstakedOPTY(address _staker, uint256 _shares) external override onlyStakingVaults returns (bool) {
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
