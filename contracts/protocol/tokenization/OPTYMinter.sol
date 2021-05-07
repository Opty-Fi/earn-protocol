// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ExponentialNoError } from "../../dependencies/compound/ExponentialNoError.sol";
import { Modifiers } from "../configuration/Modifiers.sol";
import { OPTY } from "./OPTY.sol";
import { OPTYMinterStorage } from "./OPTYMinterStorage.sol";
import { OPTYStakingPool } from "./OPTYStakingPool.sol";

/**
 * @dev Contract distributing $OPTY to opty-fi earn protocol's users
 */

contract OPTYMinter is OPTYMinterStorage, ExponentialNoError, Modifiers {
    constructor(address _registry, address _opty) public Modifiers(_registry) {
        _setOptyAddress(_opty);
    }

    /**
     * @dev Modifier to check caller is staking pool or not
     */
    modifier onlyStakingPool() {
        require(stakingPools[msg.sender] == true, "caller is not a staking pool");
        _;
    }

    /**
     * @dev Maps staking pool to a boolean variable that indicates wether the staking pool is enabled`or not
     *
     */
    function setStakingPool(address _stakingPool, bool _enable) public onlyOperator returns (bool) {
        require(_stakingPool != address(0), "Invalid address");
        stakingPools[_stakingPool] = _enable;
        return true;
    }

    function _setOptyAddress(address _opty) internal {
        require(_opty != address(0), "Invalid address");
        optyAddress = _opty;
    }

    function claimAndStake(address _stakingPool) public {
        uint256 _amount = claimOpty(msg.sender);
        OPTYStakingPool _optyStakingPool = OPTYStakingPool(_stakingPool);
        _optyStakingPool.userStake(_amount);
    }

    /**
     * @notice Claim all the OPTY accrued by holder in all markets
     * @param _holder The address to claim OPTY for
     */
    function claimOpty(address _holder) public returns (uint256) {
        claimOpty(_holder, allOptyVaults);
    }

    /**
     * @notice Claim all the OPTY accrued by holder in the specified markets
     * @param _holder The address to claim OPTY for
     * @param _optyVaults The list of vaults to claim OPTY in
     */
    function claimOpty(address _holder, address[] memory _optyVaults) public returns (uint256) {
        address[] memory holders = new address[](1);
        holders[0] = _holder;
        claimOpty(holders, _optyVaults);
    }

    /**
     * @notice Claim all opty accrued by the holders
     * @param _holders The addresses to claim OPTY for
     * @param _optyVaults The list of vaults to claim OPTY in
     */
    function claimOpty(address[] memory _holders, address[] memory _optyVaults) public returns (uint256) {
        uint256 _total;
        for (uint256 i = 0; i < _optyVaults.length; i++) {
            address _optyVault = _optyVaults[i];
            require(optyVaultEnabled[_optyVault], "optyVault must be enabled");
            for (uint256 j = 0; j < _holders.length; j++) {
                updateUserRewards(address(_optyVault), _holders[j]);
                uint256 _amount = div_(optyAccrued[_holders[j]], 1e18);
                optyAccrued[_holders[j]] = uint256(0);
                _mintOpty(_holders[j], _amount);
                _total = add_(_total, _amount);
            }
        }
    }

    /**
     * @notice Claim all the opty accrued by holder in all markets
     * @param _holder The address to claim OPTY for
     */
    function claimableOpty(address _holder) public view returns (uint256) {
        return claimableOpty(_holder, allOptyVaults);
    }

    /**
     * @notice Claim all the opty accrued by holder in the specified markets
     * @param _holder The address to claim OPTY for
     * @param _optyVaults The list of vaults to claim OPTY in
     */
    function claimableOpty(address _holder, address[] memory _optyVaults) public view returns (uint256) {
        uint256 claimableOptyAmount;
        for (uint256 i = 0; i < _optyVaults.length; i++) {
            address _optyVault = _optyVaults[i];
            if (optyVaultEnabled[_optyVault] == true) {
                uint256 _deltaSecondsUser;
                if (
                    lastUserUpdate[_optyVault][_holder] != uint256(0) &&
                    lastUserUpdate[_optyVault][_holder] > optyVaultStartTimestamp[_optyVault]
                ) {
                    _deltaSecondsUser = sub_(lastUserUpdate[_optyVault][_holder], optyVaultStartTimestamp[_optyVault]);
                } else {
                    _deltaSecondsUser = sub_(
                        optyUserStateInVault[_optyVault][_holder].timestamp,
                        optyVaultStartTimestamp[_optyVault]
                    );
                }
                uint256 _currentOptyVaultIndex = currentOptyVaultIndex(_optyVault);
                uint256 _userDelta =
                    mul_(
                        IERC20(_optyVault).balanceOf(_holder),
                        sub_(
                            mul_(
                                _currentOptyVaultIndex,
                                sub_(getBlockTimestamp(), optyVaultStartTimestamp[_optyVault])
                            ),
                            mul_(optyUserStateInVault[_optyVault][_holder].index, _deltaSecondsUser)
                        )
                    );
                claimableOptyAmount = add_(claimableOptyAmount, _userDelta);
            }
        }
        return div_(add_(claimableOptyAmount, optyAccrued[_holder]), 1e18);
    }

    function currentOptyVaultIndex(address _optyVault) public view returns (uint256) {
        uint256 _deltaSecondsSinceStart = sub_(getBlockTimestamp(), optyVaultStartTimestamp[_optyVault]);
        uint256 _deltaSeconds = sub_(getBlockTimestamp(), uint256(optyVaultState[_optyVault].timestamp));
        uint256 _supplyTokens = IERC20(_optyVault).totalSupply();
        uint256 _optyAccrued = mul_(_deltaSeconds, optyVaultRatePerSecond[_optyVault]);
        uint256 _ratio = _supplyTokens > 0 ? div_(mul_(_optyAccrued, 1e18), _supplyTokens) : uint256(0);
        uint256 _index =
            div_(
                add_(
                    mul_(
                        optyVaultState[_optyVault].index,
                        sub_(uint256(optyVaultState[_optyVault].timestamp), optyVaultStartTimestamp[_optyVault])
                    ),
                    _ratio
                ),
                _deltaSecondsSinceStart
            );
        return _index;
    }

    /**
     * @notice Calculate additional accrued OPTY for a contributor since last accrual
     * @param _user The address to calculate contributor rewards for
     */
    function updateUserRewards(address _optyVault, address _user) public {
        if (IERC20(_optyVault).balanceOf(_user) > 0 && lastUserUpdate[_optyVault][_user] != getBlockTimestamp()) {
            uint256 _deltaSecondsVault = sub_(getBlockTimestamp(), optyVaultStartTimestamp[_optyVault]);
            uint256 _deltaSecondsUser;
            if (
                lastUserUpdate[_optyVault][_user] != uint256(0) &&
                lastUserUpdate[_optyVault][_user] > optyVaultStartTimestamp[_optyVault]
            ) {
                _deltaSecondsUser = sub_(lastUserUpdate[_optyVault][_user], optyVaultStartTimestamp[_optyVault]);
            } else {
                _deltaSecondsUser = sub_(
                    optyUserStateInVault[_optyVault][_user].timestamp,
                    optyVaultStartTimestamp[_optyVault]
                );
            }
            uint256 _userTokens = IERC20(_optyVault).balanceOf(_user);
            uint256 _currentOptyVaultIndex = currentOptyVaultIndex(_optyVault);
            uint256 _userDelta =
                mul_(
                    _userTokens,
                    sub_(
                        mul_(_currentOptyVaultIndex, _deltaSecondsVault),
                        mul_(optyUserStateInVault[_optyVault][_user].index, _deltaSecondsUser)
                    )
                );
            uint256 _userAccrued = add_(optyAccrued[_user], _userDelta);
            optyAccrued[_user] = _userAccrued;
        }
        lastUserUpdate[_optyVault][_user] = getBlockTimestamp();
    }

    function updateUserStateInVault(address _optyVault, address _user) public {
        optyUserStateInVault[_optyVault][_user].index = optyVaultState[_optyVault].index;
        optyUserStateInVault[_optyVault][_user].timestamp = optyVaultState[_optyVault].timestamp;
    }

    /**
     * @notice Set the OPTY rate for a specific pool
     * @return The amount of OPTY which was NOT transferred to the user
     */
    function updateOptyVaultRatePerSecondAndVaultToken(address _optyVault) public returns (bool) {
        optyVaultRatePerSecondAndVaultToken[_optyVault] = IERC20(_optyVault).totalSupply() > 0
            ? div_(mul_(optyVaultRatePerSecond[_optyVault], 1e18), IERC20(_optyVault).totalSupply())
            : uint256(0);
        return true;
    }

    /**
     * @notice Accrue OPTY to the market by updating the supply index
     * @param _optyVault The market whose index to update
     */
    function updateOptyVaultIndex(address _optyVault) public returns (uint224) {
        if (optyVaultState[_optyVault].index == uint224(0)) {
            optyVaultStartTimestamp[_optyVault] = getBlockTimestamp();
            optyVaultState[_optyVault].timestamp = uint32(optyVaultStartTimestamp[_optyVault]);
            optyVaultState[_optyVault].index = uint224(optyVaultRatePerSecondAndVaultToken[_optyVault]);
            return optyVaultState[_optyVault].index;
        } else {
            uint256 _deltaSeconds = sub_(getBlockTimestamp(), uint256(optyVaultState[_optyVault].timestamp));
            if (_deltaSeconds > 0) {
                uint256 _deltaSecondsSinceStart = sub_(getBlockTimestamp(), optyVaultStartTimestamp[_optyVault]);
                uint256 _supplyTokens = IERC20(_optyVault).totalSupply();
                uint256 _optyAccrued = mul_(_deltaSeconds, optyVaultRatePerSecond[_optyVault]);
                uint256 _ratio = _supplyTokens > 0 ? div_(mul_(_optyAccrued, 1e18), _supplyTokens) : uint256(0);
                uint256 _index =
                    div_(
                        add_(
                            mul_(
                                optyVaultState[_optyVault].index,
                                sub_(uint256(optyVaultState[_optyVault].timestamp), optyVaultStartTimestamp[_optyVault])
                            ),
                            _ratio
                        ),
                        _deltaSecondsSinceStart
                    );
                optyVaultState[_optyVault] = OptyState({
                    index: safe224(_index, "new index exceeds 224 bits"),
                    timestamp: safe32(getBlockTimestamp(), "block number exceeds 32 bits")
                });
            }
            return optyVaultState[_optyVault].index;
        }
    }

    function mintOpty(address _user, uint256 _amount) external onlyStakingPool returns (uint256) {
        _mintOpty(_user, _amount);
    }

    /**
     * @notice Transfer OPTY to the user
     * @dev Note: If there is not enough OPTY, we do not perform the transfer all.
     * @param _user The address of the user to transfer OPTY to
     * @param _amount The amount of OPTY to (possibly) transfer
     * @return The amount of OPTY which was NOT transferred to the user
     */
    function _mintOpty(address _user, uint256 _amount) internal returns (uint256) {
        OPTY _opty = OPTY(getOptyAddress());
        require(_amount > 0 && _user != address(0), "Insufficient amount or invalid address");
        _opty.mint(_user, _amount);
        return _amount;
    }

    /**
     * @notice Set the OPTY rate for a specific pool
     * @return The amount of OPTY which was NOT transferred to the user
     */
    function setOptyVaultRate(address _optyVault, uint256 _rate) public onlyOperator returns (bool) {
        optyVaultRatePerSecond[_optyVault] = _rate;
        return true;
    }

    function addOptyVault(address _optyVault) public onlyOperator returns (bool) {
        for (uint256 i = 0; i < allOptyVaults.length; i++) {
            require(allOptyVaults[i] != _optyVault, "optyVault already added");
        }
        allOptyVaults.push(_optyVault);
    }

    function setOptyVault(address _optyVault, bool _enable) public onlyOperator returns (bool) {
        optyVaultEnabled[_optyVault] = _enable;
        return true;
    }

    function getOptyAddress() public view returns (address) {
        return optyAddress;
    }

    function getBlockTimestamp() public view returns (uint256) {
        return block.timestamp;
    }
}
